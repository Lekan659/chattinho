const { generateResponse } = require("./aiservice");
const { getConversationContext, updateConversationContext } = require("./conversationservice");
const { upsertCustomer } = require("./customerservice");
const { sendMessage, logMessage } = require("./messageservice");

async function processIncomingMessage(tenantId, payload) {
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    const contact = value?.contacts?.[0];
    const message = value?.messages?.[0];

    // Extract values
    const name = contact?.profile?.name || 'Unknown';
    const customerNumber = contact?.wa_id;

    const messageId = message?.id;

    const messageTo = value?.metadata?.display_phone_number || 'unknown';

    const messageText = message?.text?.body || '';
    // const messageType = message.type;
    const timestamp = message?.timestamp ? new Date(parseInt(message.timestamp) * 1000) : new Date();

    console.log(`Received WhatsApp message from ${customerNumber}:`, value);
    
    try {
        if (!messageText) return; // Skip non-text messages for now

        await upsertCustomer({
            tenantId,
            phoneNumber: customerNumber,
            name,
            timestamp
        });

        // Get or create conversation context
        const conversation = await getConversationContext(tenantId, customerNumber);
        const conversationId = conversation.id;

        await logMessage({
            tenantId: tenantId,
            messageId: messageId,
            fromNumber: customerNumber,
            toNumber: messageTo,
            messageText: messageText,
            direction: 'inbound',
            conversationId: conversationId,
        });

        // Prepare context for AI response
        const context = conversation.context;

        // Generate AI response
        const aiResponse = await generateResponse(tenantId, messageText, context);

        // Update conversation context
        await updateConversationContext(tenantId, customerNumber, messageText, aiResponse);

        const aiMessage = aiResponse?.message || 'ai-response-' + Date.now();

        // Send response via WhatsApp
        await sendMessage({
            tenantId,
            to: customerNumber,
            message: aiMessage,
            conversationId,
            messageType: 'text'
        });

        console.log(`Processed WhatsApp message for tenant ${tenantId} from ${customerNumber}`);
    } catch (error) {
        console.error('WhatsApp message processing error:', error);
    }
}
module.exports = {
    processIncomingMessage,
};