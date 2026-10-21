# Quality

Test workbooks: `docs/test-cases/`. Playbooks: `qa/docs/`.

Do not treat one script’s pass count as the whole suite. Say which runner ran.

This folder does not yet hold a generated case map. Add one only when a coverage script writes it.

## Core accounts are not for testing (2026-10-21)

Do not test the 20 core accounts. Testing uses a genuine account only.

Leave the core accounts in place. A demo may use them if one is required. A demo is expected on Vercel, not on AWS. No production process may sign in as them, change them, or send mail for them. QA reads `QA_STUDENT_EMAIL` and the other `QA_*_EMAIL` variables in `qa/genuineAccounts.js`, and it refuses a core address.

## No bounce-causing mail (2026-10-21)

Never run a test, script, or manual step that sends mail to an address that will bounce. PlacementHub and InternSafar share one ZeptoMail account.

Sign-in does not send mail. `src/lib/auth.js` blocks sign-in only when `email_verified_at` is empty. The 20 AWS core accounts already have that timestamp, so they can sign in without a message. Do not change those accounts for login.

A new registration does send a verification email, and sign-in stays blocked until that link is used. That is the same kind of send InternSafar needs for a new employer. It is not required for these 20 accounts.

Do not run forgot-password, student welcome, apply, offer, interview, bulk student email, data export, or super-admin college create when the delivery address is one of these:

| PlacementHub account | Delivery address | Result |
|---|---|---|
| arjun.verma@iitm.edu | arjun.verma@iitm.edu | Bounce |
| sneha.rao@nitt.edu | test-notifications@nitt.edu | Bounce |
| Any new fake inbox, including qa-create-check@placementhub.online and @campus-placement.work | That fake inbox | Bounce |
| The other 18 core accounts | sandeepjain200019@gmail.com | Real inbox |

One send skips that rewrite and uses the address typed on screen: student opportunity email (`skipCommunicationRouting`). Do not type a bounce address there.
