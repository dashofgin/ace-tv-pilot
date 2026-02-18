const { XMLParser } = require('fast-xml-parser');
const { getChannels, getEpgCache, saveEpgCache } = require('./storage');

const EPG_URL = process.env.EPG_URL || 'https://epg.ovh/pl.xml';

async function fetchAndParseEPG() {
  console.log('Fetching EPG from:', EPG_URL);

  const response = await fetch(EPG_URL, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) {
    throw new Error(`EPG fetch error: ${response.status}`);
  }

  const xml = await response.text();
  console.log(`EPG XML fetched, size: ${(xml.length / 1024 / 1024).toFixed(1)}MB`);

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  const parsed = parser.parse(xml);
  const tv = parsed.tv || {};
  const rawPrograms = tv.programme || [];
  const programs = Array.isArray(rawPrograms) ? rawPrograms : [rawPrograms];

  // Get channel epgNames from our channels
  const data = getChannels();
  const epgNames = new Set(
    data.channels
      .filter(ch => ch.epgName)
      .map(ch => ch.epgName.toLowerCase())
  );

  const now = Date.now();
  const next24h = now + 24 * 60 * 60 * 1000;

  const filtered = [];

  for (const prog of programs) {
    const channelId = (prog['@_channel'] || '').toLowerCase();

    // Match against our channel epgNames
    let matched = false;
    for (const epgName of epgNames) {
      if (channelId.includes(epgName.toLowerCase()) || epgName.toLowerCase().includes(channelId)) {
        matched = true;
        break;
      }
    }
    if (!matched) continue;

    const start = parseEpgDate(prog['@_start']);
    const stop = parseEpgDate(prog['@_stop']);

    if (!start || !stop) continue;
    if (stop.getTime() < now || start.getTime() > next24h) continue;

    filtered.push({
      channel: prog['@_channel'],
      title: typeof prog.title === 'object' ? prog.title['#text'] || '' : prog.title || '',
      start: start.toISOString(),
      stop: stop.toISOString(),
    });
  }

  console.log(`EPG: ${filtered.length} programs matched for next 24h`);

  const cache = { programs: filtered, updatedAt: new Date().toISOString() };
  saveEpgCache(cache);

  return cache;
}

function parseEpgDate(str) {
  if (!str) return null;
  // Format: "20250217060000 +0100"
  const match = str.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/);
  if (!match) return null;
  const [, y, m, d, h, min, s, tz] = match;
  const dateStr = `${y}-${m}-${d}T${h}:${min}:${s}${tz ? tz.replace(/(\d{2})(\d{2})/, '$1:$2') : '+00:00'}`;
  return new Date(dateStr);
}

function getEpgForChannel(epgName) {
  if (!epgName) return { now: null, next: null, schedule: [] };

  const cache = getEpgCache();
  const now = Date.now();

  const programs = (cache.programs || [])
    .filter(p => {
      const ch = p.channel.toLowerCase();
      const name = epgName.toLowerCase();
      return ch.includes(name) || name.includes(ch);
    })
    .sort((a, b) => new Date(a.start) - new Date(b.start));

  let currentProg = null;
  let nextProg = null;
  const schedule = [];

  for (const p of programs) {
    const start = new Date(p.start).getTime();
    const stop = new Date(p.stop).getTime();

    if (start <= now && stop > now) {
      currentProg = p;
      schedule.push(p);
    } else if (start > now) {
      if (!nextProg) nextProg = p;
      schedule.push(p);
    }
  }

  return { now: currentProg, next: nextProg, schedule };
}

module.exports = { fetchAndParseEPG, getEpgForChannel };
