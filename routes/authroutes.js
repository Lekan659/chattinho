// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../controllers/authcontroller');
const { authenticate } = require('../middleware/authMiddleware');

router.post('/register', auth.register);
router.get('/verify/:token', auth.verifyEmail);
router.post('/login', auth.login);
router.post('/forgot-password', auth.forgotPassword);
router.post('/reset/:token', auth.resetPassword);

router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
