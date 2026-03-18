const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const notificationRoutes = require('./routes/notifications');
const { sendReminders } = require('./utils/scheduler');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_system')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Schedule daily reminders at 7 AM
cron.schedule('0 7 * * *', () => {
  console.log('Running daily attendance reminders...');
  sendReminders();
});

// Schedule anomaly checks every hour
cron.schedule('0 * * * *', async () => {
  console.log('Checking for attendance anomalies...');
  const { checkAnomalies } = require('./utils/scheduler');
  await checkAnomalies();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
