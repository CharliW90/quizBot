# quizBot

> **V4 rewrite in progress.** The current production version lives on the [`v3-stable`](../../tree/v3-stable) branch. That branch is archived and will not receive further updates.

At its core this is a Discord bot, built on discord.js, for helping to manage a Discord server running a 'pub quiz' - the bot handles registering teams, providing private channels for team communications, fetching their quiz scores from Google Forms, and informing them of their results.

## the 'Pub Quiz'

This discord bot project arose from my work with a [charity fundraising quiz](https://www.virtual-quizzes.com/), which is streamed on Twitch. The quiz is on the first Friday of every month, at 7:00PM UK time. Everyone is welcome to play along by watching our broadcast on Twitch.tv

## V4 Architecture

V4 is a ground-up rewrite — single TypeScript service replacing the old three-service JavaScript stack (discord bot + express API + Google Apps Script).

- **discord_bot**: discord.js bot handling slash-commands on a Discord server, backed by a Firestore database for quiz and team data
- **forms integration**: direct access to Google Forms API v1 via service account — no more Apps Script middleman, no more custom API, no more single-use passwords

### Tech Stack

- Language: TypeScript (strict mode)
- Runtime: Node.js
- Discord library: discord.js
- Database: Firestore (Firebase Admin SDK)
- Forms: Google Forms API v1 (service account, direct access)
- Hosting: GCE e2-micro (free tier), Docker
- CI/CD: GitHub Actions

## What changed from V3

| V3 | V4 |
|----|-----|
| 3 separate services (bot, express API, Apps Script) | Single TypeScript service |
| JavaScript, no types | TypeScript strict mode |
| Apps Script → Express → Bot pipeline for form responses | Bot calls Google Forms API directly |
| Custom single-use password security between services | Service account auth, no middleman |
| Unpinned dependencies, no lockfile | Pinned versions, committed lockfile |
| Fragile interaction timeouts | Deferred replies, proper error handling |

## Running

```bash
npm install
npm run build
npm start
```

Environment variables (see `.env.example`):
- `DISCORD_TOKEN` — bot token
- `DISCORD_CLIENT_ID` — application ID
- `GUILD_ID` — target server
- `GOOGLE_APPLICATION_CREDENTIALS` — path to service account JSON
- `FIREBASE_PROJECT_ID` — Firestore project

## Testing

```bash
npm test
```
