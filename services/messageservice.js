const { Message } = require('../models'); // Adjust path as needed
const axios = require('axios');
const { Tenant } = require('../models'); // Adjust path based on your project
const { updateUsageStats } = require('./usageservice');
require('dotenv').config(); // Ensure you have dotenv configured


// async function logMessage(tenantId, from, to, text, direction, messageId = null, conversationId = null) {
async function logMessage({
  tenantId,

  fromNumber,
  toNumber,

  messageText,
  direction,
  messageId = null,
  conversationId = null,
  messageType = 'text',
  media = "whatsapp",

  aiTokensUsed = 0,
  status = 'sent'
}) {
  try {
    // await Message.create({
    //   tenantId,
    //   messageId,
    //   fromNumber: from,
    //   toNumber: to,
    //   messageText: text,
    //   direction,
    //   conversationId
    // });

    await Message.create({
  tenantId: tenantId,
        // Should be unique message ID
  fromNumber: fromNumber,
  toNumber: toNumber,
  messageText: messageText, 
  direction: direction, 
  messageId: messageId,   
  conversationId: conversationId,
});

    // Update usage stats (you can import or call the service here)
    await updateUsageStats(tenantId, direction);
  } catch (error) {
    console.error('Error logging message:', error);
  }
}



async function sendMessage({
  tenantId,
  to,
  message,
  conversationId,
  messageType = 'text'
}) {
  try {
    // Get tenant from DB
    const tenant = await Tenant.findOne({
      where: { id: tenantId, status: 'active' }
    });

    if (!tenant) {
      throw new Error('Tenant not found or inactive');
    }

    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: messageType,
      text: { body: message }
    };

    const url = `${process.env.WHATSAPP_API_BASE_URL}/${tenant.whatsappBusinessId}/messages`;
    
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${tenant.whatsappAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Log outbound message
    const whatsappMessageId = response.data?.messages?.[0]?.id;
    // await logMessage(
    //   tenantId,
    //   whatsappMessageId,
    //   tenant.whatsappNumber,
    //   to,
    //   message,
    //   'outbound',
    //   conversationId
    // );

    await logMessage({
  tenantId : tenantId,
  messageId: whatsappMessageId, // Use the ID from the response
  fromNumber: tenant.whatsappNumber,
  toNumber: to,
  messageText: message,
  direction: 'outbound', // <-- Make sure this is correct
  conversationId: conversationId,
}
);

    return response.data;
  } catch (error) {
    console.error('WhatsApp send error:', error.response?.data || error.message);
    throw error;
  }
}



module.exports = { logMessage, sendMessage };
