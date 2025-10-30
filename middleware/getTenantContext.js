
const { Tenant } = require('../models'); 

async function getTenantContext(req, res, next) {
  try {
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

    req.tenant = tenant; 
    next();
  } catch (error) {
    console.error('Tenant context error:', error);
    res.status(500).json({ error: 'Failed to get tenant context' });
  }
}

module.exports = getTenantContext;
