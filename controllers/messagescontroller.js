const { Message, Conversation, Customer } = require('../models');
const { Op } = require('sequelize');

// Get all conversations for a tenant
exports.getConversations = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const conversations = await Conversation.findAll({
      where: { tenantId },
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'whatsappNumber', 'instagramHandle']
        },
        {
          model: Message,
          as: 'messages',
          limit: 1,
          order: [['createdAt', 'DESC']],
          attributes: ['messageText', 'createdAt', 'direction']
        }
      ],
      order: [['lastMessageAt', 'DESC']]
    });

    // Transform the data
    const formatted = conversations.map(conv => ({
      id: conv.id,
      customerId: conv.customer?.id,
      customerName: conv.customer?.name || 'Unknown',
      customerNumber: conv.customerNumber,
      customerInstagramHandle: conv.customerInstagramHandle,
      salesIntent: conv.salesIntent,
      lastMessage: conv.messages[0]?.messageText || '',
      lastMessageAt: conv.lastMessageAt,
      unreadCount: 0, // You can implement this later
      platform: conv.customerInstagramHandle ? 'instagram' : 'whatsapp'
    }));

    res.json({ success: true, conversations: formatted });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

// Get messages for a specific conversation
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const tenantId = req.user.tenantId;

    // Verify conversation belongs to tenant
    const conversation = await Conversation.findOne({
      where: { id: conversationId, tenantId }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = await Message.findAll({
      where: { conversationId },
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'whatsappNumber']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    const formatted = messages.map(msg => ({
      id: msg.id,
      content: msg.messageText,
      direction: msg.direction,
      isAi: msg.direction === 'outbound' && msg.aiResponse,
      timestamp: msg.createdAt,
      sender: msg.direction === 'inbound' ? 'customer' : 'ai',
      messageType: msg.messageType,
      status: msg.status
    }));

    res.json({ success: true, messages: formatted });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// Send a new message
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, messageText } = req.body;
    const tenantId = req.user.tenantId;
    console.log('Sending message:', { conversationId, tenantId, messageText }); // Debug

    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID not found in user session' });
    }

    const conversation = await Conversation.findOne({
      where: { id: conversationId, tenantId }
    });


        console.log('Getting convo', conversation);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Use your existing sendMessage service
    const { sendMessage } = require('../services/messageservice');
    
    await sendMessage({
      tenantId,
      to: conversation.customerNumber,
      message: messageText,
      conversationId,
      messageType: 'text'
    });

    res.json({ success: true, message: 'Message sent' });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};