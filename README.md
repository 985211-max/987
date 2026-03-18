# Smart Attendance System

> 🇨🇳 **中文用户**：请查看 **[📖 保姆级使用教程 (SETUP_CN.md)](./SETUP_CN.md)** — 从"代码在哪里"到"系统跑起来"，手把手教你完成每一步。

A full-stack web application for managing class attendance with real-time check-ins, QR codes, analytics, and automated email notifications.

## Features

- **Authentication**: JWT-based login/registration for students and teachers
- **Role-based dashboards**: Separate views for students and teachers
- **Attendance Check-In**: Manual check-in with automatic late detection (10-minute grace period)
- **QR Code Check-In**: Teachers generate time-limited QR codes; students scan to check in
- **Attendance Records**: View history filtered by class and date range
- **Analytics & Charts**: Doughnut charts for student rates; bar charts for daily trends (Chart.js)
- **Manual Override**: Teachers can mark/edit any student's attendance
- **Automated Notifications**: In-app + email alerts for late arrivals and high absence rates
- **Scheduled Jobs**: Daily reminders at 7 AM; hourly anomaly detection (>30% absence triggers alert)
- **Responsive UI**: Bootstrap 5 with mobile-friendly layout

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose ODM) |
| Frontend | React 18, Bootstrap 5 |
| Auth | JSON Web Tokens (JWT) |
| Email | Nodemailer (Gmail) |
| Charts | Chart.js + react-chartjs-2 |
| QR Codes | qrcode (server) + qrcode.react (client) |
| Scheduling | node-cron |

## Project Structure

```
/
├── backend/
│   ├── models/
│   │   ├── User.js          # User schema (student/teacher)
│   │   ├── Class.js         # Class with schedule
│   │   ├── Attendance.js    # Attendance records
│   │   └── Notification.js  # In-app notifications
│   ├── middleware/
│   │   └── auth.js          # JWT auth + teacher guard
│   ├── routes/
│   │   ├── auth.js          # Register, login, profile
│   │   ├── attendance.js    # Classes, check-in, stats, QR
│   │   └── notifications.js # CRUD for notifications
│   ├── utils/
│   │   ├── mailer.js        # Nodemailer helper
│   │   └── scheduler.js     # Cron job logic
│   ├── server.js
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   ├── Login.js
    │   │   ├── Register.js
    │   │   ├── Navbar.js
    │   │   ├── StudentDashboard.js
    │   │   └── TeacherDashboard.js
    │   ├── context/
    │   │   └── AuthContext.js
    │   ├── App.js
    │   ├── index.js
    │   └── index.css
    └── package.json
```

## Installation

### Prerequisites

- Node.js >= 16
- MongoDB (local or Atlas)
- Gmail account (for email notifications, optional)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, and email credentials
npm start
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

The frontend dev server proxies API requests to `http://localhost:5000`.

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

| Variable | Description |
|----------|-------------|
| `PORT` | Backend port (default: 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `EMAIL_USER` | Gmail address for sending emails |
| `EMAIL_PASS` | Gmail App Password |
| `EMAIL_FROM` | Display name + address in From header |
| `CLIENT_URL` | Frontend origin for CORS (default: http://localhost:3000) |

## Usage

### As a Teacher

1. Register with role **Teacher**
2. Go to **Classes** → create a class with a unique code and schedule
3. Share the class code with students
4. Use **QR Code** button to display a scannable check-in code (valid 2 hours)
5. View **Attendance Records** and manually mark/override attendance
6. Check **Reports** for daily trend charts and per-student rates

### As a Student

1. Register with role **Student**
2. Go to **My Classes** → enter a class code to enroll
3. Click **Check In** on the dashboard or Check In page
4. View your **Attendance History** per class
5. Receive in-app and email reminders/warnings

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/attendance/classes` | List user's classes |
| POST | `/api/attendance/classes` | Create class (teacher) |
| POST | `/api/attendance/classes/join` | Join class (student) |
| POST | `/api/attendance/checkin` | Student check-in |
| GET | `/api/attendance/classes/:id/qrcode` | Generate QR (teacher) |
| GET | `/api/attendance/classes/:id/records` | Attendance records |
| GET | `/api/attendance/stats/student` | Student stats |
| GET | `/api/attendance/stats/class/:id` | Class stats (teacher) |
| POST | `/api/attendance/mark` | Manual mark (teacher) |
| GET | `/api/notifications` | List notifications |
| PUT | `/api/notifications/read-all` | Mark all read |

## Screenshots

_Deploy the app and add screenshots here._

## License

MIT
