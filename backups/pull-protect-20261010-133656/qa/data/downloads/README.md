# CV downloads (guided runner)

After a full-cycle playbook, CVs are saved under:

`qa/data/downloads/cvs/<timestamp>/`

Each run writes `manifest.json` (labels, student names, file paths).

## Standalone (no browser UI)

```bat
npm run dev
npm run test:guided:download-cvs
```

Options:

```bat
node qa/runners/guided/download-cvs.mjs --marker GT-20260502-120000 --limit 3
node qa/runners/guided/download-cvs.mjs --role student --limit 5
node qa/runners/guided/download-cvs.mjs --student Arjun --tabs internships
```

## End of E2E playbooks

`internships-full-cycle` and `drives-full-cycle` include final steps:

1. Log in as employer  
2. `downloadEmployerCvs` — saves up to 5 CVs for the session `GT-` marker  

Verify downloaded filenames use **CV labels**, not messy upload names like `Sanjay (1) (1).docx.docx`.
