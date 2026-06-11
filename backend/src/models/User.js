const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId;
    },
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  role: {
    type: String,
    enum: ['passenger', 'driver'],
    required: true,
  },
  // Driver specific fields
  vehicle: {
    type: { type: String }, // e.g., 'e-rickshaw', 'car'
    plateNumber: { type: String },
  },
  verificationId: {
    type: String // e.g., License or Student ID
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  currentLocation: {
    lat: { type: Number },
    lng: { type: Number },
  },
  averageRating: {
    type: Number,
    default: 0,
  },
  totalRatings: {
    type: Number,
    default: 0,
  },
  totalRides: {
    type: Number,
    default: 0,
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
