// const crypto = require('crypto');
// const { Tenant, UsageStat, Conversation, Message } = require('../models');
const crypto = require('crypto');
const { Tenant } = require('../models');
// Create new tenant
exports.createTenant = async (req, res) => {
  try {
    const {
      businessName,
      contactPerson,
      whatsappNumber,
      businessType,
      subscriptionPlan,
      botInstructions
    } = req.body;

    const webhookSecret = crypto.randomBytes(32).toString('hex');

    const tenant = await Tenant.create({
      businessName,
      contactPerson,
      whatsappNumber,
      businessType,
      subscriptionPlan,
      botInstructions,
      webhookSecret
    });

    res.status(201).json({
      success: true,
      tenant: {
        id: tenant.id,
        businessName: tenant.businessName,
        webhookUrl: `${process.env.BASE_URL || 'https://yourdomain.com'}/webhook/${tenant.id}`,
        webhookSecret: tenant.webhookSecret
      }
    });
  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
};

// Get all tenants + usage
// exports.getAllTenants = async (req, res) => {
//   try {
//     const tenants = await Tenant.findAll({
//       include: [{
//         model: UsageStat,
//         where: { date: new Date().toISOString().slice(0,10) }, // YYYY-MM-DD
//         required: false
//       }],
//       order: [['createdAt', 'DESC']]
//     });

//     const result = tenants.map(t => ({
//       ...t.toJSON(),
//       messages_sent_today: t.UsageStats[0]?.messagesSent || 0,
//       messages_received_today: t.UsageStats[0]?.messagesReceived || 0
//     }));

//     res.json({ success: true, tenants: result });
//   } catch (error) {
//     console.error('Get tenants error:', error);
//     res.status(500).json({ error: 'Failed to get tenants' });
//   }
// };

exports.getAllTenants = async (req, res) => {
  try {
    const tenants = await Tenant.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ success: true, tenants });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
};

// Update tenant
exports.updateTenant = async (req, res) => {
  try {
    const allowedFields = ['businessName', 'contactPerson', 'businessType', 'subscriptionPlan', 'botInstructions', 'status'];
    const updates = {};

    allowedFields.forEach(field => {
      if (req.body[field]) updates[field] = req.body[field];
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    await Tenant.update(updates, {
      where: { id: req.params.tenantId }
    });

    res.json({ success: true, message: 'Tenant updated successfully' });
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
};


exports.updateTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findByPk(req.params.tenantId);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const allowed = ['businessName', 'contactPerson', 'businessType', 'subscriptionPlan', 'botInstructions', 'status'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) tenant[field] = req.body[field];
    });

    await tenant.save();
    res.json({ success: true, message: 'Tenant updated successfully', tenant });
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
};


exports.getTenantById = async (req, res) => {
  try {
    const { tenantId } = req.params;

    const tenant = await Tenant.findByPk(tenantId);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({
      success: true,
      tenant
    });
  } catch (error) {
    console.error('Get tenant by ID error:', error);
    res.status(500).json({ error: 'Failed to retrieve tenant' });
  }
};