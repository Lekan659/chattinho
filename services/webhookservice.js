const { generateResponse } = require("./aiservice");
const { getConversationContext, updateConversationContext } = require("./conversationservice");
const { upsertCustomer } = require("./customerservice");
const { sendMessage, logMessage } = require("./messageservice");

// Original WhatsApp message processing
async function processIncomingMessage(tenantId, payload) {
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    const contact = value?.contacts?.[0];
    const message = value?.messages?.[0];

    const name = contact?.profile?.name || 'Unknown';
    const customerNumber = contact?.wa_id;
    const messageId = message?.id;
    const messageTo = value?.metadata?.display_phone_number || 'unknown';
    const messageText = message?.text?.body || '';
    const timestamp = new Date();
    
    console.log(`Received WhatsApp message from ${customerNumber}:`, value);
    
    try {
        if (!messageText) return;

        // 1. Upsert customer and get the customer object
        const customer = await upsertCustomer({
            tenantId,
            phoneNumber: customerNumber,
            name,
            timestamp
        });

        const customerId = customer.id; // Get the actual customer ID

        // 2. Get or create conversation context
        const conversation = await getConversationContext(tenantId, customerNumber);
        const conversationId = conversation.id;

        // 3. Log incoming message
        await logMessage({
            tenantId: tenantId,
            messageId: messageId,
            fromNumber: customerNumber,
            toNumber: messageTo,
            messageText: messageText,
            direction: 'inbound',
            conversationId: conversationId,
        });

        // 4. Prepare context for AI response
        const context = conversation.context;

        // 5. Generate AI response with customerId
        const aiResponse = await generateResponse(
            tenantId, 
            messageText, 
            context, 
            customerId // Pass the actual customer ID
        );

        // 6. Update conversation context
        await updateConversationContext(tenantId, customerNumber, messageText, aiResponse);

        const aiMessage = aiResponse?.message || 'ai-response-' + Date.now();

        // 7. Send response via WhatsApp
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