const { getChannels, getEpgCache, saveEpgCache } = require('./storage');

// Mapping: epgName (lowercase) → programtv.onet.pl slug
const ONET_SLUGS = {
  'tvp 1': 'tvp-1-321',
  'tvp 2': 'tvp-2-323',
  'tvp 3': 'tvp-3-172',
  'tvp sport': 'tvp-sport-40',
  'tvp hd': 'tvp-hd-101',
  'tvp abc': 'tvp-abc-182',
  'tvn 24': 'tvn-24-347',
  'tvn 7': 'tvn-7-326',
  'polsat': 'polsat-38',
  'polsat sport 1': 'polsat-sport-334',
  'polsat sport 2': 'polsat-sport-extra-485',
  'polsat sport premium 1': 'polsat-sport-premium-1-643',
  'canal+ premium': 'canal-246',
  'canal+ 1': 'canal-1-295',
  'canal+ now': null, // not available on onet
  'canal+ sport': 'canal-sport-14',
  'canal+ sport 2': 'canal-sport-2-15',
  'canal+ sport 3': 'canal-sport-3-674',
  'canal+ sport 4': 'canal-sport-4-675',
  'canal+ sport 5': null, // not available on onet
  'canal+ dokument': 'canal-discovery-307',
  'canal+ family': null, // not available on onet
  'eurosport 1': 'eurosport-1-93',
  'eurosport 2': 'eurosport-2-76',
  'eleven sports 1': 'eleven-208',
  'eleven sports 2': 'eleven-sports-212',
  'eleven sports 3': 'eleven-extra-531',
  'eleven sports 4': 'eleven-sports-4-607',
  'sky sport 1': 'sky-sport-hd-1-445',
  'ale kino+': 'ale-kino-319',
  'cinemax': 'cinemax-59',
  'cinemax2': 'cinemax2-58',
  'hbo2': 'hbo2-24',
  'hbo3': 'hbo-3-25',
  'fx': 'fox-127',
  'fx comedy': 'fox-comedy-75',
  'paramount network': 'paramount-channel-hd-65',
  'discovery channel': 'discovery-channel-202',
  'discovery historia': 'discovery-historia-54',
  'dtx': 'discovery-turbo-xtra-239',
  'national geographic': 'national-geographic-channel-32',
  'national geographic wild': 'nat-geo-wild-77',
  'bbc earth': 'bbc-earth-274',
  'bbc first': 'bbc-hd-261',
  'history': 'history-91',
  'planete+': 'planete-349',
  'travel channel': 'travel-channel-201',
  'adventure': 'adventure-303',
  'animal planet': 'animal-planet-hd-284',
  'nicktoons': 'nickelodeon-hd-44',
  'tv puls': 'tv-puls-332',
  'ttv': 'ttv-624',
};

const ONET_BASE = 'https://programtv.onet.pl/program-tv';

async function fetchChannelFromOnet(slug, epgName, date) {
  const dayOffset = date === 'today' ? 0 : 1;
  const url = `${ONET_BASE}/${slug}?dzien=${dayOffset}`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' },
  });
  if (!response.ok) return [];

  const html = await response.text();

  // Extract hours and titles from HTML
  const hours = [];
  const titles = [];
  const hourRegex = /class="hour">(\d{2}:\d{2})/g;
  const titleRegex = /class="titles"[^>]*>[\s\S]*?<a[^>]*>([^<]+)/g;

  let m;
  while ((m = hourRegex.exec(html)) !== null) hours.push(m[1]);
  while ((m = titleRegex.exec(html)) !== null) titles.push(m[1].trim());

  // Build programs with proper dates
  const now = new Date();
  const baseDate = date === 'today' ? new Date(now) : new Date(now.getTime() + 86400000);
  baseDate.setHours(0, 0, 0, 0);

  const programs = [];
  let prevMinutes = -1;
  let dayAdd = 0;

  for (let i = 0; i < Math.min(hours.length, titles.length); i++) {
    const [h, min] = hours[i].split(':').map(Number);
    const totalMinutes = h * 60 + min;

    // Detect midnight crossing
    if (totalMinutes < prevMinutes && prevMinutes > 0) dayAdd = 1;
    prevMinutes = totalMinutes;

    const start = new Date(baseDate);
    start.setDate(start.getDate() + dayAdd);
    start.setHours(h, min, 0, 0);

    programs.push({
      channel: epgName,
      title: titles[i],
      start: start.toISOString(),
    });
  }

  // Calculate stop times (start of next program)
  for (let i = 0; i < programs.length - 1; i++) {
    programs[i].stop = programs[i + 1].start;
  }
  // Last program: assume 2 hour duration
  if (programs.length > 0) {
    const last = programs[programs.length - 1];
    const lastStop = new Date(new Date(last.start).getTime() + 2 * 3600000);
    last.stop = lastStop.toISOString();
  }

  return programs;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAndParseEPG() {
  const data = getChannels();
  const channelsWithEpg = data.channels.filter(ch => ch.epgName);

  const allPrograms = [];
  let fetched = 0;
  let skipped = 0;

  for (const ch of channelsWithEpg) {
    const name = ch.epgName.toLowerCase();
    const slug = ONET_SLUGS[name];
    if (!slug) {
      skipped++;
      continue;
    }

    try {
      // Fetch today and tomorrow
      const todayProgs = await fetchChannelFromOnet(slug, name, 'today');
      await sleep(500);
      const tomorrowProgs = await fetchChannelFromOnet(slug, name, 'tomorrow');
      await sleep(500);

      allPrograms.push(...todayProgs, ...tomorrowProgs);
      fetched++;
      console.log(`EPG: ${ch.epgName} - ${todayProgs.length + tomorrowProgs.length} programs`);
    } catch (err) {
      console.error(`EPG: ${ch.epgName} failed:`, err.message);
    }
  }

  // Filter to next 24h and deduplicate
  const now = Date.now();
  const next24h = now + 24 * 60 * 60 * 1000;
  const seen = new Set();

  const filtered = allPrograms.filter(p => {
    const stop = new Date(p.stop).getTime();
    const start = new Date(p.start).getTime();
    if (stop < now || start > next24h) return false;
    const key = `${p.channel}|${p.start}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`EPG: ${filtered.length} programs from ${fetched} channels (${skipped} skipped)`);

  const cache = { programs: filtered, updatedAt: new Date().toISOString() };
  saveEpgCache(cache);

  return cache;
}

function getEpgForChannel(epgName) {
  if (!epgName) return { now: null, next: null, schedule: [] };

  const cache = getEpgCache();
  const now = Date.now();
  const name = epgName.toLowerCase();

  const programs = (cache.programs || [])
    .filter(p => p.channel === name)
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
