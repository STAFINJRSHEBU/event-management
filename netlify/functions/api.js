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

// Temporary Cloud Seeding Route
router.get('/seed', async (req, res) => {
  try {
    const User = require('../../models/User');
    const Event = require('../../models/Event');
    const Notification = require('../../models/Notification');
    
    // Seed default admin
    const adminExists = await User.findOne({ email: 'admin@school.com' });
    if (!adminExists) {
      const admin = new User({
        name: 'Administrator',
        email: 'admin@school.com',
        password: 'admin123',
        role: 'admin',
        participantType: 'Internal'
      });
      await admin.save();
    }
    
    // Seed sample events
    const eventCount = await Event.countDocuments();
    if (eventCount === 0) {
      const sampleEvents = require('../../events_data.json');
      await Event.insertMany(sampleEvents);
    }
    
    // Seed sample notifications
    const notifCount = await Notification.countDocuments();
    if (notifCount === 0) {
      await Notification.insertMany([
        { message: '🎉 Welcome to School Event Management System! Register for exciting upcoming events.', type: 'success' },
        { message: '📢 Annual Music Fest registrations are now open. Limited spots available!', type: 'info' },
        { message: '⚠️ Sports Day registration deadline is June 1st. Don\'t miss out!', type: 'warning' }
      ]);
    }
    
    res.send("<h2>✅ Database successfully seeded!</h2><p>You can now close this tab and refresh your live website.</p>");
  } catch (err) {
    res.status(500).send("❌ Error seeding database: " + err.message);
  }
});

app.use('/.netlify/functions/api', router);
app.use('/api', router);

module.exports.handler = serverless(app);
