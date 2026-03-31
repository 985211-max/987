const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'attendance.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('teacher','student')),
      class_name TEXT,
      student_no TEXT,
      email TEXT,
      created_at DATETIME DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      class_name TEXT NOT NULL,
      date TEXT NOT NULL,
      deadline TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
      created_at DATETIME DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (teacher_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      student_name TEXT NOT NULL,
      student_no TEXT,
      class_name TEXT NOT NULL,
      check_in_time DATETIME,
      status TEXT NOT NULL DEFAULT 'absent' CHECK(status IN ('present','late','absent')),
      note TEXT,
      FOREIGN KEY (session_id) REFERENCES attendance_sessions(id),
      FOREIGN KEY (student_id) REFERENCES users(id),
      UNIQUE(session_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      session_id INTEGER NOT NULL,
      alert_type TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (student_id) REFERENCES users(id),
      FOREIGN KEY (session_id) REFERENCES attendance_sessions(id)
    );
  `);

  // Seed default teacher account if not exists
  const bcrypt = require('bcryptjs');
  const existingTeacher = db.prepare('SELECT id FROM users WHERE username = ?').get('teacher01');
  if (!existingTeacher) {
    const hash = bcrypt.hashSync('teacher123', 10);
    db.prepare(`INSERT INTO users (username, password, name, role, class_name) VALUES (?, ?, ?, ?, ?)`)
      .run('teacher01', hash, '张老师', 'teacher', '计算机2301班');

    // Seed sample students
    const students = [
      { username: 'stu001', name: '李明', student_no: '2023001', class_name: '计算机2301班' },
      { username: 'stu002', name: '王芳', student_no: '2023002', class_name: '计算机2301班' },
      { username: 'stu003', name: '张伟', student_no: '2023003', class_name: '计算机2301班' },
      { username: 'stu004', name: '刘洋', student_no: '2023004', class_name: '计算机2301班' },
      { username: 'stu005', name: '陈静', student_no: '2023005', class_name: '计算机2301班' },
    ];
    const insertStudent = db.prepare(
      `INSERT INTO users (username, password, name, role, class_name, student_no) VALUES (?, ?, ?, ?, ?, ?)`
    );
    students.forEach(s => {
      const h = bcrypt.hashSync('student123', 10);
      insertStudent.run(s.username, h, s.name, 'student', s.class_name, s.student_no);
    });
  }
}

initDatabase();

module.exports = db;
