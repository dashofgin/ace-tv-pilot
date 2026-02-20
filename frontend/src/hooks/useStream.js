import { useState, useRef, useCallback, useEffect } from 'react';

export function useStream() {
  const [playbackUrl, setPlaybackUrl] = useState(null);
  const [activeHash, setActiveHash] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const statsInterval = useRef(null);

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

    try {
      const res = await fetch(`/api/stream/start/${hash}`, { method: 'POST' });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error: ${res.status}`);
      }

      const data = await res.json();

      if (!data.playbackUrl) {
        throw new Error('No playback URL returned');
      }

      setPlaybackUrl(data.playbackUrl);
      setActiveHash(hash);

      // Poll stats through backend
      statsInterval.current = setInterval(async () => {
        try {
          const statsRes = await fetch(`/api/stream/stats/${hash}`);
          if (statsRes.ok) {
            const statsData = await statsRes.json();
            setStats(statsData);
          }
        } catch {}
      }, 3000);
    } catch (err) {
      setError(err.message);
      setPlaybackUrl(null);
    } finally {
      setLoading(false);
    }
  }, [stopPolling]);

  const stopStream = useCallback(async () => {
    stopPolling();
    if (activeHash) {
      fetch(`/api/stream/stop/${activeHash}`, { method: 'POST' }).catch(() => {});
    }
    setPlaybackUrl(null);
    setActiveHash(null);
    setStats(null);
    setError(null);
  }, [stopPolling, activeHash]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return { playbackUrl, activeHash, stats, loading, error, startStream, stopStream };
}
