# EduWow Deployment Guide

EduWow is a **traditional long-running Node.js + Express + MySQL** application with a **Vite React SPA** frontend.

> **Backend hosting:** Use a VM, VPS, or container that keeps Node running continuously (systemd, PM2, Docker Compose, Railway, Render, Fly.io, DigitalOcean, etc.).
>
> **Do not** deploy the Express backend as a Vercel/serverless function. Local disk uploads and long-lived MySQL connections are required.
>
> **Frontend** may be deployed to a static host (including Vercel) that serves the Vite build.

---

## 1. Architecture

| Layer    | Stack                                           | Notes                                       |
| -------- | ----------------------------------------------- | ------------------------------------------- |
| Frontend | React 19 + Vite                                 | Static SPA; talks to API via `VITE_API_URL` |
| Backend  | Node.js + Express                               | Long-running process (`npm start`)          |
| Database | MySQL 8+                                        | Required                                    |
| Files    | Local disk (`UPLOAD_DIR` or `backend/uploads/`) | **Persistent volume required**              |
| Auth     | JWT                                             | Set strong `JWT_SECRET`                     |
| Email    | SMTP (optional)                                 | Password reset delivery                     |
| AI       | Gemini / OpenAI / local fallback                | Optional keys                               |

---

## 2. Requirements

- **Node.js** `>=20 <23` (tested on 22.18.0)
- **MySQL** 8+
- HTTPS reverse proxy recommended in production
- Writable **persistent** filesystem for uploads
- Exact frontend origin for CORS (`CLIENT_URL`)

---

## 3. Backend installation

```bash
cd backend
npm ci
cp .env.example .env
# Edit .env with production values
```

Production start:

```bash
cd backend
NODE_ENV=production npm start
```

Development:

```bash
cd backend
npm run dev
```

---

## 4. Frontend installation

```bash
cd frontend
npm ci
cp .env.example .env
```

Development:

```bash
cd frontend
npm run dev
```

Production build (requires public non-localhost API URL):

```bash
cd frontend
VITE_API_URL=https://api.example.com/api npm run build
```

Serve the `frontend/dist/` directory from any static host. Set CORS `CLIENT_URL` on the backend to that exact frontend origin.

---

## 5. Environment variables

### Backend (required in production)

| Variable      | Notes                                                          |
| ------------- | -------------------------------------------------------------- |
| `NODE_ENV`    | `production`                                                   |
| `PORT`        | Listening port (required in production)                        |
| `DB_HOST`     | MySQL host                                                     |
| `DB_NAME`     | Database name                                                  |
| `DB_USER`     | Database user                                                  |
| `DB_PASSWORD` | Must be set (can be empty only if intentional)                 |
| `JWT_SECRET`  | ≥32 chars, not a known weak placeholder                        |
| `CLIENT_URL`  | Exact frontend origin, e.g. `https://app.example.com` (no `*`) |

### Backend (recommended)

| Variable                                | Notes                                |
| --------------------------------------- | ------------------------------------ |
| `UPLOAD_DIR`                            | Absolute persistent path for uploads |
| `JWT_EXPIRES_IN`                        | Default `1d` in production           |
| `GEMINI_API_KEY` / `OPENAI_API_KEY`     | Optional AI                          |
| `MAIL_HOST` (+ port/user/password/from) | Optional SMTP                        |

### Frontend

| Variable       | Notes                                                     |
| -------------- | --------------------------------------------------------- |
| `VITE_API_URL` | **Required for production builds**; must not be localhost |

See `backend/.env.example` and `frontend/.env.example`.

---

## 6. Database initialization

### Fresh database (demo / thesis)

```bash
cd backend
npm run seed
```

**WARNING:** `npm run seed` is **destructive**. It truncates learning/demo tables and reloads demo accounts.  
**FOR FRESH/DEMO DATABASES ONLY. DO NOT RUN against real participant data.**

In production, seed is blocked unless:

```bash
ALLOW_DEMO_SEED=true NODE_ENV=production npm run seed
```

### Existing database (already has schema)

Apply migrations 007–010:

```bash
cd backend
npm run db:migrate
```

