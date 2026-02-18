const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON(filename) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (filename === 'channels.json') return { channels: [] };
    if (filename === 'epg-cache.json') return { programs: [] };
    if (filename === 'history.json') return { history: [] };
    return {};
  }
}

function writeJSON(filename, data) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  const tmpPath = filePath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

function getChannels() {
  return readJSON('channels.json');
}

function saveChannels(data) {
  writeJSON('channels.json', data);
}

function getEpgCache() {
  return readJSON('epg-cache.json');
}

function saveEpgCache(data) {
  writeJSON('epg-cache.json', data);
}

function getHistory() {
  return readJSON('history.json');
}

function saveHistory(data) {
  writeJSON('history.json', data);
}

module.exports = {
  readJSON,
  writeJSON,
  getChannels,
  saveChannels,
  getEpgCache,
  saveEpgCache,
  getHistory,
  saveHistory,
};
