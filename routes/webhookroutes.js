const express = require('express');
const { verifyWebhook, handleIncomingWebhook } = require('../controllers/webhookcontroller');
const getTenantContext = require('../middleware/getTenantContext');
const router = express.Router();

router.get('/:tenantId', getTenantContext, verifyWebhook);

router.post('/:tenantId',getTenantContext , handleIncomingWebhook);

module.exports = router;
