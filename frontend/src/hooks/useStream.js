import { useState, useRef, useCallback, useEffect } from 'react';

export function useStream() {
  const [playbackUrl, setPlaybackUrl] = useState(null);
  const [activeHash, setActiveHash] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const statsInterval = useRef(null);
  const statUrlRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (statsInterval.current) {
      clearInterval(statsInterval.current);
      statsInterval.current = null;
    }
  }, []);

  const startStream = useCallback(async (hash) => {
    setLoading(true);
    setError(null);
    setStats(null);
    stopPolling();
    statUrlRef.current = null;

    try {
      // No transcode_audio - our proxy handles MP2→AAC via ffmpeg
      const res = await fetch(`/ace/manifest.m3u8?id=${hash}&format=json`);

      if (!res.ok) {
        throw new Error(`AceStream error: ${res.status}`);
      }

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const pbUrl = data.response?.playback_url || data.playback_url;
      const stUrl = data.response?.stat_url || data.stat_url;

      if (!pbUrl) {
        throw new Error('No playback URL returned');
      }

      setPlaybackUrl(pbUrl);
      setActiveHash(hash);
      statUrlRef.current = stUrl;

      // Start polling stats
      if (stUrl) {
        statsInterval.current = setInterval(async () => {
          try {
            const statsRes = await fetch(stUrl);
            if (statsRes.ok) {
              const statsData = await statsRes.json();
              setStats(statsData.response || statsData);
            }
          } catch {}
        }, 3000);
      }
    } catch (err) {
      setError(err.message);
      setPlaybackUrl(null);
    } finally {
      setLoading(false);
    }
  }, [stopPolling]);

  const stopStream = useCallback(async () => {
    stopPolling();
    setPlaybackUrl(null);
    setActiveHash(null);
    setStats(null);
    setError(null);
    statUrlRef.current = null;
  }, [stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return { playbackUrl, activeHash, stats, loading, error, startStream, stopStream };
}
