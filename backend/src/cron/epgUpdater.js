const cron = require('node-cron');
const { fetchAndParseEPG } = require('../services/epg');

// Update EPG every 12 hours
cron.schedule('0 */12 * * *', async () => {
  console.log('Cron: Starting EPG update...');
  try {
    await fetchAndParseEPG();
    console.log('Cron: EPG update completed');
  } catch (err) {
    console.error('Cron: EPG update error:', err.message);
  }
}, { timezone: 'Europe/Warsaw' });

console.log('Cron: EPG updater scheduled (every 12h)');
