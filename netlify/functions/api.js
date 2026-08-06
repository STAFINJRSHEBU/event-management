const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { router: authRouter } = require('../../routes/auth');
const eventsRouter = require('../../routes/events');
const registrationsRouter = require('../../routes/registrations');
const notificationsRouter = require('../../routes/notifications');
const adminRouter = require('../../routes/admin');

// Database connection caching for serverless environments
let isConnected = false;
const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }
  const dbUri = process.env.MONGODB_URI;
  if (!dbUri) {
    throw new Error('MONGODB_URI environment variable is not defined.');
  }
  await mongoose.connect(dbUri);
  isConnected = true;
};

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('MongoDB Serverless Connection Error:', err.message);
    res.status(500).json({ error: 'Database connection failed: ' + err.message });
  }
});

const router = express.Router();
router.use('/auth', authRouter);
router.use('/events', eventsRouter);
router.use('/registrations', registrationsRouter);
router.use('/notifications', notificationsRouter);
router.use('/admin', adminRouter);

app.use('/.netlify/functions/api', router);
app.use('/api', router);

module.exports.handler = serverless(app);
