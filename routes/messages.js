const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messagescontroller');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/conversations', authenticate, messagesController.getConversations);
router.get('/conversations/:conversationId/messages', authenticate, messagesController.getMessages);
router.post('/conversations/:conversationId/messages', authenticate, messagesController.sendMessage);

module.exports = router;