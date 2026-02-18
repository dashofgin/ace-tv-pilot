const ACESTREAM_URL = process.env.ACESTREAM_URL || 'http://acestream:6878';

// In-memory mapping: hash -> { playbackUrl, sessionPlaybackUrl, statUrl, infohash }
const sessions = new Map();

async function startStream(hash) {
  // Use format=json to get proper session with sliding-window manifest URL
  const url = `${ACESTREAM_URL}/ace/manifest.m3u8?id=${hash}&format=json`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Ace Stream error: ${response.status} ${body}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`Ace Stream error: ${data.error}`);
  }

  const { infohash, playback_url, stat_url, command_url } = data.response;

  if (!playback_url) {
    throw new Error('No playback URL returned from Ace Stream');
  }

  const session = {
    playbackUrl: `/api/stream/manifest/${hash}`,
    sessionPlaybackUrl: playback_url, // internal acestream URL for backend proxy
    statUrl: stat_url,
    commandUrl: command_url,
    infohash,
  };

  sessions.set(hash, session);

  return { playbackUrl: session.playbackUrl, infohash };
}

async function getStats(hash) {
  const session = sessions.get(hash);
  if (!session?.statUrl) return null;

  try {
    const response = await fetch(session.statUrl, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.response || null;
  } catch {
    return null;
  }
}

async function stopStream(hash) {
  const session = sessions.get(hash);
  if (session?.commandUrl) {
    try {
      await fetch(`${session.commandUrl}?method=stop`, {
        signal: AbortSignal.timeout(5000),
      });
    } catch {}
  }
  sessions.delete(hash);
}

async function getVersion() {
  try {
    const url = `${ACESTREAM_URL}/webui/api/service?method=get_version`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function getSession(hash) {
  return sessions.get(hash) || null;
}

module.exports = {
  startStream,
  getStats,
  stopStream,
  getVersion,
  getSession,
  sessions,
};
