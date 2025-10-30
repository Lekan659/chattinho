const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantcontroller');
const getTenantContext = require('../middleware/getTenantContext');

router.post('/', tenantController.createTenant);
router.get('/', tenantController.getAllTenants);
router.put('/:tenantId', tenantController.updateTenant);
router.get('/tenants/:tenantId', tenantController.getTenantById);

module.exports = router;
