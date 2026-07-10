"""Edge TTS narration + transcript export for guided playbook screen recordings."""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
import time
from datetime import datetime
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _SCRIPT_DIR.parent.parent.parent
_CONFIG_PATH = _REPO_ROOT / "qa" / "guided" / "config" / "guided-voice-config.json"


def load_config() -> dict:
    if _CONFIG_PATH.is_file():
        return json.loads(_CONFIG_PATH.read_text(encoding="utf-8"))
    return {}


def _voice_cfg(config: dict) -> dict:
    return config.get("voice") or {}


def _resolve_dir(voice: dict, key: str, default: str) -> Path:
    rel = voice.get(key, default)
    p = Path(rel)
    if not p.is_absolute():
        p = _REPO_ROOT / p
    p.mkdir(parents=True, exist_ok=True)
    return p


def _transcript_path(voice: dict, stage_key: str) -> Path:
    base = _resolve_dir(voice, "transcript_dir", "qa/data/voice/transcripts")
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return base / f"{stamp}_{stage_key}.txt"


def _audio_path(voice: dict, stage_key: str) -> Path:
    base = _resolve_dir(voice, "audio_dir", "qa/data/voice/audio")
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return base / f"{stamp}_{stage_key}.mp3"


def _append_manifest(voice: dict, entry: dict) -> None:
    rel = voice.get("manifest_file", "qa/data/voice/voice_manifest.jsonl")
    manifest = Path(rel) if Path(rel).is_absolute() else _REPO_ROOT / rel
    manifest.parent.mkdir(parents=True, exist_ok=True)
    with manifest.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, ensure_ascii=False) + "\n")


def _write_transcript(path: Path, *, role: str, stage_key: str, text: str) -> None:
    header = (
        f"# Guided playbook narration\n"
        f"# Role: {role}\n"
        f"# Stage: {stage_key}\n"
        f"# Use with ElevenLabs, Murf, Play.ht, or similar.\n\n"
    )
    path.write_text(header + text.strip() + "\n", encoding="utf-8")


async def _synthesize_edge_tts(text: str, output_mp3: Path, voice_id: str, rate: str, volume: str) -> bool:
    try:
        import edge_tts
    except ImportError:
        print("edge-tts not installed — transcript only. pip install -r qa/data/requirements/requirements-voice.txt", file=sys.stderr)
        return False

    communicate = edge_tts.Communicate(text, voice=voice_id, rate=rate, volume=volume)
    await communicate.save(str(output_mp3))
    return output_mp3.is_file()


