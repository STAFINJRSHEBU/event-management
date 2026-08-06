require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const { router: authRouter } = require('./routes/auth');
const eventsRouter = require('./routes/events');
const registrationsRouter = require('./routes/registrations');
const notificationsRouter = require('./routes/notifications');
const adminRouter = require('./routes/admin');

app.use('/api/auth', authRouter);
app.use('/api/events', eventsRouter);
app.use('/api/registrations', registrationsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/admin', adminRouter);

// Serve frontend
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Connect to MongoDB and seed admin
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    const User = require('./models/User');
    const Event = require('./models/Event');
    const Notification = require('./models/Notification');

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
      console.log('✅ Default admin created: admin@school.com / admin123');
    }

    // Seed sample events
    const eventCount = await Event.countDocuments();
    if (eventCount === 0) {
      const sampleEvents = [
        { name: 'Annual Music Fest', date: new Date('2026-05-10'), time: '10:00 AM', description: 'A grand celebration of music featuring school bands and solo performances.', capacity: 200, category: 'music', venue: 'Main Auditorium', status: 'open' },
        { name: 'Inter-School Dance Battle', date: new Date('2026-05-18'), time: '02:00 PM', description: 'Dance competition open for all students. Various dance styles welcome!', capacity: 150, category: 'dance', venue: 'School Hall', status: 'open' },
        { name: 'Science & Tech Expo', date: new Date('2026-05-25'), time: '09:00 AM', description: 'Showcase your innovative projects and inventions to judges and peers.', capacity: 100, category: 'technology', venue: 'Science Block', status: 'open' },
        { name: 'Sports Day 2026', date: new Date('2026-06-05'), time: '07:00 AM', description: 'Annual sports competition with athletics, football, and team games.', capacity: 500, category: 'sports', venue: 'School Ground', status: 'upcoming' },
        { name: 'Art & Culture Week', date: new Date('2026-06-12'), time: '11:00 AM', description: 'Celebrate art, craft, and cultural diversity with exhibitions and live demos.', capacity: 80, category: 'arts', venue: 'Art Gallery', status: 'open' },
        { name: 'Academic Quiz Championship', date: new Date('2026-04-20'), time: '01:00 PM', description: 'Test your knowledge across subjects in this exciting quiz competition.', capacity: 60, category: 'academic', venue: 'Conference Room', status: 'open' }
      ];
      await Event.insertMany(sampleEvents);
      console.log('✅ Sample events seeded');
    }

    // Seed sample notifications
    const notifCount = await Notification.countDocuments();
    if (notifCount === 0) {
      await Notification.insertMany([
        { message: '🎉 Welcome to School Event Management System! Register for exciting upcoming events.', type: 'success' },
        { message: '📢 Annual Music Fest registrations are now open. Limited spots available!', type: 'info' },
        { message: '⚠️ Sports Day registration deadline is June 1st. Don\'t miss out!', type: 'warning' }
      ]);
      console.log('✅ Sample notifications seeded');
    }

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
