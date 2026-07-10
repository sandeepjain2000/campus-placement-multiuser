# QA2 — expanded test matrix + cloud/local agent runner

## Test cases (2× the XLSX row count)

1. Keep your suites as `C-*.xlsx` in this folder.
2. Generate JSON:

   ```bash
   python qa2/generate_test_cases_json.py
   ```

## Target app (default: Vercel)

By default the agent tests **[PlacementHub on Vercel](https://campus-placement-omega.vercel.app/)** — you do **not** need `npm run dev` or a local backend.

| Override | How |
|----------|-----|
| Env | `QA_BASE_URL=https://campus-placement-omega.vercel.app` |
| Flag | `--base-url https://campus-placement-omega.vercel.app` |
| Local dev | `--base-url http://127.0.0.1:3000` (app must be running) |

`--local` only means **local Chromium** (not cloud browser-use). It still hits whatever `--base-url` is set to (Vercel by default).

## NVIDIA keys (rotation)

All `*.json` files in the keys folder are loaded (sorted by name) and rotated: test case *i* starts with key *i mod n*, wrapping after the last key. On rate-limit/auth errors, the script tries the rest of the ring.

**Default folder:** `…/Claudes/code-review-tool/nvidia_keys` (see `DEFAULT_NVIDIA_KEYS_DIR` in `run_agent_cloud.py`). Override with `NVIDIA_KEYS_DIR` or `--nvidia-keys-dir`.

Single-key mode: `NVIDIA_API_KEY`, or `NVIDIA_KEY_FILE` / `--nvidia-key-file`.

The **Next.js app** uses the same NVIDIA env vars for chat features (CV skill suggest, help, screen smart-match): all keys in `NVIDIA_KEYS_DIR` are tried in order; on failure the next key is used, then `OPENAI_API_KEY` as final fallback. Optional: `NVIDIA_API_BASE_URL`, `NVIDIA_CHAT_MODEL` (default `meta/llama-3.1-8b-instruct`). Help **embeddings** still require `OPENAI_API_KEY`.

## Execution logs & data

| Output | Location |
|--------|----------|
| **Log** | `qa2/logs/run_agent_<UTC-timestamp>.log` |
| **Results** | `qa2/agent_results_<timestamp>.json` |
| **Report markdown** | `qa2/reports/` (exported test result tables) |
| **Retry ID list** | `qa2/data/retry_case_ids.txt` |
| **Python deps** | `qa2/requirements/requirements.txt`, `requirements-playwright.txt` |

## Run

```bash
pip install -r qa2/requirements/requirements.txt

# Vercel + local browser (typical)
python qa2/run_agent_cloud.py --local --limit 1

# Vercel + browser-use cloud (needs BROWSER_USE_API_KEY)
python qa2/run_agent_cloud.py --limit 1

# Local app instead
python qa2/run_agent_cloud.py --base-url http://127.0.0.1:3000 --local --limit 1
```

Never commit API keys.
