const { Customer } = require('../models');

async function upsertCustomer({ tenantId, phoneNumber, name, timestamp = new Date() }) {
  try {
    const [customer, created] = await Customer.findOrCreate({
      where: {
        tenantId,
        whatsappNumber: phoneNumber
      },
      defaults: {
        name,
        lastMessageAt: timestamp
      }
    });

    // Update if name or lastMessageAt needs to change
    let needsUpdate = false;

    if (!created) {
      if (name && customer.name !== name) {
        customer.name = name;
        needsUpdate = true;
      }

      if (!customer.lastMessageAt || new Date(customer.lastMessageAt) < timestamp) {
        customer.lastMessageAt = timestamp;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await customer.save();
      }
    }

    return customer;
  } catch (error) {
    console.error('Upsert customer error:', error);
    throw error;
  }
}

module.exports = {
  upsertCustomer
};
