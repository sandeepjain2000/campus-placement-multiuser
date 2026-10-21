# Documentation maintenance

Update Cortex in the same task when a change adds or changes:

- a role’s behaviour, a page route, or an API contract
- database tables, columns, or status values
- auth or approval rules
- an environment variable **name** (never the value)
- a deploy or rollback rule
- a locked decision

Do not update Cortex for a pure wording or CSS tweak.

## Rules

1. Change the one folder that owns the fact.
2. Prefer a path over a paste of source code.
3. Mark anything not checked against the repo as needing the owner’s confirmation.
4. If Cortex and the code disagree, fix the stale side after looking.
5. Never add a secret value while editing.
6. Do not commit or push unless the user asks.
