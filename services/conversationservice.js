const { Conversation } = require('../models'); // adjust path as needed

async function getConversationContext(tenantId, customerNumber, customerInstagramHandle = null) {
  try {
    const conversation = await Conversation.findOne({
      where: {
        tenantId,
        ...(customerNumber ? { customerNumber } : {}),
        ...(customerInstagramHandle ? { customerInstagramHandle } : {})
      }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        tenantId,
        customerNumber,
        customerInstagramHandle
      });
    }

    return conversation;
  } catch (error) {
    console.error('Context retrieval error:', error);
    return {};
  }
}

async function updateConversationContext(tenantId, customerNumber, userMessage, botResponse) {
  console.log('Updating conversation context for:', tenantId, customerNumber);
  try {
    let conversation = await Conversation.findOne({
      where: { tenantId, customerNumber }
    });

    // Create a deep copy of context
    let context = conversation?.context ? JSON.parse(JSON.stringify(conversation.context)) : {};

    if (!context.history) context.history = [];
    context.history.push({
      user: userMessage,
      bot: botResponse,
      timestamp: new Date()
    });

    if (context.history.length > 10) {
      context.history = context.history.slice(-10);
    }

    context.last_interaction = new Date();

    if (conversation) {
      await conversation.update({
        context,
        lastMessageAt: new Date()
      });
      console.log('Context updated successfully');
    } else {
      await Conversation.create({
        tenantId,
        customerNumber,
        context,
        lastMessageAt: new Date()
      });
      console.log('New conversation created');
    }
  } catch (error) {
    console.error('Context update error:', error);
    throw error; // Re-throw to see if this is actually failing
  }
}

module.exports = { 
  getConversationContext,
  updateConversationContext
};
