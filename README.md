# 🚀 Antigravity Model — Student Grievance Portal

A full-stack web application for managing student requests and grievances, featuring role-based dashboards for Students, HODs, and Faculty.

## Tech Stack

- **Frontend:** React 19 + Vite + Tailwind CSS v4
- **Backend:** Node.js + Express.js
- **Database:** PostgreSQL
- **Auth:** JWT (JSON Web Tokens)
- **File Upload:** Multer
- **Notifications:** Mock Twilio (SMS) + Mock SendGrid (Email)

## Quick Start

### 1. Database Setup

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE antigravity_db;"

# Run migrations
cd server
npm run migrate
```

### 2. Backend

```bash
cd server
cp .env.example .env
# Edit .env with your PostgreSQL credentials
npm install
npm run dev
```

### 3. Frontend

```bash
cd client
npm install
npm run dev
```

### 4. Access the App

Open `http://localhost:5173` in your browser.

## Demo Accounts

| Role    | Email                    | Password     |
|---------|--------------------------|--------------|
| Student | student@university.edu   | password123  |
| HOD     | hod@university.edu       | password123  |
| Faculty | rajesh@university.edu    | password123  |
| Faculty | anita@university.edu     | password123  |
| Faculty | vikram@university.edu    | password123  |

## API Endpoints

| Method | Endpoint               | Auth  | Description                |
|--------|------------------------|-------|----------------------------|
| POST   | /api/auth/register     | No    | Register a new user        |
| POST   | /api/auth/login        | No    | Login                      |
| GET    | /api/auth/me           | Yes   | Get current user           |
| GET    | /api/users/faculty     | HOD   | List faculty members       |
| POST   | /api/tasks             | Stud  | Submit new grievance       |
| GET    | /api/tasks             | Yes   | Get tasks (role-filtered)  |
| PUT    | /api/tasks/:id/assign  | HOD   | Assign task to faculty     |
| PUT    | /api/tasks/:id/status  | Fac   | Update task status         |
| GET    | /api/tasks/:id/history | Yes   | Get task audit trail       |

## Workflow

1. **Student** submits a form → Status = `Submitted` → HOD notified
2. **HOD** assigns faculty → Status = `Assigned` → Student & Faculty notified
3. **Faculty** updates to `In Progress` or `Resolved` → All parties notified
