# PlacementHub help library

**Product overview (features & flows):** [`../product/placementhub-functionality.md`](../product/placementhub-functionality.md)

This folder is the **canonical markdown export** of in-app help. Point Cursor, Codex, or Claude Code here for the same content the Help widget uses.

## Sync from source

After editing `src/content/helpDocumentation.js` or `src/content/developerNotes.js`:

```bash
npm run qa:sync-help-knowledge
```

This refreshes these files and the database index used by **Help → Ask a question**.

## Structure

| Folder | Audience |
|--------|----------|
| `platform-basics/` | All roles |
| `use-case-flows/` | All roles |
| `students/` | Students |
| `employers/` | Employers |
| `college-admins/` | College TPO |
| `super-admin/` | Super admin |
| `accounts-security/` | All roles |
| `troubleshooting/` | All roles |
| `developer/` | QA / developers |

## Tips for AI tools

- Ask natural-language questions; cite exact menu names from the docs.
- For assessment CSV / Update Online / offers upload, start with `employers/`.
- For runner alerts and demo mail, see `developer/`.
