require('dotenv').config();
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

const crypto = require('crypto');
const { Tenant } = require('../models');
const { 
  processIncomingMessage, 
} = require('../services/webhookservice');

exports.verifyWebhook = async (req, res) => {
    const tenantId = req.params.tenantId || req.body.tenantId || req.headers['x-tenant-id'];

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const tenant = await Tenant.findOne({
      where: {
        id: tenantId,
        status: 'active'
      }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found or inactive' });
    }
  const mode = req.query['hub.mode'];
  const challenge = req.query['hub.challenge'];
  const token = req.query['hub.verify_token'];

  if (mode && token === WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
};

function determinePlatform(payload) {
  if (!payload || !payload.entry?.length) return 'unknown';

  const entry = payload.entry[0];
  const changes = entry.changes?.[0];

  // ✅ WhatsApp
  if (payload.object === 'whatsapp_business_account') {
    return 'whatsapp';
  }

  // // ✅ Instagram DMs (real webhooks use `messaging` array)
  // if (payload.object === 'instagram' && entry.messaging) {
  //           console.log(payload.entry[0].messaging[0].message.attachments[0].payload);
  //   return 'instagram_dm';
  // }

  // // ✅ Instagram Comments
  // if (payload.object === 'instagram' && changes?.field === 'comments') {
  //       console.log(payload.entry[0].changes[0]);
  //   return 'instagram_comment';
  // }

  // // ✅ Instagram Test Webhooks (field = messages but still Instagram)
  // if (payload.object === 'instagram' && changes?.field === 'messages') {
  //   return 'instagram_test_message';
  // }

  return 'unknown';
}

exports.handleIncomingWebhook = async (req, res) => {
  try {
    const tenant = req.tenantId || req.params.tenantId || req.body.tenantId || req.headers['x-tenant-id'];
    if (!tenant) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }
    const signature = req.headers['x-signature']; // Optional for security
    const payload = req.body;
    // console.log(payload.entry[0].changes[0]);
        // console.log(payload.entry[0]);

    // Step 1: Validate tenant
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found or inactive' });
    }

    // Step 2: Verify webhook signature
    if (tenant.webhookSecret && signature) {
      const expectedSig = crypto
        .createHmac('sha256', tenant.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (signature !== expectedSig) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Step 3: Determine platform and route to appropriate handler
    const platform = determinePlatform(payload);

    console.log(`Received webhook for platform: ${platform}`);
    
    switch (platform) {
      case 'whatsapp':
        await processIncomingMessage(tenant, payload);
        break;
      default:
        console.log('Unknown platform or payload format:', payload);
        // Still return success to avoid webhook retries
        break;
    }

    res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};