# EduWow

AI-powered Gamified Learning Management System for high school students.

Thesis focus: improving student engagement through XP, levels, badges, medals, certificates, leaderboards, quizzes, and AI-generated educational content.

---

## Tech Stack

| Layer    | Technologies                                                                          |
| -------- | ------------------------------------------------------------------------------------- |
| Frontend | React 19, Vite, JavaScript, Material UI, React Router, Axios, Framer Motion, Chart.js |
| Backend  | Node.js, Express.js (ES Modules)                                                      |
| Database | MySQL                                                                                 |
| Auth     | JWT + bcrypt                                                                          |
| Uploads  | Multer                                                                                |
| AI       | Google Gemini (preferred), OpenAI optional                                            |

---

## Features

### Student

- Register / Login
- Dashboard with XP and progress charts
- Learning modules & lessons
- Quizzes with AI hints
- Educational games
- XP, levels, badges, medals
- Certificates
- Leaderboard

### Teacher

- Course & lesson management
- Learning material uploads
- AI Quiz Generator
- AI Game Generator
- AI Content Generator (lessons or uploaded PDF/DOCX/PPTX/TXT → quiz or game)
- Award badges
- Analytics

### Administrator

- User management
- Course management
- Leaderboard view
- Certificate management
- Platform analytics

---

## Prerequisites

- Node.js `>=20 <23` (tested on 22.18.0)
- MySQL 8+
- Gemini or OpenAI API key (optional — AI features fall back to local generators if unset)

---

## Setup

### 1. Database

Create/configure MySQL credentials, then update `backend/.env` (see `backend/.env.example`).

Provider order: **Gemini → OpenAI → local fallback**. Get a free Gemini key at [Google AI Studio](https://aistudio.google.com/apikey).

Apply schema + demo data (**destructive — fresh/demo DBs only**):

```bash
cd backend
npm install
npm run seed
```

> **WARNING:** `npm run seed` truncates learning/demo tables and reloads demo accounts.  
> Do **not** run it against a database with real participant data.  
> Production blocks seed unless `ALLOW_DEMO_SEED=true`.

For an **existing** database that already has data, apply migrations instead of reseeding:

```bash
cd backend
npm run db:migrate
```

Reset all teaching/learning data while **keeping user accounts** (demo/test only):

```bash
cd backend
npm run db:reset-demo
```

This clears courses, lessons, quizzes, games, progress, XP history, badges, certificates, AI drafts, enrollments, and uploads. It does **not** touch the `users` table (emails, passwords, roles). Student profiles are kept but XP/level/streaks are reset to zero.

### 2. Backend (development)

```bash
cd backend
npm run dev
```

API runs at `http://localhost:4000` (avoid port 5000 on macOS — AirPlay Receiver uses it)

Health check: `GET /api/health`

### 3. Frontend (development)

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

App runs at `http://localhost:5173`

### 4. Production (summary)

```bash
# Backend
cd backend
NODE_ENV=production npm run check:production
NODE_ENV=production npm start

# Frontend (VITE_API_URL must be a public non-localhost API URL)
cd frontend
VITE_API_URL=https://api.example.com/api npm run build
```

Full production checklist, hosting requirements, uploads persistence, SMTP/AI notes: see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

The backend requires a **long-running Node/Express** host with **MySQL** and a **persistent upload volume**. It is not designed for Vercel serverless backend hosting. The frontend static build may be hosted on Vercel or any static CDN.

---

## Demo Accounts

After seeding (`npm run seed`), use password `Password123!` for:

| Role          | Email                   |
| ------------- | ----------------------- |
| Administrator | `admin@eduwow.local`    |
| Teacher       | `teacher@eduwow.local`  |
| Student       | `student@eduwow.local`  |
| Student       | `student2@eduwow.local` |

---

## API Overview

Base URL: `/api`

| Area          | Examples                                                                    |
| ------------- | --------------------------------------------------------------------------- |
| Auth          | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`                   |
| Users         | `GET/POST/PUT/DELETE /users`                                                |
| Courses       | `GET/POST/PUT/DELETE /courses`, `POST /courses/:id/enroll`                  |
| Lessons       | `GET/PUT/DELETE /lessons/:id`, `POST /lessons/:id/complete`                 |
| Quizzes       | `POST /quizzes`, `POST /quizzes/generate`, `POST /quizzes/:id/start`        |
| Games         | `POST /games/generate`, `POST /games/:id/scores`                            |
| Gamification  | `/gamification/me`, `/gamification/leaderboard`, badges/medals/certificates |
| Analytics     | `/analytics/admin`, `/analytics/teacher`, `/analytics/student`              |
| Notifications | `GET /notifications`                                                        |

Standard response:

```json
{
  "success": true,
  "message": "",
  "data": {}
}
```

---

## Development Priority Covered

1. Authentication
2. Dashboards (Student / Teacher / Admin)
3. Learning Modules
4. Quiz System
5. Gamification (XP, levels, badges, medals, certificates, leaderboard)
6. AI Quiz & Game generators
7. Analytics

---

## Notes

- Passwords are hashed with bcrypt; routes are protected with JWT + RBAC.
- Uploaded files are stored under `UPLOAD_DIR` or `backend/uploads/` (persistent disk required in production).
- Without `GEMINI_API_KEY` or `OPENAI_API_KEY`, AI quiz/game generation still works via deterministic fallback content so the thesis demo remains usable offline.
- Prefer `GEMINI_API_KEY` for free generation. OpenAI is only used if Gemini is not configured.
- Quiz question types: Multiple Choice, True/False, Matching, Identification, Image Questions.
- For existing databases, apply numbered migrations via `npm run db:migrate` (007–010) or see earlier migration files under `backend/database/migrations/`. Prefer migrate over re-seeding when you already have data.
- Teachers can attach images to Image Questions via `POST /api/quizzes/questions/:questionId/image`.
- AI Game Generator supports Flashcards, Memory Match, Crossword, Word Search, Quiz Show, Jeopardy, Drag and Drop, and Spin Wheel (plus Auto Select).
- AI Content Generator supports lesson or uploaded PDF/DOCX/PPTX/PPT/TXT → quiz or game.
- Deployment details: [DEPLOYMENT.md](./DEPLOYMENT.md).
