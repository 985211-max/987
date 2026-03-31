const User = require('../models/User');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const { sendEmail } = require('./mailer');

const sendReminders = async () => {
  try {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = dayNames[new Date().getDay()];
    
    const classes = await Class.find({
      'schedule.day': today
    }).populate('students teacher');

    for (const cls of classes) {
      // Remind students
      for (const student of cls.students) {
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);

        const existingRecord = await Attendance.findOne({
          student: student._id,
          class: cls._id,
          date: todayDate
        });

        if (!existingRecord) {
          const notification = new Notification({
            recipient: student._id,
            type: 'reminder',
            title: 'Attendance Reminder',
            message: `Don't forget to check in for ${cls.name} today!`,
            class: cls._id
          });
          await notification.save();

          if (student.notificationsEnabled) {
            await sendEmail(
              student.email,
              'Attendance Reminder',
              `Dear ${student.name}, don't forget to check in for ${cls.name} today!`
            );
          }
        }
      }
    }
  } catch (err) {
    console.error('Reminder scheduler error:', err);
  }
};

const checkAnomalies = async () => {
  try {
    const classes = await Class.find().populate('teacher students');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const cls of classes) {
      for (const student of cls.students) {
        const records = await Attendance.find({
          student: student._id,
          class: cls._id,
          date: { $gte: thirtyDaysAgo }
        });

        if (records.length === 0) continue;

        const absences = records.filter(r => r.status === 'absent').length;
        const absenceRate = (absences / records.length) * 100;

        // Alert if absence rate > 30%
        if (absenceRate > 30) {
          const recentAlert = await Notification.findOne({
            recipient: cls.teacher._id,
            type: 'absence_alert',
            class: cls._id,
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          });

          if (!recentAlert) {
            const notification = new Notification({
              recipient: cls.teacher._id,
              type: 'absence_alert',
              title: 'High Absence Rate Alert',
              message: `${student.name} has missed ${absences} out of ${records.length} sessions (${absenceRate.toFixed(0)}%) in ${cls.name}`,
              class: cls._id
            });
            await notification.save();

            if (cls.teacher.notificationsEnabled) {
              await sendEmail(
                cls.teacher.email,
                'High Absence Rate Alert',
                `Student ${student.name} has an absence rate of ${absenceRate.toFixed(0)}% in ${cls.name}. Please review.`
              );
            }

            // Also notify student
            const studentNotification = new Notification({
              recipient: student._id,
              type: 'absence_alert',
              title: 'Attendance Warning',
              message: `Your attendance rate in ${cls.name} has dropped below 70%. Please attend classes regularly.`,
              class: cls._id
            });
            await studentNotification.save();
          }
        }
      }
    }
  } catch (err) {
    console.error('Anomaly check error:', err);
  }
};

module.exports = { sendReminders, checkAnomalies };
