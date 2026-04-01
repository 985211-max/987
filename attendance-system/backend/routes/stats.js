const express = require('express');
const router = express.Router();
const { authenticate } = require('./attendance');
const db = require('../db');

// GET /api/stats/class?class_name=xxx&start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/class', authenticate, (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: '权限不足' });

  const { class_name, start, end } = req.query;
  const cn = class_name || req.user.class_name;

  let sessionsQuery = `SELECT s.*, COUNT(ar.id) as total,
    SUM(CASE WHEN ar.status='present' THEN 1 ELSE 0 END) as present_count,
    SUM(CASE WHEN ar.status='late' THEN 1 ELSE 0 END) as late_count,
    SUM(CASE WHEN ar.status='absent' THEN 1 ELSE 0 END) as absent_count
    FROM attendance_sessions s
    LEFT JOIN attendance_records ar ON ar.session_id = s.id
    WHERE s.teacher_id=? AND s.class_name=?`;
  const params = [req.user.id, cn];

  if (start) { sessionsQuery += ` AND s.date >= ?`; params.push(start); }
  if (end)   { sessionsQuery += ` AND s.date <= ?`; params.push(end); }
  sessionsQuery += ` GROUP BY s.id ORDER BY s.date DESC`;

  const sessions = db.prepare(sessionsQuery).all(...params);
  res.json(sessions);
});

// GET /api/stats/student?class_name=xxx  - per-student summary
router.get('/student', authenticate, (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: '权限不足' });

  const cn = req.query.class_name || req.user.class_name;
  const students = db.prepare(
    `SELECT u.id, u.name, u.student_no,
      COUNT(ar.id) as total_sessions,
      SUM(CASE WHEN ar.status='present' THEN 1 ELSE 0 END) as present_count,
      SUM(CASE WHEN ar.status='late' THEN 1 ELSE 0 END) as late_count,
      SUM(CASE WHEN ar.status='absent' THEN 1 ELSE 0 END) as absent_count,
      ROUND(100.0 * SUM(CASE WHEN ar.status IN ('present','late') THEN 1 ELSE 0 END) / MAX(COUNT(ar.id), 1), 1) as attendance_rate
    FROM users u
    LEFT JOIN attendance_records ar ON ar.student_id = u.id
    WHERE u.role='student' AND u.class_name=?
    GROUP BY u.id ORDER BY u.student_no`
  ).all(cn);
  res.json(students);
});

// GET /api/stats/overview  - quick numbers for teacher dashboard
router.get('/overview', authenticate, (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: '权限不足' });

  const today = new Date().toISOString().slice(0, 10);
  const totalSessions = db.prepare(`SELECT COUNT(*) as c FROM attendance_sessions WHERE teacher_id=?`).get(req.user.id).c;
  const todaySession  = db.prepare(`SELECT * FROM attendance_sessions WHERE teacher_id=? AND date=? AND status='open' LIMIT 1`).get(req.user.id, today);
  const totalStudents = db.prepare(`SELECT COUNT(*) as c FROM users WHERE role='student' AND class_name=?`).get(req.user.class_name).c;
  const unreadAlerts  = db.prepare(
    `SELECT COUNT(*) as c FROM alerts a JOIN attendance_sessions s ON s.id=a.session_id WHERE s.teacher_id=? AND a.is_read=0`
  ).get(req.user.id).c;

  res.json({ totalSessions, todaySession, totalStudents, unreadAlerts });
});

module.exports = router;
