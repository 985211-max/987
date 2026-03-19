const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'attendance_secret_key_2024';

function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未授权，请先登录' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Token无效或已过期，请重新登录' });
  }
}

function requireTeacher(req, res, next) {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: '权限不足' });
  next();
}

// ─── Teacher: Create a session ────────────────────────────────────────────────
// POST /api/attendance/sessions
router.post('/sessions', authenticate, requireTeacher, (req, res) => {
  const { class_name, date, deadline } = req.body;
  if (!class_name || !date || !deadline) {
    return res.status(400).json({ message: '请提供班级、日期和签到截止时间' });
  }

  // Close any previous open session for this class today
  db.prepare(`UPDATE attendance_sessions SET status='closed' WHERE teacher_id=? AND class_name=? AND date=? AND status='open'`)
    .run(req.user.id, class_name, date);

  const result = db.prepare(
    `INSERT INTO attendance_sessions (teacher_id, class_name, date, deadline) VALUES (?, ?, ?, ?)`
  ).run(req.user.id, class_name, date, deadline);

  // Pre-populate records for all students in this class
  const students = db.prepare(`SELECT id, name, student_no FROM users WHERE role='student' AND class_name=?`).all(class_name);
  const insert = db.prepare(
    `INSERT OR IGNORE INTO attendance_records (session_id, student_id, student_name, student_no, class_name, status) VALUES (?, ?, ?, ?, ?, 'absent')`
  );
  students.forEach(s => insert.run(result.lastInsertRowid, s.id, s.name, s.student_no, class_name));

  res.json({ message: '签到会话已创建', session_id: result.lastInsertRowid });
});

// GET /api/attendance/sessions  (teacher: list sessions; student: list sessions for their class)
router.get('/sessions', authenticate, (req, res) => {
  let sessions;
  if (req.user.role === 'teacher') {
    sessions = db.prepare(
      `SELECT * FROM attendance_sessions WHERE teacher_id=? ORDER BY date DESC, created_at DESC`
    ).all(req.user.id);
  } else {
    sessions = db.prepare(
      `SELECT * FROM attendance_sessions WHERE class_name=? ORDER BY date DESC, created_at DESC`
    ).all(req.user.class_name);
  }
  res.json(sessions);
});

// GET /api/attendance/sessions/today  (student: get today's open session)
router.get('/sessions/today', authenticate, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const session = db.prepare(
    `SELECT * FROM attendance_sessions WHERE class_name=? AND date=? AND status='open' ORDER BY created_at DESC LIMIT 1`
  ).get(req.user.class_name, today);
  res.json(session || null);
});

// ─── Teacher: Close a session ─────────────────────────────────────────────────
router.patch('/sessions/:id/close', authenticate, requireTeacher, (req, res) => {
  db.prepare(`UPDATE attendance_sessions SET status='closed' WHERE id=? AND teacher_id=?`)
    .run(req.params.id, req.user.id);
  res.json({ message: '签到已关闭' });
});

// ─── Student: Check in ───────────────────────────────────────────────────────
// POST /api/attendance/checkin
router.post('/checkin', authenticate, (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ message: '仅学生可签到' });
  }

  const { session_id } = req.body;
  if (!session_id) return res.status(400).json({ message: '缺少session_id' });

  const session = db.prepare(`SELECT * FROM attendance_sessions WHERE id=?`).get(session_id);
  if (!session) return res.status(404).json({ message: '签到会话不存在' });
  if (session.class_name !== req.user.class_name) {
    return res.status(403).json({ message: '您不属于该班级' });
  }
  if (session.status !== 'open') {
    return res.status(400).json({ message: '签到已关闭' });
  }

  const now = new Date();
  const nowStr = now.toISOString().slice(0, 19).replace('T', ' ');

  // Determine late status
  const deadlineDate = new Date(`${session.date}T${session.deadline}:00`);
  const isLate = now > deadlineDate;
  const status = isLate ? 'late' : 'present';

  // Upsert record
  db.prepare(
    `INSERT INTO attendance_records (session_id, student_id, student_name, student_no, class_name, check_in_time, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(session_id, student_id) DO UPDATE SET check_in_time=excluded.check_in_time, status=excluded.status`
  ).run(session_id, req.user.id, req.user.name, req.user.student_no, req.user.class_name, nowStr, status);

  // Create late alert
  if (isLate) {
    db.prepare(
      `INSERT INTO alerts (student_id, session_id, alert_type, message)
       VALUES (?, ?, 'late', ?)`
    ).run(req.user.id, session_id, `${req.user.name} 于 ${nowStr} 迟到签到（截止时间：${session.deadline}）`);
  }

  res.json({ message: isLate ? '签到成功（迟到）' : '签到成功', status, check_in_time: nowStr });
});

