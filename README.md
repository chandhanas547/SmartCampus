# Smart Campus — Capstone Starter

A runnable full-stack React + Express **demonstration project** with three user roles, real API endpoints, and local JSON persistence. This is a **starter**, not a production-ready campus system. It does **not** use MongoDB yet, and it does not include every feature of the larger specification (for example, faculty CRUD, assignment grading, and profile editing).

## Requirements
- Node.js 20+ and npm

## Start (macOS / Linux / Windows PowerShell)

```bash
cd smart-campus
npm install
npm run install:all
```

Create `backend/.env` by copying `backend/.env.example`. Replace `JWT_SECRET` with a random string of at least 24 characters. You can generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

On macOS/Linux:
```bash
cp backend/.env.example backend/.env
```

On Windows PowerShell:
```powershell
Copy-Item backend/.env.example backend/.env
```

Then:
```bash
npm run dev
```

Open **http://localhost:5173**. API runs on **http://localhost:4000**.

## Demo accounts (local development only)

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@campus.test | Admin123! |
| Faculty | faculty@campus.test | Faculty123! |
| Student | student@campus.test | Student123! |

The backend creates `backend/data.json` with demo records on first launch. The file is ignored by Git. To reset demo data, stop the server and delete `backend/data.json`.

## Included features
- Role-based login, protected APIs, JWT, bcrypt-hashed demo passwords
- Admin: create/delete students, create courses, enroll students, publish announcements
- Faculty: mark attendance, create assignments, publish announcements
- Student: view enrolled courses/attendance, submit assignment responses
- Dashboard stats, responsive UI, dark mode, announcement feed

## Important limitations
- Uses local JSON file storage, **not MongoDB**. Intended for a single local demonstration only.
- JWT is stored in sessionStorage; a hardened production system should use secure cookie-based sessions and CSRF protection.
- No production-grade password reset, audit trail, email verification, database transactions, or comprehensive automated tests.
- Faculty CRUD, assignment grading, profile editing, and several advanced requirements remain future work.
- Don't deploy publicly with these demo accounts or passwords. Replace storage and authentication before any real-world use.
- The UI may load Google Fonts; an internet connection may be needed for that font.

## Build
```bash
npm run build
```

## GitHub
Create a new repository and push the project files. `.env`, `node_modules`, `backend/data.json`, and built assets are excluded via `.gitignore`.

## Suggested capstone extensions
1. Replace JSON persistence with MongoDB + Mongoose.
2. Add faculty management, assignment grading, profiles and editing.
3. Add integration tests, form validation and robust session handling.
4. Deploy backend and frontend after removing demo credentials.
5. Prepare SRS, report, and screenshots for college submission.
