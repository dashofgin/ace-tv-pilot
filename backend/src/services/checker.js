const acestream = require('./acestream');
const { getChannels, saveChannels } = require('./storage');

let isChecking = false;
let checkProgress = { running: false, current: 0, total: 0, channel: '' };

function getCheckStatus() {
  return checkProgress;
}

async function checkLink(hash) {
  try {
    await acestream.startStream(hash);

    // Wait for P2P peers to gather before checking stats
    await new Promise(resolve => setTimeout(resolve, 15000));

    let peers = 0;
    let status = 'fail';

    const stats = await acestream.getStats(hash);
    if (stats) {
      peers = stats.peers || 0;
      if (peers >= 5) status = 'ok';
      else if (peers >= 1) status = 'low';
      else status = 'fail';
    }

    await acestream.stopStream(hash);
    return { status, peers, lastCheck: new Date().toISOString() };
  } catch {
    return { status: 'fail', peers: 0, lastCheck: new Date().toISOString() };
  }
}

async function checkChannel(channelId) {
  const data = getChannels();
  const channel = data.channels.find(ch => ch.id === channelId);
  if (!channel) return null;

  for (const link of channel.links) {
    const result = await checkLink(link.hash);
    link.status = result.status;
    link.peers = result.peers;
    link.lastCheck = result.lastCheck;
    // Wait between checks
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  saveChannels(data);
  return channel;
}

async function checkAll() {
  if (isChecking) return;
  isChecking = true;

  const data = getChannels();
  const channels = data.channels;
  checkProgress = { running: true, current: 0, total: channels.length, channel: '' };

  try {
    for (let i = 0; i < channels.length; i++) {
      const channel = channels[i];
      checkProgress.current = i + 1;
      checkProgress.channel = channel.name;

      for (const link of channel.links) {
        const result = await checkLink(link.hash);
        link.status = result.status;
        link.peers = result.peers;
        link.lastCheck = result.lastCheck;
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    saveChannels(data);
  } finally {
    isChecking = false;
    checkProgress = { running: false, current: 0, total: 0, channel: '' };
  }
}

module.exports = { checkLink, checkChannel, checkAll, getCheckStatus };
