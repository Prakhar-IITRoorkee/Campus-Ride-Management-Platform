const express = require('express');
const router = express.Router();
const { processPayment, createOrder, verifyPayment } = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/process', protect, processPayment);
router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);

module.exports = router;
