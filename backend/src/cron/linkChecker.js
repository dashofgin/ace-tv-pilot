const cron = require('node-cron');
const { checkAll } = require('../services/checker');

// Check all links daily at 6:00 AM
cron.schedule('0 6 * * *', async () => {
  console.log('Cron: Starting daily link check...');
  try {
    await checkAll();
    console.log('Cron: Daily link check completed');
  } catch (err) {
    console.error('Cron: Link check error:', err.message);
  }
}, { timezone: 'Europe/Warsaw' });

console.log('Cron: Link checker scheduled (daily 6:00 AM)');
