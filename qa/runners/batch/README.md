# Windows launchers (`.bat` / `.ps1`)

Double-click or run from any directory — each script `cd`s to the **campus-placement** repo root first.

| Script | npm equivalent |
|--------|----------------|
| `run-guided.bat` / `run-guided.ps1` | `npm run test:guided -- --playbook …` |
| `run_use_case_auto_voice.bat <slug>` | `npm run test:guided:voice -- <slug>` |
| `run_internship_e2e_auto_voice.bat` | `npm run test:guided:playbook-e2e-auto-voice` |
| `run_internship_publish_auto_voice.bat` | `npm run test:guided:playbook-auto` |
| `run_internship_apply_auto_voice.bat` | `npm run test:guided:playbook-apply-auto` |
| `run_internship_care_auto_voice.bat` | `npm run test:guided:voice-internship-care` |

Voice deps (once): `pip install -r qa/data/requirements/requirements-voice.txt`

**Feature verification (recent fixes):**

| npm script | What it checks |
|------------|----------------|
| `npm run qa:verify:features` | Guided-runner 403 polling, campus jobs hidden, unified CV apply modal, profile photo |
| `npm run qa:verify:recent-fixes` | Offer template edit, internship backlogs default |
| `npm run test:guided:upload-qa2-cvs` | Upload PDFs from `qa2/CVs/` |
| `npm run test:guided:upload-profile-photos` | Upload from `qa2/profilepics/` |

From repo root: `qa\runners\batch\<script>.bat` · Parent folder: `CampusPlacement\run-guided.bat` forwards to `run-guided` here.
