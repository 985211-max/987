const express = require('express');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const Attendance = require('../models/Attendance');
const Class = require('../models/Class');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { auth, teacherAuth } = require('../middleware/auth');
const { sendEmail } = require('../utils/mailer');

const router = express.Router();

// Get all classes for current user
router.get('/classes', auth, async (req, res) => {
  try {
    let classes;
    if (req.user.role === 'teacher') {
      classes = await Class.find({ teacher: req.user._id }).populate('students', 'name email studentId');
    } else {
      classes = await Class.find({ students: req.user._id }).populate('teacher', 'name email');
    }
    res.json(classes);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a class (teacher only)
router.post('/classes', auth, teacherAuth, async (req, res) => {
  try {
    const { name, code, schedule } = req.body;
    const existingClass = await Class.findOne({ code: code.toUpperCase() });
    if (existingClass) return res.status(400).json({ message: 'Class code already exists' });

    const newClass = new Class({ name, code, teacher: req.user._id, schedule });
    await newClass.save();
    res.status(201).json(newClass);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Join a class (student only)
router.post('/classes/join', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Only students can join classes' });
    
    const { code } = req.body;
    const classObj = await Class.findOne({ code: code.toUpperCase() });
    if (!classObj) return res.status(404).json({ message: 'Class not found' });

    if (classObj.students.includes(req.user._id)) {
      return res.status(400).json({ message: 'Already enrolled in this class' });
    }

    classObj.students.push(req.user._id);
    await classObj.save();
    
    await User.findByIdAndUpdate(req.user._id, { $push: { classes: classObj._id } });
    
    res.json({ message: 'Successfully joined class', class: classObj });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Check in (student)
router.post('/checkin', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Only students can check in' });
    
    const { classId, method = 'manual' } = req.body;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const classObj = await Class.findById(classId).populate('teacher');
    if (!classObj) return res.status(404).json({ message: 'Class not found' });
    if (!classObj.students.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not enrolled in this class' });
    }

    // Check if already checked in today
    let attendance = await Attendance.findOne({
      student: req.user._id,
      class: classId,
      date: today
    });

    if (attendance && attendance.status !== 'absent') {
      return res.status(400).json({ message: 'Already checked in for today' });
    }

    // Determine if late (check against schedule)
    let status = 'present';
    let lateMinutes = 0;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todaySchedule = classObj.schedule?.find(s => s.day === dayNames[now.getDay()]);
    
    if (todaySchedule) {
      const [startHour, startMin] = todaySchedule.startTime.split(':').map(Number);
      const classStartTime = new Date(today);
      classStartTime.setHours(startHour, startMin + 10, 0); // 10-minute grace period
      
      if (now > classStartTime) {
        status = 'late';
        lateMinutes = Math.floor((now - classStartTime) / 60000);
      }
    }

    if (attendance) {
      attendance.checkInTime = now;
      attendance.status = status;
      attendance.lateMinutes = lateMinutes;
      attendance.method = method;
    } else {
      attendance = new Attendance({
        student: req.user._id,
        class: classId,
        date: today,
        checkInTime: now,
        status,
        lateMinutes,
        method
      });
    }
    await attendance.save();

    // Send late notification to teacher if student is late
    if (status === 'late') {
      const notification = new Notification({
        recipient: classObj.teacher._id,
        type: 'late_alert',
        title: 'Late Arrival Alert',
        message: `${req.user.name} checked in ${lateMinutes} minutes late to ${classObj.name}`,
        class: classId
      });
      await notification.save();

      if (classObj.teacher.notificationsEnabled) {
        await sendEmail(
          classObj.teacher.email,
          'Late Arrival Alert',
          `Student ${req.user.name} checked in ${lateMinutes} minutes late to ${classObj.name} on ${now.toLocaleDateString()}.`
        );
      }
    }

    res.json({ message: `Check-in successful! Status: ${status}`, attendance });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Generate QR code for class check-in (teacher)
router.get('/classes/:classId/qrcode', auth, teacherAuth, async (req, res) => {
  try {
    const classObj = await Class.findById(req.params.classId);
    if (!classObj) return res.status(404).json({ message: 'Class not found' });
    if (classObj.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const qrData = JSON.stringify({
      classId: classObj._id,
      token: jwt.sign({ classId: classObj._id, date: new Date().toDateString() }, 
        process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '2h' })
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrData);
    res.json({ qrCode: qrCodeDataUrl, classId: classObj._id, className: classObj.name });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get attendance records for a class (teacher)
router.get('/classes/:classId/records', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const classObj = await Class.findById(req.params.classId);
    if (!classObj) return res.status(404).json({ message: 'Class not found' });

    if (req.user.role === 'teacher' && classObj.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const query = { class: req.params.classId };
    if (req.user.role === 'student') query.student = req.user._id;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const records = await Attendance.find(query)
      .populate('student', 'name email studentId')
      .sort({ date: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student attendance stats
router.get('/stats/student/:studentId?', auth, async (req, res) => {
  try {
    const studentId = req.params.studentId || req.user._id;
    
    if (req.user.role === 'student' && studentId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const classes = req.user.role === 'teacher' 
      ? await Class.find({ teacher: req.user._id })
      : await Class.find({ students: studentId });

    const classIds = classes.map(c => c._id);
    const records = await Attendance.find({ student: studentId, class: { $in: classIds } });

    const stats = {
      total: records.length,
      present: records.filter(r => r.status === 'present').length,
      late: records.filter(r => r.status === 'late').length,
      absent: records.filter(r => r.status === 'absent').length,
      excused: records.filter(r => r.status === 'excused').length,
    };
    stats.attendanceRate = stats.total > 0 
      ? (((stats.present + stats.late) / stats.total) * 100).toFixed(1)
      : 0;

    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get class attendance overview (teacher)
router.get('/stats/class/:classId', auth, teacherAuth, async (req, res) => {
  try {
    const classObj = await Class.findById(req.params.classId).populate('students', 'name email studentId');
    if (!classObj) return res.status(404).json({ message: 'Class not found' });
    if (classObj.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const records = await Attendance.find({ class: req.params.classId })
      .populate('student', 'name email studentId');

    // Build per-student stats
    const studentStats = {};
    classObj.students.forEach(s => {
      studentStats[s._id] = { student: s, total: 0, present: 0, late: 0, absent: 0 };
    });

    records.forEach(r => {
      if (studentStats[r.student._id]) {
        studentStats[r.student._id].total++;
        studentStats[r.student._id][r.status]++;
      }
    });

    const studentList = Object.values(studentStats).map(s => ({
      ...s,
      attendanceRate: s.total > 0 ? (((s.present + s.late) / s.total) * 100).toFixed(1) : 0
    }));

    // Daily attendance for chart
    const dailyRecords = await Attendance.aggregate([
      { $match: { class: classObj._id } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
        total: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    res.json({ students: studentList, dailyRecords, class: classObj });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Mark attendance manually (teacher)
router.post('/mark', auth, teacherAuth, async (req, res) => {
  try {
    const { studentId, classId, date, status, notes } = req.body;
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOneAndUpdate(
      { student: studentId, class: classId, date: attendanceDate },
      { status, notes, checkInTime: status !== 'absent' ? new Date() : null },
      { upsert: true, new: true }
    );

    res.json({ message: 'Attendance marked', attendance });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
