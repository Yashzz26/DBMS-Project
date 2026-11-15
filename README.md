# DBMS Project — 3-Day Development & GitHub Plan

> **Planned start date:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ (fill on Day 1)\
> **Actual start date:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ (fill on Day 1)\
> **Duration:** 3 consecutive development days\
> **Target:** 4–6 meaningful commits per day × 3 days = **15–18 commits total**

## Project context

This repository (`https://github.com/Yashzz26/DBMS-Project.git`) is for the **CCE 5 DBMS assignment**: design and build an *Electronic Device Repair and Service Management System* using MongoDB. The deliverable is a working website (Node.js + Express + MongoDB backend, plain HTML/CSS/JS frontend) plus a report covering CRUD operations and aggregation pipelines.

### Fixed technology stack

- Node.js + Express.js
- Official `mongodb` driver (**no Mongoose**)
- MongoDB running locally (`mongodb://127.0.0.1:27017`, database `repair_shop`)
- Plain HTML5 + CSS3 + vanilla JavaScript (served from `/public` by Express)
- `express-session` for admin auth
- `dotenv` for environment variables
- `nodemon` (dev only)
- Postman / browser for API testing

### Product scope

- Single repair shop, single admin
- Collections: `customers`, `devices`, `serviceRequests`, `serviceRecords`
- Full CRUD on customers, devices, service requests
- Status lifecycle: `pending` → `in-progress` → `completed` / `cancelled`
- Auto-insert into `serviceRecords` when a request is marked `completed`
- 4 aggregation reports: device-wise stats, pending repairs, status summary, revenue
- Admin login gate (credentials via `.env`)
- Seed script with realistic sample data

## How to use this plan

1. Give the day's **Task** to Antigravity and ask it to inspect the existing repo before editing.
2. Complete the task, test the endpoints manually, inspect the diff, and commit using the suggested message.
3. Push all of the day's commits to `main` on GitHub.
4. Tick the task boxes only after the work is complete, tested and committed.

**Effort legend:** `[S]` = under 1 hour, `[M]` = 1–2 hours, `[L]` = 2–4 hours.

If a task is `[L]` and cannot be finished cleanly in one commit, split it into smaller meaningful, tested commits.

### If a day is missed

Do not double-commit to catch up. Shift remaining days forward and update dates.

### Definition of Done (per task)

- [ ] Code is implemented and follows existing repo conventions
- [ ] Endpoints tested manually (Postman or browser) and response verified
- [ ] `git status` and `git diff --staged` reviewed — no `.env`, `node_modules`, or unrelated files included
- [ ] Commit message is plain lowercase, human-readable, no `feat:`/`chore:` prefixes
- [ ] Summary of changed files and test result recorded

## Daily Git workflow

Run from repo root. Stage specific paths, not `git add .` unless the whole tree is reviewed.

```bash
git status
git branch --show-current

# After a task is complete and tested
git add <specific-paths>
git diff --staged
git commit -m "short plain lowercase message"

# Push day's commits
git push
git status
git log -3 --oneline

# Tag the completed day
git tag day-1
git push --tags
```

Replace `day-1` with `day-2` / `day-3`. Do not recreate existing tags.

Every commit message must be **short, plain, human-readable**, e.g.:
- `set up express server and mongo connection`
- `add customer crud endpoints and page`
- `fix login redirect issue`
- `add seed data script`

**Never use:** `feat:`, `chore:`, `fix:`, `docs:`, or any conventional-commit prefix.

**Staging safety:** Before every commit, confirm no `.env`, `node_modules`, or service-account files are staged. `.gitignore` must include `node_modules/`, `.env`, and `*.log`.

## Commit & push rules for this repo

- Commit **directly to `main`**. No feature branches.
- **Never push automatically** — the agent commits locally; you push manually after checking `git log`.
- Repo remote: `https://github.com/Yashzz26/DBMS-Project.git`
- No empty commits, no artificial splits, no `--allow-empty`.
- Each commit must deliver a distinct, working change.

## 3-day task checklist

### Day 1 — Foundation, Auth, Customers, Devices