// ─── Teacher: Get records for a session ──────────────────────────────────────
router.get('/sessions/:id/records', authenticate, requireTeacher, (req, res) => {
  const records = db.prepare(
    `SELECT ar.*, u.username FROM attendance_records ar
     JOIN users u ON ar.student_id = u.id
     WHERE ar.session_id=?
     ORDER BY ar.student_no`
  ).all(req.params.id);
  res.json(records);
});

// ─── Student: Get own records ────────────────────────────────────────────────
router.get('/my-records', authenticate, (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: '权限不足' });
  const records = db.prepare(
    `SELECT ar.*, s.date, s.deadline, s.class_name AS session_class
     FROM attendance_records ar
     JOIN attendance_sessions s ON ar.session_id = s.id
     WHERE ar.student_id=?
     ORDER BY s.date DESC`
  ).all(req.user.id);
  res.json(records);
});

// ─── Teacher: Mark manual absence/note ───────────────────────────────────────
router.patch('/records/:id', authenticate, requireTeacher, (req, res) => {
  const { status, note } = req.body;
  if (!status) return res.status(400).json({ message: '缺少status字段' });
  db.prepare(`UPDATE attendance_records SET status=?, note=? WHERE id=?`)
    .run(status, note || null, req.params.id);
  res.json({ message: '记录已更新' });
});

// ─── Alerts ───────────────────────────────────────────────────────────────────
router.get('/alerts', authenticate, requireTeacher, (req, res) => {
  const alerts = db.prepare(
    `SELECT a.*, u.name as student_name, s.date, s.class_name
     FROM alerts a
     JOIN users u ON a.student_id = u.id
     JOIN attendance_sessions s ON a.session_id = s.id
     JOIN attendance_sessions ss ON ss.teacher_id = ? AND ss.id = a.session_id
     ORDER BY a.created_at DESC LIMIT 100`
  ).all(req.user.id);
  res.json(alerts);
});

router.patch('/alerts/:id/read', authenticate, requireTeacher, (req, res) => {
  db.prepare(`UPDATE alerts SET is_read=1 WHERE id=?`).run(req.params.id);
  res.json({ message: 'ok' });
});

// Generate alerts for absent students in a closed session
router.post('/sessions/:id/generate-alerts', authenticate, requireTeacher, (req, res) => {
  const session = db.prepare(`SELECT * FROM attendance_sessions WHERE id=? AND teacher_id=?`)
    .get(req.params.id, req.user.id);
  if (!session) return res.status(404).json({ message: '会话不存在' });

  const absentStudents = db.prepare(
    `SELECT * FROM attendance_records WHERE session_id=? AND status='absent'`
  ).all(req.params.id);

  const insert = db.prepare(
    `INSERT OR IGNORE INTO alerts (student_id, session_id, alert_type, message)
     VALUES (?, ?, 'absent', ?)`
  );
  absentStudents.forEach(r => {
    insert.run(r.student_id, session.id,
      `${r.student_name} 在 ${session.date} 晚点名中未签到（班级：${session.class_name}）`);
  });

  res.json({ message: `已生成 ${absentStudents.length} 条缺勤提醒` });
});

module.exports = { router, authenticate };
