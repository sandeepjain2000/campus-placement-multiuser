# QA folder layout

Manual testing, guided runners, and Playwright automation live under `qa/`.

**Documentation:** [`docs/`](docs/) — guided runner quick start, manual test playbook.  
**Data files:** [`data/`](data/) — CSV, `.txt`, voice output, logs, pip requirements.

## Structure

```
qa/
├── README.md                 ← this file
├── docs/                     ← QA markdown
├── data/                     ← CSV, txt, voice, logs, requirements
├── routes-by-role.js         ← route list for blank-screen Playwright tests
├── tests/                    ← Playwright specs (npm run test:smoke)
├── runners/                  ← executable runner scripts only
│   ├── guided/               ← run-guided.mjs, voice helpers
│   └── batch/                ← Windows .bat / .ps1 launchers
├── guided/                   ← JSON config & playbooks
```

## Quick commands

| Command | Purpose |
|---------|---------|
| `npm run test:guided:help` | Runner help |
| `npm run test:guided:playbook-list` | List playbooks |
| `npm run test:guided:playbook-e2e` | Internship full cycle |
| `npm run qa:guided:db-log` | SQLite step log |
| `npm run test:smoke` | Playwright blank-screen + auth |

Voice setup: `pip install -r qa/data/requirements/requirements-voice.txt`

Full doc: [`docs/guided-runner-quickstart.md`](docs/guided-runner-quickstart.md)

Windows launchers live only under [`runners/batch/`](runners/batch/) (no `.bat` files at repo root). Optional parent-folder shortcut: `CampusPlacement/run-guided.bat` → `qa/runners/batch/run-guided.bat`.
