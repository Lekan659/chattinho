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

// New Instagram message processing
async function processIncomingInstagramMessage(tenantId, payload) {
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // Instagram messaging structure is different from WhatsApp
    const messaging = value?.messaging?.[0];
    const sender = messaging?.sender;
    const recipient = messaging?.recipient;
    const message = messaging?.message;

    // Extract values
    const customerInstagramId = sender?.id;
    const recipientId = recipient?.id;
    const messageId = message?.mid;
    const messageText = message?.text || '';
    const timestamp = new Date(messaging?.timestamp || Date.now());

    console.log(`Received Instagram message from ${customerInstagramId}:`, value);

    try {
        if (!messageText) return; // Skip non-text messages for now

        // For Instagram, we'll use the Instagram ID as the identifier
        await upsertCustomer({
            tenantId,
            phoneNumber: customerInstagramId, // Using Instagram ID as identifier
            name: 'Instagram User', // Instagram doesn't provide name in messages
            timestamp,
            platform: 'instagram'
        });

        // Get or create conversation context
        const conversation = await getConversationContext(tenantId, customerInstagramId);
        const conversationId = conversation.id;

        await logMessage({
            tenantId: tenantId,
            messageId: messageId,
            fromNumber: customerInstagramId,
            toNumber: recipientId,
            messageText: messageText,
            direction: 'inbound',
            conversationId: conversationId,
            platform: 'instagram'
        });

        // Prepare context for AI response
        const context = conversation.context;

        // Generate AI response
        const aiResponse = await generateResponse(tenantId, messageText, context);

        // Update conversation context
        await updateConversationContext(tenantId, customerInstagramId, messageText, aiResponse);

        const aiMessage = aiResponse?.message || 'ai-response-' + Date.now();

        // Send response via Instagram
        await sendMessage({
            tenantId,
            to: customerInstagramId,
            message: aiMessage,
            conversationId,
            messageType: 'text',
            platform: 'instagram'
        });

        console.log(`Processed Instagram message for tenant ${tenantId} from ${customerInstagramId}`);
    } catch (error) {
        console.error('Instagram message processing error:', error);
    }
}

// New Instagram comment processing
async function processIncomingInstagramComment(tenantId, payload) {
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // Instagram comment structure
    const commentId = value?.id;
    const postId = value?.media?.id || value?.post?.id; // Post ID can be in media or post_id
    const commentText = value?.text || '';
    const commenterId = value?.from?.id;
    const commenterName = value?.from?.name || value?.from?.username || 'Instagram User';
    const timestamp = new Date(value?.created_time || Date.now());

    console.log(`Received Instagram comment from ${commenterName}:`, commentText);

    try {
        if (!commentText) return; // Skip empty comments

            // 1️⃣ Reply publicly to the comment


        // For Instagram comments, we'll use the commenter ID as the identifier
        await upsertCustomer({
            tenantId,
            phoneNumber: commenterId, // Using Instagram ID as identifier
            userName: commenterName,
            timestamp,
            platform: 'instagram'
        });

        // Get or create conversation context (using commenter ID as conversation key)
        const conversation = await getOrCreateConversation({
            tenantId,
            customerNumber: commenterId,
            customerInstagramHandle: commenterName,
            platform: 'instagram'
            });
        const conversationId = conversation.id;

        await logMessage({
            tenantId: tenantId,
            messageId: commentId,
            fromNumber: commenterId,
            toNumber: postId, // The post being commented on
            messageText: commentText,
            direction: 'inbound',
            conversationId: conversationId,
            platform: 'instagram',
            messageType: 'comment'
        });

        await replyToInstagramComment(tenantId, commentId, conversationId);
        // Prepare context for AI response
        const context = conversation.context;

        // Generate AI response
        const aiResponse = await generateResponse(tenantId, commentText, context);

        // Update conversation context
        await updateConversationContext(tenantId, commenterId, commentText, aiResponse);

        const aiMessage = aiResponse?.message || 'Ill get back to you soon' + Date.now();

        // Send response via Instagram comment reply
        await sendMessage({
            tenantId,
            to: commenterId,
            message: aiMessage,
            conversationId,
            messageType: 'comment_reply',
            platform: 'instagram',
            parentId: commentId // For replying to the comment
        });

        console.log(`Processed Instagram comment for tenant ${tenantId} from ${commenterId}`);
    } catch (error) {
        console.error('Instagram comment processing error:', error);
    }
}

module.exports = {
    processIncomingMessage,
    processIncomingInstagramMessage,
    processIncomingInstagramComment
};