This records applied files in `schema_migrations` and skips ones already applied.

---

## 7. Migrations 007–010

| File                              | Purpose                           |
| --------------------------------- | --------------------------------- |
| `007_xp_reward_idempotency.sql`   | XP one-time reward uniqueness     |
| `008_certificate_eligibility.sql` | Certificate override audit fields |
| `009_ai_usage_events.sql`         | AI usage/quota table              |
| `010_password_reset_tokens.sql`   | Password reset token hashes       |

Fresh `schema.sql` (via seed) already includes these structures.  
Existing installs should run `npm run db:migrate`.

Do not re-run `seed` just to apply migrations.

---

## 8. Upload persistent storage

EduWow stores uploaded lesson materials, avatars, and related files on **local disk**.

- Default: `backend/uploads/`
- Override: `UPLOAD_DIR=/persistent/path/eduwow/uploads`

**Production requirement:** the path must be on a **persistent volume**.  
Do **not** deploy the backend where the filesystem is ephemeral (files would disappear on restart/redeploy).

Uploads are **not** publicly browsable. Access is via authenticated `/api/files/*` routes. Absolute filesystem paths are never returned to clients.

---

## 9. CORS

Backend CORS `origin` is exactly `CLIENT_URL`.

- Must match the browser origin of the SPA (scheme + host + port)
- Wildcards (`*`) are rejected in production
- Credentials remain enabled

---

## 10. HTTPS

Terminate TLS at your reverse proxy (nginx, Caddy, cloud load balancer).  
Point `CLIENT_URL` and `VITE_API_URL` at the HTTPS origins users actually use.

---

## 11. SMTP (optional)

If `MAIL_HOST` is empty:

- Forgot-password API still returns a safe generic success response
- Reset emails are **not** delivered

If SMTP is configured, set:

- `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`
- `MAIL_USER`, `MAIL_PASSWORD`
- `MAIL_FROM`

Never commit or log credentials.

---

## 12. AI configuration (optional)

| Option | Behavior                                          |
| ------ | ------------------------------------------------- |
| A      | `GEMINI_API_KEY` set → Gemini preferred           |
| B      | `OPENAI_API_KEY` set (no Gemini) → OpenAI         |
| C      | Neither set → local/demo fallback where supported |

AI keys must stay on the backend only (never `VITE_*`).

---

## 13. Production configuration check

```bash
cd backend
NODE_ENV=production npm run check:production
```

Reports PASS / FAIL for database, JWT, CLIENT_URL, PORT, uploads, optional SMTP/AI — **without printing secrets**.

---

## 14. Health check

```http
GET /api/health
```

Example success:

```json
{
  "success": true,
  "message": "EduWow API is healthy",
  "data": { "status": "ok", "database": "up" }
}
```

Does not expose credentials or filesystem paths.

---

## 15. Production smoke test

1. `GET /api/health` → database up
2. Login as admin / teacher / student
3. Teacher uploads a material; student can open it when enrolled
4. Student completes a lesson / quiz / game (XP once)
5. Leaderboard shows only XP > 0
6. Forgot-password (if SMTP configured, confirm email arrives)
7. Confirm CORS works from the real frontend origin

---

## 16. Backup recommendations

- Nightly MySQL dumps (`mysqldump` or managed backups)
- Backup `UPLOAD_DIR` / `backend/uploads/` with the database
- Store `JWT_SECRET` and DB credentials in a secrets manager — not in git

---

## 17. Destructive demo commands (warning)

| Command                 | Risk                              |
| ----------------------- | --------------------------------- |
| `npm run seed`          | Wipes and reseeds demo data       |
| `npm run db:reset-demo` | Clears learning data; keeps users |

Blocked when `NODE_ENV=production` unless `ALLOW_DEMO_SEED=true`.

---

## 18. What not to do

- Do not deploy the **backend** on Vercel serverless
- Do not use ephemeral disk for uploads
- Do not set `CLIENT_URL=*`
- Do not build the frontend without `VITE_API_URL`
- Do not point production `VITE_API_URL` at localhost
- Do not run `seed` against production participant data
