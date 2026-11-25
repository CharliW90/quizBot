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

## Commands

`/help` shows available commands (admin commands are hidden from regular users):

```
QuizBot v4.0.0

  /register        Create a team
  /team            Manage team roster
  /leave           Leave your team
  /delete-team     Delete a team              (admin)
  /quiz-setup      Link a Google Form to a round (admin)
  /quiz-fetch      Fetch responses from a form   (admin)
  /quiz-send       Send results to team channels  (admin)
  /quiz-scoreboard Post the leaderboard           (admin)
  /quiz-correct    Fix a team name typo            (admin)
  /quiz-end        End the current quiz            (admin)
  /quiz-reset      Wipe all teams and quiz data    (admin)
  /ping            Check latency
  /help            Show this list, or detail for a command
```

`/help <command>` shows detailed usage:

| Command | Usage | Detail |
|---------|-------|--------|
| register | `/register <name> <captain> <members...> [color]` | Creates a role, text channel, and voice channel for the team. The captain can manage the roster afterwards with /team. Color is an optional hex code for the team's role. |
| team | `/team <add-member\|remove-member\|promote-to-captain> <team> <user>` | add-member and remove-member do what they say. promote-to-captain transfers captaincy to another member. Requires captain on the team, or server admin. |
| leave | `/leave` | Removes you from your team. Captains must /team promote-to-captain first. If you're the last member, ask an admin to /delete-team instead. |
| delete-team | `/delete-team <team>` | Permanently removes the team's role, channels, and stored data. You'll be asked to confirm before anything is deleted. |
| quiz-setup | `/quiz-setup <round> <form-id>` | The form ID is the long string in the Google Form URL. Rounds are numbered from 1. Run this once per round before the quiz starts. |
| quiz-fetch | `/quiz-fetch <round>` | Pulls answers from the linked Google Form and stores them. Safe to re-run - picks up late submissions without losing earlier data. |
| quiz-send | `/quiz-send <round>` | Posts each team's answers and scores to their private channel. Team names in the form must match registered names (case-insensitive). Use /quiz-correct first if there are typos. |
| quiz-scoreboard | `/quiz-scoreboard` | Calculates cumulative scores across all fetched rounds and posts the leaderboard to the current channel. Visible to everyone. |
| quiz-correct | `/quiz-correct <incorrect> <correct>` | Fixes a misspelled team name in form responses. Updates all stored rounds and saves an alias so future fetches auto-correct. Better than asking the team to resubmit. |
| quiz-end | `/quiz-end` | Closes the quiz session. No more fetches or sends after this. Run this before /quiz-reset if you want to preserve final scores. |
| quiz-reset | `/quiz-reset` | Nuclear option. Deletes ALL teams, roles, channels, and quiz data. Not reversible. You'll be asked to confirm. |
| ping | `/ping` | Shows round-trip and WebSocket latency. |
| help | `/help [command]` | Without an argument, lists all commands. With a command name, shows detailed usage. |

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
