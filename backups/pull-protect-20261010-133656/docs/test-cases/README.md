# PlacementHub test cases

Excel/CSV suites for manual and scripted QA.

| File | Purpose |
|------|---------|
| `PlacementHub-Test-Cases.xlsx` | Main suite |
| `PlacementHub-Test-Cases-Delta-Post-Gen.xlsx` (+ `.csv`) | Delta after last full generation |
| `PlacementHub-Test-Cases-Import-Export.xlsx` | Import / export flows |
| `PlacementHub-Test-Cases-Email-Templates.xlsx` | System / college email templates |
| `PlacementHub-Test-Cases-Workflow-Negative.xlsx` | Drives / internships / offers workflow + negatives |
| `PlacementHub-Test-Cases - Copy.xlsx` | Local backup copy (optional) |

## Regenerate

```bash
# Main / delta (scripts/)
# node/python generators under scripts/ and qa/

npm run qa:import-export-xlsx
npm run qa:email-templates-xlsx
npm run qa:workflow-negative-xlsx
```

Runners write results to `qa/data/`; sheet updaters write Status columns back into these workbooks.
