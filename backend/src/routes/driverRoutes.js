const express = require('express');
const router = express.Router();
const { updateAvailability, getAvailableDrivers } = require('../controllers/driverController');
const { protect } = require('../middlewares/authMiddleware');

router.put('/availability', protect, updateAvailability);
router.get('/available', protect, getAvailableDrivers);

module.exports = router;