- [x] **Task 1: Initialize Express project and MongoDB connection** [M]
  - Run `npm init`, install `express`, `mongodb`, `dotenv`, `express-session`, `nodemon`.
  - Create folder structure: `server.js`, `db.js`, `routes/`, `middleware/`, `public/`, `scripts/`.
  - Create `.gitignore` (`node_modules/`, `.env`, `*.log`), `.env.example` with placeholders.
  - `db.js` exports a `MongoClient` connection to `repair_shop` database.
  - `server.js` boots Express, connects to MongoDB, serves `/public`, has `GET /api/health` returning `{ ok: true }`.
  - **Commit:** `set up express server and mongo connection`
  - **Test:** `curl http://localhost:3000/api/health` returns ok.

- [x] **Task 2: Add admin login and session auth** [M]
  - `routes/auth.js`: `POST /api/auth/login` (checks `.env` `ADMIN_USER` / `ADMIN_PASS`, sets session), `POST /api/auth/logout`, `GET /api/auth/me`.
  - `middleware/requireAdmin.js`: returns `401` if no session.
  - `public/login.html` + JS: form posts to login, redirects to `index.html` on success.
  - `.env.example` includes `MONGO_URI`, `DB_NAME`, `PORT`, `SESSION_SECRET`, `ADMIN_USER`, `ADMIN_PASS`.
  - **Commit:** `add admin login and session auth`
  - **Test:** login with correct and wrong creds; `/api/auth/me` reflects state.

- [x] **Task 3: Add customer CRUD endpoints and page** [M]
  - `routes/customers.js`: POST (validate `name` + `phone`), GET list, GET by id, PUT, DELETE.
  - `public/customers.html`: table with add form, delete button, inline edit.
  - `public/app.js`: shared fetch helper with `credentials: 'include'`.
  - **Commit:** `add customer crud endpoints and page`
  - **Test:** all 5 endpoints in Postman; CRUD reflected in page.

- [ ] **Task 4: Add device CRUD endpoints and page** [M]
  - `routes/devices.js`: same 5 endpoints. `GET /api/devices?customerId=...` filters.
  - `public/devices.html`: dropdown of customers + form + table.
  - **Commit:** `add device crud endpoints and page`
  - **Test:** create device linked to existing customer; filter works.

- [ ] **All Day 1 commits pushed to `main` and visible on GitHub.**

---

### Day 2 — Service Requests, Records, Aggregation

- [ ] **Task 5: Add service request CRUD and status update** [L]
  - `routes/serviceRequests.js`: POST (customerId, deviceId, issueDescription → status `pending`), GET list with `$lookup` for customer + device names, PUT `/status`, DELETE.
  - When `status` becomes `completed`, insert into `serviceRecords` with `serviceRequestId`.
  - `public/requests.html`: table with status dropdown to update, add form.
  - **Commit:** `add service requests with status update`
  - **Test:** create request → update to in-progress → complete → confirm serviceRecords row inserted.

- [ ] **Task 6: Add service records endpoints** [S]
  - `routes/serviceRecords.js`: GET list, POST (manual), GET by id.
  - **Commit:** `add service records endpoints`
  - **Test:** GET returns records; POST creates one.

- [ ] **Task 7: Add aggregation report endpoints** [L]
  - `routes/reports.js`:
    - `GET /api/reports/device-stats` — `$lookup` devices → `$unwind` → `$group` by `device.type` → `$sum` → `$sort` desc
    - `GET /api/reports/pending` — `$match` status in `[pending, in-progress]` → `$lookup` customers + devices → `$sort` createdAt asc
    - `GET /api/reports/status-summary` — `$group` by status with `$sum`
    - `GET /api/reports/revenue` — on `serviceRecords`: `$group` sum/avg/count of `cost`
  - Add brief code comments explaining each pipeline stage.
  - **Commit:** `add aggregation reports for device stats and pending`
  - **Test:** hit all 4 endpoints in Postman; verify output with sample data.

- [ ] **Task 8: Build reports page** [M]
  - `public/reports.html`: three sections (device stats table, pending table, revenue summary card).
  - `public/app.js` fetch calls to report endpoints.
  - **Commit:** `build reports page`
  - **Test:** page renders all report sections correctly.

- [ ] **All Day 2 commits pushed to `main` and visible on GitHub.**

---

### Day 3 — Seed, Polish, README, Report Material

