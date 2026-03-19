const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const notificationRoutes = require('./routes/notifications');
const { sendReminders } = require('./utils/scheduler');

const app = express();

// Support multiple allowed origins (comma-separated) so that other devices on
// the same LAN can access the app.  Example .env value:
//   CLIENT_URL=http://localhost:3000,http://192.168.1.100:3000
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Requests without an Origin header come from same-origin browser navigation,
    // curl, or server-to-server calls — these are not cross-origin browser requests
    // and do not pose a CSRF risk when credentials are JWT tokens in the
    // Authorization header rather than session cookies.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} is not in the allowed list`));
  },
  credentials: true,
}));
app.use(express.json());

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts, please try again later.' }
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

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
