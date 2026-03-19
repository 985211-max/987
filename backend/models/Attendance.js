const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  date: { type: Date, required: true },
  checkInTime: { type: Date },
  status: {
    type: String,
    enum: ['present', 'late', 'absent', 'excused'],
    default: 'absent'
  },
  lateMinutes: { type: Number, default: 0 },
  method: { type: String, enum: ['manual', 'qrcode'], default: 'manual' },
  notes: { type: String }
}, { timestamps: true });

attendanceSchema.index({ student: 1, class: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
