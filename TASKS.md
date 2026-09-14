# QuizBot V4 — Task Tracker

Status key: `[ ]` todo, `[~]` in progress, `[x]` done

---

## Phase 0: Project Setup

- [x] 0.1 — Init new TypeScript project (tsconfig, eslint, prettier)
- [x] 0.2 — Set up package.json with pinned deps (discord.js, firebase-admin, googleapis)
- [x] 0.3 — Configure project structure (src/, commands/, services/, integrations/, utils/)
- [ ] 0.4 — Dockerfile (multi-stage build: compile TS → run JS)
- [ ] 0.5 — GitHub Actions workflow (lint + build + test on push)
- [x] 0.6 — .env.example and config loading (environment variables, no config.json with secrets)

---

## Phase 1: Bot Foundation

- [x] 1.1 — Discord client setup (intents, login, graceful shutdown)
- [x] 1.2 — Command loader (dynamic import from commands/ directory)
- [x] 1.3 — Event handler (interactionCreate with proper error boundaries)
- [x] 1.4 — Command deployment script (register slash commands with Discord API)
- [x] 1.5 — Logging setup (pino, structured, simple — no multi-transport complexity)
- [x] 1.6 — Result type utility (`Ok<T>` / `Err<E>` discriminated union)
- [x] 1.7 — Embed builder helpers (success, error, confirmation templates)

---

## Phase 2: Firestore Integration

- [x] 2.1 — Firebase Admin init (service account from env/mounted secret)
- [x] 2.2 — Guild config service (read/write config subcollection)
- [x] 2.3 — Teams service (CRUD operations, member lookups)
- [x] 2.4 — Quiz session service (create/end/get current quiz by date)
- [x] 2.5 — Rounds service (store/retrieve/mark-published round responses)
- [x] 2.6 — Scoreboard service (generate, store, retrieve)
- [ ] 2.7 — Date utility (timezone-aware quiz date derivation, configurable)
- [x] 2.8 — Per-user tracking service (record user-team associations per guild/quiz; powers autocomplete and prevents duplicate registration)
- [x] 2.9 — Teams Aliases map (store/lookup textified channel names and form-name aliases; used for response matching and collision detection)
- [x] 2.10 — Teams Members map (userId -> teamName flat lookup; fast duplicate-member check during registration)
- [x] 2.11 — Response history (preserve previous fetches when re-fetching a round; store as current + history array)
- [x] 2.12 — Quiz ended guard (all write operations must check quiz session status and reject writes to ended quizzes)

---

## Phase 3: Google Forms Integration

- [x] 3.1 — Google Forms API client (service account auth, read responses)
- [x] 3.2 — Response parser (extract team names, answers, scores from form data)
- [x] 3.3 — Form validation (check form structure matches expectations)
- [ ] 3.4 — Test with a real form (verify service account access, response format)

---

## Phase 4: Team Management Commands

- [x] 4.1 — `/register` command (name, captain, members, color; validation, confirmation)
- [x] 4.2 — Discord resource creation (role, text channel, voice channel, permissions)
- [x] 4.3 — Registration rollback on partial failure (await all cleanup)
- [x] 4.4 — `/team add` subcommand
- [x] 4.5 — `/team remove` subcommand
- [x] 4.6 — `/team promote` subcommand
- [x] 4.7 — `/team delete` command (admin)
- [x] 4.8 — `/leave` command (with validation: not captain, not sole member)
- [x] 4.9 — Autocomplete for team names (from Firestore)
- [x] 4.10 — Team name normalization (case-insensitive matching, trim whitespace, prevent near-duplicates) [GH #19]
- [ ] 4.11 — Drift detection: verify role/channel still exist before operating on a team; handle renames gracefully [GH #15] (deferred to Phase 6 polish)

---

## Phase 5: Quiz Operations Commands

- [x] 5.1 — `/quiz setup` (configure form IDs for rounds, store in Firestore config)
- [x] 5.2 — `/quiz fetch` (deferred reply, call Forms API, parse, store in Firestore)
- [x] 5.3 — `/quiz send` (retrieve stored round, send embeds to team channels)
- [x] 5.4 — `/quiz scoreboard` (aggregate all rounds, generate leaderboard embed)
- [x] 5.5 — `/quiz correct` (update team name across all stored rounds)
- [x] 5.6 — `/quiz end` (lock session, prevent further modifications)
- [x] 5.7 — `/quiz reset` (tear down all team roles/channels, clear Firestore state)
- [x] 5.8 — Confirmation flows with buttons (60s timeout, graceful expiry)

---

## Phase 6: Migration & Polish

- [ ] 6.0 — `/migrate` command (admin): one-time migration of V3 Firestore data to V4 paths/shapes. Reads `Servers/{id}/Quizzes/{code}/Teams|Rounds|Maps/...`, extracts IDs/names from serialized Discord objects, writes to `guilds/{id}/quizzes/{code}/...` in clean V4 format. Also migrates `Users/` collection for per-user tracking.
- [ ] 6.1 — `/ping` and `/help` commands
- [ ] 6.1a — `/status` command: show integration health (Firestore connected, Forms API accessible, bot permissions OK) [GH #26]
- [ ] 6.2 — Error embeds for all failure modes (permission denied, not found, already exists)
- [ ] 6.3 — Integration tests (mock Discord API, real Firestore emulator)
- [ ] 6.4 — Build and push Docker image to registry
- [ ] 6.5 — Deploy to GCE e2-micro (docker pull + restart)
- [ ] 6.6 — GitHub Actions: automated deploy on merge to main
- [ ] 6.7 — Smoke test on live Discord server

---

## Phase 7: Future (not blocking launch)

- [ ] 7.1 — Web dashboard for admins
- [ ] 7.2 — Score correction at question level
- [ ] 7.3 — Historical stats / all-time leaderboards
- [ ] 7.4 — Multi-guild support
- [ ] 7.5 — Automated form creation (Google Forms API supports this)
- [ ] 7.6 — Open/close form functions (toggle form accepting responses via Forms API)
- [ ] 7.7 — `/form open <round>` and `/form close <round>` commands
- [ ] 7.8 — `/form next` command (close current round's form, open the next round's form)
