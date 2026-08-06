const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Notification = require('../models/Notification');

// Middleware
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const adminAuth = async (req, res, next) => {
  await auth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    next();
  });
};

// GET /api/events - all events (public)
router.get('/', async (req, res) => {
  try {
    const { search, category, status } = req.query;
    let filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (category) filter.category = category;
    if (status) filter.status = status;
    const events = await Event.find(filter).sort({ date: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/events/:id
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/events - admin only
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, date, time, description, capacity, category, venue, status, image } = req.body;
    if (!name || !date || !time || !description || !capacity) {
      return res.status(400).json({ message: 'All required fields must be filled' });
    }
    const event = new Event({ name, date, time, description, capacity, category, venue, status, image });
    await event.save();
    res.status(201).json({ message: 'Event created successfully', event });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/events/:id - admin only
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event updated successfully', event });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/events/:id - admin only
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    await Registration.deleteMany({ event: req.params.id });
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/events/:id/register - user auth
router.post('/:id/register', auth, async (req, res) => {
  try {
    const { className, schoolName, phone } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.status === 'closed' || event.status === 'completed') {
      return res.status(400).json({ message: 'Registration is closed for this event' });
    }
    if (event.registeredCount >= event.capacity) {
      return res.status(400).json({ message: 'Event is fully booked' });
    }
    const existing = await Registration.findOne({ user: req.user._id, event: event._id });
    if (existing) return res.status(400).json({ message: 'You are already registered for this event' });

    const registration = new Registration({
      user: req.user._id,
      event: event._id,
      participantType: req.user.participantType,
      className: className || '',
      schoolName: schoolName || '',
      phone: phone || ''
    });
    await registration.save();
    event.registeredCount += 1;
    await event.save();
    res.status(201).json({ message: 'Successfully registered for the event!', registration });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/events/:id/registrations - admin
router.get('/:id/registrations', adminAuth, async (req, res) => {
  try {
    const regs = await Registration.find({ event: req.params.id }).populate('user', 'name email participantType');
    res.json(regs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/events/recommend?keywords=music,dance
router.get('/ai/recommend', async (req, res) => {
  try {
    const { keywords } = req.query;
    if (!keywords) return res.json([]);
    const keywordList = keywords.split(',').map(k => k.trim());
    const regexArr = keywordList.map(k => new RegExp(k, 'i'));
    const events = await Event.find({
      $or: [
        { name: { $in: regexArr } },
        { description: { $in: regexArr } },
        { category: { $in: regexArr } }
      ],
      status: { $in: ['open', 'upcoming'] }
    }).limit(5);
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