def _synthesize_openai_tts(text: str, output_mp3: Path, voice_cfg: dict) -> bool:
    """OpenAI TTS — set OPENAI_API_KEY and engine openai in guided-voice-config.json."""
    import os
    import urllib.error
    import urllib.request

    api_key = os.environ.get(str(voice_cfg.get("api_key_env", "OPENAI_API_KEY")), "").strip()
    if not api_key:
        print("OPENAI_API_KEY not set — transcript only.", file=sys.stderr)
        return False

    model = str(voice_cfg.get("openai_model", "gpt-4o-mini-tts"))
    voice = str(voice_cfg.get("voice_id", "nova"))
    payload = json.dumps({"model": model, "input": text, "voice": voice, "response_format": "mp3"}).encode("utf-8")
    req = urllib.request.Request(
        "https://api.openai.com/v1/audio/speech",
        data=payload,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            output_mp3.write_bytes(resp.read())
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")[:300]
        print(f"OpenAI TTS failed ({exc.code}): {body}", file=sys.stderr)
        return False
    except Exception as exc:
        print(f"OpenAI TTS failed: {exc}", file=sys.stderr)
        return False
    return output_mp3.is_file()


def _synthesize_audio(text: str, output_mp3: Path, voice_cfg: dict) -> bool:
    engine = str(voice_cfg.get("engine", "edge_tts")).lower()
    if engine == "edge_tts":
        return asyncio.run(
            _synthesize_edge_tts(
                text,
                output_mp3,
                str(voice_cfg.get("voice_id", "en-IN-NeerjaNeural")),
                str(voice_cfg.get("rate", "+0%")),
                str(voice_cfg.get("volume", "+0%")),
            )
        )
    if engine == "openai":
        return _synthesize_openai_tts(text, output_mp3, voice_cfg)
    if engine == "sonexlabs":
        print(
            "SonexLabs engine: sign up at sonexlabs.com, set SONEXLABS_API_KEY, "
            "and configure api_url + voice_id per their Pāṇini TTS docs (beta).",
            file=sys.stderr,
        )
        return False
    print(f"Unknown voice engine: {engine}", file=sys.stderr)
    return False


def _estimate_speech_seconds(text: str) -> float:
    words = max(1, len((text or "").split()))
    return max(2.0, words / 2.5)


def _play_audio(path: Path, *, blocking: bool = False, fallback_text: str = "") -> None:
    if not path.is_file():
        return
    if blocking:
        try:
            import shutil
            import subprocess

            if shutil.which("ffplay"):
                subprocess.run(
                    ["ffplay", "-nodisp", "-autoexit", str(path)],
                    check=False,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
                return
        except Exception:
            pass

        if sys.platform == "win32":
            try:
                import subprocess

                wait = int(_estimate_speech_seconds(fallback_text)) + 1
                ps = (
                    "Add-Type -AssemblyName presentationCore; "
                    f"$p = New-Object System.Windows.Media.MediaPlayer; "
                    f"$p.Open([uri]'{path.as_uri()}'); $p.Play(); "
                    f"Start-Sleep -Seconds {wait}; $p.Close()"
                )
                subprocess.run(
                    ["powershell", "-NoProfile", "-Command", ps],
                    check=False,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
                return
            except Exception:
                pass

        time.sleep(_estimate_speech_seconds(fallback_text))
        return

    try:
        if sys.platform == "win32":
            import os

            os.startfile(str(path))  # noqa: S606
    except Exception as exc:
        print(f"Could not play audio: {exc}", file=sys.stderr)


def announce(stage_key: str, role: str, text: str, *, auto: bool) -> int:
    cfg = load_config()
    voice = _voice_cfg(cfg)
    if not voice.get("enabled", True):
        return 0

    text = (text or "").strip()
    if not text:
        return 0

    transcript_path = _transcript_path(voice, stage_key)
    audio_path = _audio_path(voice, stage_key)

    if voice.get("always_write_transcript", True):
        _write_transcript(transcript_path, role=role, stage_key=stage_key, text=text)
        print(f"Transcript: {transcript_path.relative_to(_REPO_ROOT)}")

    audio_ok = False
    if voice.get("engine", "edge_tts") != "transcript_only":
        audio_ok = _synthesize_audio(text, audio_path, voice)

    if audio_ok:
        print(f"Audio: {audio_path.relative_to(_REPO_ROOT)}")
        if voice.get("play_audio", True):
            blocking = auto and bool((cfg.get("auto_run") or {}).get("blocking_audio", True))
            _play_audio(audio_path, blocking=blocking, fallback_text=text)
    elif auto:
        time.sleep(_estimate_speech_seconds(text))

    auto_cfg = cfg.get("auto_run") or {}
    if auto:
        try:
            sec = max(0.0, float(auto_cfg.get("pause_after_step_sec", 2)))
        except (TypeError, ValueError):
            sec = 2.0
        if sec > 0:
            time.sleep(sec)

    _append_manifest(
        voice,
        {
            "stage": stage_key,
            "role": role,
            "text": text,
            "transcript_file": str(transcript_path.relative_to(_REPO_ROOT)),
            "audio_file": str(audio_path.relative_to(_REPO_ROOT)) if audio_ok else "",
            "audio_generated": audio_ok,
            "voice_id": voice.get("voice_id", "en-IN-NeerjaNeural"),
            "engine": voice.get("engine", "edge_tts"),
            "created_at": datetime.now().isoformat(timespec="seconds"),
        },
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Guided runner voice annotation")
    parser.add_argument("--stage-key", required=True)
    parser.add_argument("--role", default="STEP")
    parser.add_argument("--text", required=True)
    parser.add_argument("--auto", action="store_true")
    args = parser.parse_args()
    return announce(args.stage_key, args.role, args.text, auto=args.auto)


if __name__ == "__main__":
    raise SystemExit(main())
