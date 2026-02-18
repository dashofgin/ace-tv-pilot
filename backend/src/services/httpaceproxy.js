const HTTPACEPROXY_URL = process.env.HTTPACEPROXY_URL || 'http://httpaceproxy:8888';

async function getSportsChannels() {
  try {
    const response = await fetch(`${HTTPACEPROXY_URL}/channels`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

module.exports = { getSportsChannels };
