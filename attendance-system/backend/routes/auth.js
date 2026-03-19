const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'attendance_secret_key_2024';

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: '请填写用户名和密码' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ message: '用户名或密码错误' });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ message: '用户名或密码错误' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name, class_name: user.class_name, student_no: user.student_no },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      class_name: user.class_name,
      student_no: user.student_no
    }
  });
});

// POST /api/auth/register  (student self-registration)
router.post('/register', (req, res) => {
  const { username, password, name, class_name, student_no } = req.body;
  if (!username || !password || !name || !class_name) {
    return res.status(400).json({ message: '请填写完整信息' });
  }

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) {
    return res.status(409).json({ message: '用户名已存在' });
  }

  const hash = bcrypt.hashSync(password, 10);
  try {
    db.prepare(`INSERT INTO users (username, password, name, role, class_name, student_no) VALUES (?, ?, ?, 'student', ?, ?)`)
      .run(username, hash, name, class_name, student_no || null);
    res.json({ message: '注册成功，请登录' });
  } catch (err) {
    res.status(500).json({ message: '注册失败，请重试' });
  }
});

module.exports = router;