- [ ] **Task 9: Add seed data script** [M]
  - `scripts/seed.js`: clears collections, inserts 5 customers, 8 devices, 12 serviceRequests (mixed statuses), 5 serviceRecords.
  - `package.json` script: `"seed": "node scripts/seed.js"`.
  - **Commit:** `add seed data script`
  - **Test:** `npm run seed` → refresh reports page → data appears.

- [ ] **Task 10: Polish UI and fix minor issues** [M]
  - Table styling, spacing, empty states, error messages, loading indicators.
  - End-to-end flow test: login → add customer → add device → create request → update status → view reports → logout.
  - **Commit:** `polish ui and fix minor issues`

- [ ] **Task 11: Write README with setup and API docs** [M]
  - `README.md`: project overview, tech stack, setup steps, `.env` variables, `npm run seed`, full API endpoint list, short explanation of each aggregation pipeline (and why `$match` goes first).
  - Add a "Screenshots" section with placeholders.
  - **Commit:** `add readme and project docs`

- [ ] **Task 12: Prepare CCE report material** [M]
  - Take screenshots: Postman responses, MongoDB Compass collections, aggregation output, browser pages.
  - Draft report sections: data model diagram, aggregation pipeline flowchart, CRUD vs SQL comparison, MongoDB choice justification.
  - **Commit:** `add report material and screenshots` (or save screenshots locally if not committing them)

- [ ] **All Day 3 commits pushed to `main` and visible on GitHub.**

---

## Completion tracker

| Day | Date | Task 1 | Task 2 | Task 3 | Task 4 | Pushed | Commits | Commit hashes |
|-----|------|--------|--------|--------|--------|--------|---------|---------------|
| 1 | 2026-11-15 | [x] | [x] | [x] | [ ] | [ ] | 4 | |
| 2 | | [ ] | [ ] | [ ] | [ ] | [ ] | 4 | |
| 3 | | [ ] | [ ] | [ ] | [ ] | [ ] | 4 | |

## Instructions for Antigravity (paste before each task)

> You are working in my DBMS project repo (`DBMS-Project`). Read the root `README.md` and existing files before making changes. Follow the fixed stack: Node.js + Express, official `mongodb` driver (no Mongoose), plain HTML/CSS/JS in `/public`, `express-session` for auth. Do not introduce new frameworks or replace the stack. First inspect the repo and report which files you intend to change. Implement only the task I give you, with secure and readable code, comments on any aggregation pipeline. Run relevant tests manually (curl/Postman) and summarize changed files and results. **Do not commit or push unless I explicitly ask.** Commit messages, when requested, must be plain lowercase with no `feat:`/`chore:` prefix. Never commit `.env`, `node_modules`, or secrets.

After each task, ask the agent to report:
- Files created or modified
- What functionality is now working
- Endpoints tested and responses observed
- Any manual setup still required
- Any known limitations

## Security and quality checklist

- [ ] `.env` ignored by git; only `.env.example` tracked
- [ ] `node_modules/` and `*.log` ignored
- [ ] All protected `/api` routes use `requireAdmin` middleware
- [ ] Every endpoint returns proper JSON with status codes (200, 201, 400, 401, 404)
- [ ] Aggregation pipelines have inline comments explaining each stage
- [ ] Seed script is idempotent (clears collections first)
- [ ] Frontend fetch calls include `credentials: 'include'`
- [ ] No secrets hardcoded in source files

## Report deliverable checklist (for CCE submission)

- [ ] Data model diagram (4 collections + relationships)
- [ ] Aggregation pipeline flowchart (device-stats and pending)
- [ ] Why MongoDB over SQL for this domain (flexible schema for varied device types and fault descriptions)
- [ ] Screenshot: customer CRUD in Postman
- [ ] Screenshot: service request status update
- [ ] Screenshot: device-wise stats aggregation output
- [ ] Screenshot: pending repairs report
- [ ] Screenshot: MongoDB Compass showing collections
- [ ] Screenshot: working frontend pages
- [ ] Short explanation of `$lookup`, `$match`, `$group`, `$unwind` usage

## End goal

By the end of Day 3:
- Working website: admin login → customers → devices → service requests → status updates → reports
- Seed data loaded so all aggregation queries return meaningful output
- 12+ meaningful commits on `main` with plain human messages
- README with setup, API docs, and aggregation explanations
- All report screenshots and material ready for CCE submission

**Streak principle: real tasks, real commits, working features. Do not pad with empty commits.**
