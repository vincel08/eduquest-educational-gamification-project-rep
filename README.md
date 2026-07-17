# EduQuest

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

## Project Structure

```text
eduquest-educational-gamification-project-rep/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── database/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── uploads/
│   ├── utils/
│   ├── validations/
│   └── server.js
└── frontend/
    └── src/
        ├── components/
        ├── contexts/
        ├── hooks/
        ├── layouts/
        ├── pages/
        ├── routes/
        ├── services/
        ├── styles/
        └── utils/
```

---

## Prerequisites

- Node.js 20+
- MySQL 8+
- Gemini or OpenAI API key (optional — AI features fall back to local generators if unset)

---

## Setup

### 1. Database

Create/configure MySQL credentials, then update `backend/.env`:

```env
PORT=4000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_NAME=eduquest
DB_USER=root
DB_PASSWORD=your_mysql_password

JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash

CLIENT_URL=http://localhost:5173
UPLOAD_MAX_SIZE_MB=10
```

Provider order: **Gemini → OpenAI → local fallback**. Get a free Gemini key at [Google AI Studio](https://aistudio.google.com/apikey).

Apply schema + demo data:

```bash
cd backend
npm install
npm run seed
```

### 2. Backend

```bash
cd backend
npm run dev
```

API runs at `http://localhost:4000` (avoid port 5000 on macOS — AirPlay Receiver uses it)

Health check: `GET /api/health`

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

App runs at `http://localhost:5173`

---

## Demo Accounts

After seeding (`npm run seed`), use password `Password123!` for:

| Role          | Email                     |
| ------------- | ------------------------- |
| Administrator | `admin@eduquest.local`    |
| Teacher       | `teacher@eduquest.local`  |
| Student       | `student@eduquest.local`  |
| Student       | `student2@eduquest.local` |

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
- Uploaded files are stored in `backend/uploads/`.
- Without `GEMINI_API_KEY` or `OPENAI_API_KEY`, AI quiz/game generation still works via deterministic fallback content so the thesis demo remains usable offline.
- Prefer `GEMINI_API_KEY` for free generation. OpenAI is only used if Gemini is not configured.
- Quiz question types: Multiple Choice, True/False, Matching, Identification, Image Questions.
- For existing databases, apply `backend/database/migrations/001_quiz_question_types.sql` (or re-run `npm run seed` on a fresh DB).
- Teachers can attach images to Image Questions via `POST /api/quizzes/questions/:questionId/image`.
- AI Game Generator supports Flashcards, Memory Match, Crossword, Word Search, Quiz Show, Jeopardy, Drag and Drop, and Spin Wheel (plus Auto Select). Apply `backend/database/migrations/002_ai_game_types.sql` for existing DBs.
- AI Content Generator: apply `backend/database/migrations/003_ai_content_generations.sql` for existing DBs. Supports lesson or uploaded PDF/DOCX/PPTX/PPT/TXT → quiz or game.
- Priority features (modules, streaks, certificates PDF/QR, new games, OCR): apply schema via `npm run seed` or `backend/database/migrations/004_priority_features.sql`.
