# EduQuest Project Rules

## Project Information

Project Name: EduQuest

Description:
EduQuest is an AI-powered Gamified Learning Management System (LMS) designed to improve student engagement among high school students through interactive learning, quizzes, achievements, badges, medals, leaderboards, and AI-generated educational content.

Always assume that every request belongs to this project unless otherwise specified.

---

# Tech Stack

## Frontend

- React 19
- Vite
- JavaScript ONLY (Never TypeScript)
- Material UI (MUI)
- React Router DOM
- Axios
- Framer Motion

## Backend

- Node.js
- Express.js

## Database

- MySQL

## Authentication

- JWT
- bcrypt

## File Upload

- Multer

## Charts

- Chart.js
- react-chartjs-2

## AI

- OpenAI API

---

# Coding Standards

Always write production-ready code.

Never generate placeholder code.

Never omit required files.

Never use pseudo code.

Never use TODO comments instead of implementation.

Always use async/await.

Never use callback-based code unless required by a library.

Use ES Modules (import/export).

Keep functions focused on one responsibility.

Use descriptive variable and function names.

Keep code clean and readable.

---

# Architecture

Follow Clean Architecture.

Backend structure:

backend/
├── config/
├── controllers/
├── middleware/
├── models/
├── routes/
├── services/
├── utils/
├── validations/
├── uploads/

Frontend structure:

frontend/
├── src/
│ ├── assets/
│ ├── components/
│ ├── contexts/
│ ├── hooks/
│ ├── layouts/
│ ├── pages/
│ ├── routes/
│ ├── services/
│ ├── styles/
│ ├── utils/

Business logic belongs in Services.

Controllers should only:

- validate input
- call services
- return responses

Never put business logic inside controllers.

---

# API Standards

Follow REST principles.

Example endpoints:

GET /api/courses

POST /api/courses

PUT /api/courses/:id

DELETE /api/courses/:id

Use plural resource names.

Always return JSON.

Standard response format:

{
"success": true,
"message": "",
"data": {}
}

Error format:

{
"success": false,
"message": "",
"errors": []
}

Use proper HTTP status codes.

---

# Authentication

Use JWT Authentication.

Passwords must always be hashed using bcrypt.

Never store plain text passwords.

Protect routes using middleware.

Use Role-Based Access Control (RBAC).

Supported roles:

- Student
- Teacher
- Administrator

---

# Database Rules

Use MySQL.

Normalize tables to Third Normal Form (3NF).

Use foreign keys.

Create indexes where appropriate.

Avoid duplicated data.

Always include:

- created_at
- updated_at

Use snake_case for table names and columns.

Use singular model names.

Example:

users

courses

course_lessons

quiz_attempts

student_badges

student_medals

---

# Frontend Rules

Always use Material UI.

Use functional components.

Never use class components.

Use React Hooks.

Use Context API for authentication.

Use Axios for API requests.

Create reusable UI components.

Examples:

Button

Card

Dialog

Modal

Table

Form

ProgressBar

LeaderboardCard

BadgeCard

MedalCard

CertificateCard

Never duplicate components.

---

# UI Design

Design inspiration:

- Duolingo
- Kahoot!
- Quizizz
- Google Classroom

Theme:

Modern

Colorful

Friendly

Game-like

Responsive

Features:

- Glassmorphism cards
- Rounded corners
- Soft shadows
- Smooth animations
- Progress bars
- XP animations
- Confetti celebrations
- Achievement popups
- Responsive layout
- Dark Mode
- Light Mode

Use Framer Motion for animations.

---

# Forms

Always validate both:

Frontend

Backend

Never trust client input.

Display validation errors clearly.

---

# File Upload

Support:

PDF

DOCX

PPTX

TXT

PNG

JPG

JPEG

Display upload progress.

Validate file type.

Validate file size.

Store uploaded files inside:

backend/uploads/

---

# AI Integration

Use OpenAI API.

AI features:

- Quiz Generation
- Lesson Summarization
- Learning Objectives
- Hint Generation
- Educational Game Generation

Keep AI logic inside Services.

Never place AI calls inside controllers.

---

# Code Quality

Avoid duplicate code.

Reuse components.

Reuse utility functions.

Reuse hooks.

Reuse services.

Split files that exceed approximately 300–400 lines into smaller modules where practical.

Follow SOLID principles whenever reasonable.

---

# Comments

Do not over-comment.

Only explain:

Complex algorithms

Business rules

AI logic

Database queries

Avoid comments describing obvious code.

---

# Security

Validate every request.

Sanitize inputs.

Prevent SQL Injection.

Prevent XSS.

Never expose secrets.

Use environment variables.

Never hardcode API keys.

Never commit .env files.

---

# Environment Variables

Use .env files.

Example:

PORT

DB_HOST

DB_PORT

DB_NAME

DB_USER

DB_PASSWORD

JWT_SECRET

OPENAI_API_KEY

---

# When Generating Code

Always include:

1. Folder structure

2. File names

3. Complete source code

4. Installation commands if new packages are required

5. Explanation of implementation

Never skip required files.

Never generate partial implementations.

Always ensure generated code integrates with the existing project.

When modifying code, preserve existing functionality unless explicitly instructed otherwise.

---

# Response Style

Prefer maintainable code over clever code.

Prefer readability over brevity.

Generate code that follows industry best practices.

Assume this project will be deployed in production.
