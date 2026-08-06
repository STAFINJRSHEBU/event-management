const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  description: { type: String, required: true },
  capacity: { type: Number, required: true, min: 1 },
  registeredCount: { type: Number, default: 0 },
  status: { type: String, enum: ['open', 'closed', 'upcoming', 'completed'], default: 'open' },
  category: { type: String, enum: ['music', 'dance', 'sports', 'academic', 'arts', 'technology', 'culture', 'other'], default: 'other' },
  venue: { type: String, default: 'School Auditorium' },
  image: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', eventSchema);
