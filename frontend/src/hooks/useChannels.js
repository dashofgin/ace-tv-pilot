import { useState, useEffect, useCallback } from 'react';

export function useChannels() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch('/api/channels');
      if (res.ok) {
        const data = await res.json();
        setChannels(data);
      }
    } catch (err) {
      console.error('Fetch channels error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const addChannel = async (channel) => {
    const res = await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(channel),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    await fetchChannels();
    return await res.json();
  };

  const updateChannel = async (id, channel) => {
    const res = await fetch(`/api/channels/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(channel),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    await fetchChannels();
  };

  const deleteChannel = async (id) => {
    const res = await fetch(`/api/channels/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    await fetchChannels();
  };

  const checkChannel = async (id) => {
    const res = await fetch(`/api/check/${id}`, { method: 'POST' });
    if (res.ok) {
      await fetchChannels();
    }
  };

  return { channels, loading, fetchChannels, addChannel, updateChannel, deleteChannel, checkChannel };
}
