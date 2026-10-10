# QA data files

Non-code artifacts for testing: CSV catalogs, logs, voice output, prompts, and pip requirement lists.

| Subfolder | Contents |
|-----------|----------|
| [`catalogs/`](catalogs/) | CSV inventories & manual session logs |
| [`results/`](results/) | Saved Playwright result JSON |
| [`reports/`](reports/) | Exported audit HTML (UI/UX, accessibility) |
| [`../../qa2/reports/`](../../qa2/reports/) | qa2 test result `.md` / `.csv` write-ups |
| [`voice/transcripts/`](voice/transcripts/) | Guided runner TTS transcript `.txt` files |
| [`voice/audio/`](voice/audio/) | Generated MP3s (gitignored) |
| [`text/`](text/) | Prompt templates (e.g. test-case generation) |
| [`logs/`](logs/) | Lint / tooling output captures |
| [`state/`](state/) | Local runner state (e.g. legacy marker file) |
| [`requirements/`](requirements/) | `pip install -r qa/data/requirements/requirements-voice.txt` |

Voice paths are configured in `qa/guided/config/guided-voice-config.json`.
