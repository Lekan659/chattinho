const { Op } = require('sequelize');
const {UsageStat} = require('../models'); // Adjust path as needed

async function updateUsageStats(tenantId, direction) {
  const column = direction === 'inbound' ? 'messagesReceived' : 'messagesSent';

  const today = new Date().toISOString().slice(0, 10); // Format: YYYY-MM-DD

  // Try to find an existing record for today
  const [usageStat, created] = await UsageStat.findOrCreate({
    where: {
      tenantId,
      date: today
    },
    defaults: {
      [column]: 1
    }
  });

  // If it already existed, increment the right counter
  if (!created) {
    usageStat[column] += 1;
    await usageStat.save();
  }
}

module.exports = { updateUsageStats };