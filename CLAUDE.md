# QuizBot — Project Rules

## Isolation: Personal Project Only

This is a personal project. It has NO connection to any workplace.

- NEVER use Jira (no jira-cli, jira-ticket, jira-tidy, jira-audit skills)
- NEVER use workplace GitHub orgs (no bamtech, twdcgrid, or any enterprise GitHub)
- NEVER use Confluence, Teams, PagerDuty, Datadog, or any workplace tools/MCPs
- NEVER create tickets, issues, or cards in any external system
- NEVER reference or interact with workplace repos, services, or infrastructure
- Tasks are tracked ONLY in TASKS.md in this repo — nowhere else
- The only external services this project touches: Discord API, Google Cloud (personal account), GitHub (public, personal account)

## Design Reference

- Architecture decisions: see DESIGN.md
- Task tracking: see TASKS.md (update status there as work progresses)

## Tech Stack (V4)

- Language: TypeScript (strict mode)
- Runtime: Node.js
- Discord library: discord.js (pinned version)
- Database: Firestore (Firebase Admin SDK)
- Forms: Google Forms API v1 (service account, direct access)
- Hosting: GCE e2-micro (free tier), Docker
- CI/CD: GitHub Actions (personal account)

## Code Style

- Return discriminated unions (`{ ok: true, data } | { ok: false, error }`) not `{error, response}` pairs
- Use `deferReply()` for any operation that might take >2 seconds
- Pin all dependency versions (no ^ or ~ prefixes)
- Commit lockfile
- No secrets in code — environment variables only
