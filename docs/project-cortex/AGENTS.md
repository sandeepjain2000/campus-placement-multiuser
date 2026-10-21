# Cortex rules — Placement Hub

- Live code wins. If this folder disagrees with `src/`, trust `src/` and fix the note.
- Knowledge goes here. Product code stays in the app.
- No commit and no push unless the user asks in that message.
- No Vercel deploy and no AWS change unless the user asks in that message.
- Never read secret files into Cortex, and never paste their values here.

## Deny-list (do not copy into Cortex)

- `.env`, `.env.local`, `.env.*`
- `*.pem` and SSH private keys
- Folders or files whose names say `WITH-SECRETS` or `nvidia_keys`
- A filled-in copy of `PlacementHub_AWS_First_Time_Setup_Guide.docx` (real values after Ctrl+H)
- Database URLs, passwords, access keys, and server addresses

Placeholders such as `<PH_DOMAIN>`, `<ELASTIC_IP>`, and `<RDS_ENDPOINT>` are allowed. Real values are not.

## Safety copied from the app

- Nested `campus-placement-multiuser/internship-portal` is frozen.
- The public homepage must stay up.
- InternSafar is a separate app. Do not restart it, resize its server, or restore a database snapshot that includes its data, as part of Placement Hub work.
