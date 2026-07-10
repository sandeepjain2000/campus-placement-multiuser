# Sample CV files (QA / agent testing only)

**Not part of the product UI.** These `.docx` files live in the repo so guided runners and agents can test multi-CV upload, labels, apply-picker, and employer download. They are **not** seeded for students, not linked from the app, and not meant for end-user demos unless you explicitly run the upload script below.

| File | Label |
|------|-------|
| `Research-CV-Example-Free-Download.docx` | Research CV |
| `Academic-CV-Example.docx` | Academic CV |
| `grad-school-cv-example-free-download.docx` | Grad school CV |
| `high-school-cv-example-template-free-download.docx` | High school CV |
| `internship-cv-example-free-download.docx` | Internship CV |

## Upload to demo student (Arjun)

With `npm run dev`, S3, and migration `099` applied:

```bat
npm run test:guided:upload-sample-cvs
```

Skips labels that are already active. Then apply from drives/internships — the **CV picker** appears when more than one CV exists.

## Download after employer review

```bat
npm run test:guided:download-cvs
```

Files save under `qa/data/downloads/cvs/` using **labels** as filenames, not the long template names above.
