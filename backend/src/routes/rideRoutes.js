const express = require('express');
const router = express.Router();
const { requestRide, acceptRide, updateRideStatus, getMyRides, rateRide } = require('../controllers/rideController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/')
  .post(protect, requestRide)
  .get(protect, getMyRides);

router.put('/:id/accept', protect, acceptRide);
router.put('/:id/status', protect, updateRideStatus);
router.put('/:id/rate', protect, rateRide);

module.exports = router;
