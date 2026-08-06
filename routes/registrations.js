const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Registration = require('../models/Registration');
const Event = require('../models/Event');

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

// GET /api/registrations - admin: all registrations
router.get('/', adminAuth, async (req, res) => {
  try {
    const { participantType, eventId } = req.query;
    let filter = {};
    if (participantType) filter.participantType = participantType;
    if (eventId) filter.event = eventId;
    const regs = await Registration.find(filter)
      .populate('user', 'name email participantType')
      .populate('event', 'name date category')
      .sort({ registeredAt: -1 });
    res.json(regs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/registrations/my - user's own registrations
router.get('/my', auth, async (req, res) => {
  try {
    const regs = await Registration.find({ user: req.user._id })
      .populate('event', 'name date time category venue status')
      .sort({ registeredAt: -1 });
    res.json(regs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/registrations/:id - admin
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const reg = await Registration.findByIdAndDelete(req.params.id);
    if (!reg) return res.status(404).json({ message: 'Registration not found' });
    await Event.findByIdAndUpdate(reg.event, { $inc: { registeredCount: -1 } });
    res.json({ message: 'Registration removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
