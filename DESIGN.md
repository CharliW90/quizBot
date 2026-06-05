# QuizBot V4 — Design Document

## Overview

QuizBot manages a monthly charity pub quiz (streamed on Twitch, played on Discord). It handles team registration, answer collection from Google Forms, scoring, results distribution, and leaderboard generation.

**V4 goals:**
- Single-service architecture (eliminate the Express API and Apps Script middleman)
- TypeScript for type safety
- Pinned dependencies with lockfile
- Direct Google Forms API access via service account
- Reliable, non-flaky interactions
- Automated CI/CD via GitHub Actions

---

## Architecture

```
Discord Server
    ↕ discord.js websocket (persistent connection)
Single Node.js/TypeScript service
    ├── src/
    │   ├── bot/          — discord.js client, command registration, event handling
    │   ├── commands/     — slash command definitions and handlers
    │   ├── services/     — business logic (teams, scoring, forms)
    │   ├── integrations/ — Google Forms API, Firestore
    │   └── utils/        — shared helpers (logging, date handling, embeds)
    ├── Dockerfile
    └── package.json (locked)
```

**Hosting:** GCE e2-micro VM (free tier), Docker container, auto-restart via systemd or `--restart=always`.

**Database:** Firestore (free tier: 50k reads/20k writes/day — more than sufficient for monthly quizzes with ~20 teams).

**Forms access:** Google Forms API v1 (REST) with a GCP service account. The service account is granted read access to the quiz forms. No Apps Script, no middleman API, no temporary passwords.

---

## Data Model (Firestore)

```
guilds/{guildId}/
├── quizzes/{date}/
│   ├── status: "active" | "ended"
│   ├── createdAt: timestamp
│   ├── rounds/{roundNumber}/
│   │   ├── formId: string
│   │   ├── responses: { [teamName]: { answers: Answer[], score: number } }
│   │   ├── publishedAt: timestamp | null
│   │   └── fetchedAt: timestamp
│   └── scoreboard/
│       ├── generated: { [teamName]: { rounds: number[], total: number } }
│       └── generatedAt: timestamp
├── teams/{teamName}/
│   ├── captain: userId
│   ├── members: userId[]
│   ├── roleId: snowflake
│   ├── textChannelId: snowflake
│   ├── voiceChannelId: snowflake
│   ├── color: hex string
│   └── registeredAt: timestamp
└── config/
    ├── forms: { [roundNumber]: formId }
    ├── categoryChannelId: snowflake
    └── timezone: string (e.g. "Europe/London")
```

**Key changes from V3:**
- Guild-scoped (multi-server support baked in from the start)
- Quiz date derived from configured timezone, not a magic 4-hour offset
- Form IDs stored in Firestore config (not env vars), editable via command
- Round data includes fetch/publish timestamps for audit trail
- Teams stored as subcollection (easier querying than the alias map approach)

---

## Commands

### Team Management
| Command | Who | Description |
|---------|-----|-------------|
| `/register` | Any | Register a new team (name, captain, members, color) |
| `/team add` | Captain/Admin | Add member to existing team |
| `/team remove` | Captain/Admin | Remove member from team |
| `/team promote` | Captain/Admin | Transfer captaincy |
| `/team delete` | Admin | Delete team (removes role, channels, data) |
| `/leave` | Any member | Leave your current team |

### Quiz Operations (Admin only)
| Command | Description |
|---------|-------------|
| `/quiz setup` | Configure form IDs for this month's quiz rounds |
| `/quiz fetch <round\|all>` | Fetch & score responses from Google Forms |
| `/quiz send <round\|all>` | Send scored results to team channels |
| `/quiz scoreboard` | Generate and display aggregate leaderboard |
| `/quiz correct <team-name>` | Fix a team name typo across all rounds |
| `/quiz end` | Lock the current quiz session |
| `/quiz reset` | Tear down all teams/channels for next month |

### Utility
| Command | Description |
|---------|-------------|
| `/ping` | Health check |
| `/help` | Usage info |

---

## Key Design Decisions

### 1. No separate API service
V3 used Express on Cloud Run as a bridge to Apps Script. The Google Forms API (v1, released 2022) allows direct access to form responses with a service account. The bot calls it directly — one fewer service to deploy, monitor, and secure.

### 2. Deferred replies for long operations
Discord interactions must be acknowledged within 3 seconds. For operations that take longer (fetching forms, bulk channel operations), we immediately `deferReply()` and then `editReply()` when done. V3's 10-second timeout was far too short and caused silent failures.

### 3. Confirmation flows via buttons, not timeouts
V3 used `awaitMessageComponent` with short timeouts. V4 will use persistent button collectors with sensible timeouts (5 minutes) and explicit cancellation. Interactions that expire gracefully show "timed out" rather than silently dying.

### 4. Scoring lives in the bot, not Apps Script
V3 relied on Google Forms' built-in grading (score per question in the form). V4 reads raw responses and can optionally score them against an answer key stored in Firestore — allowing corrections without re-fetching from Forms. If the form has grading enabled, we can still use those scores as default.

### 5. Error handling: result types, not exceptions
Functions return `{ ok: true, data } | { ok: false, error }` discriminated unions. No more `{error, response}` pairs where you forget to check. TypeScript enforces handling both cases.

### 6. One guild at a time (for now)
The data model supports multi-guild, but V4 won't implement guild discovery or a "setup wizard" for new servers. It runs on one guild. Multi-guild is a future enhancement, not a launch blocker.

---

## Deployment

```
GitHub repo (private or public)
    → GitHub Actions on push to main:
        1. TypeScript compile + lint
        2. Run tests
        3. Build Docker image
        4. Push to Artifact Registry (or GitHub Container Registry)
        5. SSH to GCE VM → docker pull && docker restart
```

**Environment:**
- `DISCORD_TOKEN` — bot token
- `DISCORD_CLIENT_ID` — application ID
- `GUILD_ID` — target server
- `GOOGLE_APPLICATION_CREDENTIALS` — path to service account JSON (mounted as Docker secret)
- `FIREBASE_PROJECT_ID` — Firestore project

---

## Migration from V3

Not a migration — a clean rewrite. V3 Firestore data can be left in place (or exported for reference), but V4 uses a different schema. The Discord server state (roles, channels) will be reset via `/quiz reset` on V3 before switching over.

---

## Out of Scope (for now)

- Web dashboard (the "site" component) — revisit after bot is stable
- Multi-guild support beyond data model
- Automated deployment of Google Forms (admins create forms manually)
- Score correction at question level (only team name correction for now)
- Historical statistics / all-time leaderboards
