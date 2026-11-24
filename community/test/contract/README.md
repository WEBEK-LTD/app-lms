# The app against the real Community server (contract test)

`community_contract_test.dart` runs the app's own API clients (not the fakes) against a running Community server, in one
run: log in (an admin), sign up by email (two members), `/me` and `/config`, follow, sections and tags, ask (it waits for
a moderator), similar questions, answer, votes (one's own refused), accept, replies, an official answer and a tutorial
from the team, bookmark and Saved, search, tutorials, notifications and their email choices, the Gold badge's
eligibility, report, and log out. One test compares what each model parses with the server's own JSON, field by field.

It is skipped unless these are set, so CI skips it:

| Variable | What |
|---|---|
| `YC_CONTRACT_URL` | The server, e.g. `http://localhost:3310` (the app adds `/api/community/v1`). |
| `YC_CONTRACT_ADMIN_EMAIL`, `YC_CONTRACT_ADMIN_PASSWORD` | A community admin on that server: a member whose linked Yallapp account is an owner or admin of Yallapp's admin (`lib/community/staff.ts`). A new member's first posts wait for a moderator; the run approves them as this admin, and posts the official answer and the tutorial as the team. |

## Running it locally

1. A MySQL or MariaDB database, and the platform with the community areas merged (base, Q&A, trust; later the
   integration branch). In `platform/web`, with an env file holding at least `DATABASE_URL`, `DATABASE_SSL=disabled`,
   `SESSION_SECRET`, `SIGNING_SECRET`, `ENCRYPTION_KEY` (64 hex), `APP_URL` and `COMMUNITY_SITE_URL` (local test values,
   never real ones):

       node --env-file=<env> scripts/migrate.mjs
       set -a; . <env>; set +a; npx next dev -p 3310

2. An admin: sign up once (`POST /api/community/v1/auth/email/sign-up`), then link that member to a Yallapp account
   that is an owner. Locally, the shortest way: put a test email in the server's `SUPER_ADMIN_EMAILS` (an owner), add a
   `users` row with that email, and in the database
   `UPDATE community_members SET yallapp_user_id = '<that user's id>', linked_at = NOW() WHERE email = '<the member's email>';`

3. In `community/`:

       YC_CONTRACT_URL=http://localhost:3310 \
       YC_CONTRACT_ADMIN_EMAIL=<that email> YC_CONTRACT_ADMIN_PASSWORD=<its password> \
       flutter test test/contract

Each run makes new members (their emails carry the run's time), so it can run again on the same database.
