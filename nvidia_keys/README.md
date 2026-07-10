# NVIDIA API keys (local only)

Copy your `key*.json` files here (from `Claudes/nvidia_keys/`). These JSON files are **gitignored** — never commit real keys.

## Convert to Vercel `.env` files

From the repo root:

```bash
node scripts/nvidia-json-to-vercel-env.mjs
```

Or specific files:

```bash
node scripts/nvidia-json-to-vercel-env.mjs nvidia_keys/key26.json nvidia_keys/key27.json nvidia_keys/key28.json
```

Output goes to **`vercel-import/`** (also gitignored):

| File | Vercel variable |
|------|-----------------|
| First JSON | `NVIDIA_API_KEY` |
| Second JSON | `NVIDIA_API_KEY_2` |
| Third JSON | `NVIDIA_API_KEY_3` |
| `nvidia-combined.env` | All keys in one file (single Import) |

On Vercel: **Settings → Environment Variables → Import .env** and choose `vercel-import/nvidia-combined.env` (easiest) or import each `key26.env` etc. one at a time.
