const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, updateProfile, googleAuth } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuth);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

module.exports = router;
