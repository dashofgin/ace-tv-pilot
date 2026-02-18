import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useChannels } from '../hooks/useChannels';
import { useStream } from '../hooks/useStream';
import ChannelGrid from '../components/ChannelGrid';
import VideoPlayer from '../components/VideoPlayer';
import StreamStats from '../components/StreamStats';
import EpgTimeline from '../components/EpgTimeline';

const CATEGORIES = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'favorites', label: 'Ulubione' },
  { value: 'tv', label: 'TV' },
  { value: 'sport', label: 'Sport' },
  { value: 'news', label: 'Wiadomosci' },
  { value: 'kids', label: 'Dla dzieci' },
  { value: 'movies', label: 'Filmy' },
  { value: 'other', label: 'Inne' },
];

export default function WatchPage() {
  const { channels, loading } = useChannels();
  const { playbackUrl, activeHash, stats, loading: streamLoading, error, startStream, stopStream } = useStream();
  const [filter, setFilter] = useState('all');
  const [activeChannel, setActiveChannel] = useState(null);
  const location = useLocation();

  // Auto-select channel when navigating from Telegazeta
  useEffect(() => {
    const channelId = location.state?.channelId;
    if (channelId && channels.length > 0 && !activeChannel) {
      const ch = channels.find(c => c.id === channelId);
      if (ch) {
        const primaryLink = ch.links?.find(l => l.isPrimary) || ch.links?.[0];
        if (primaryLink) {
          setActiveChannel(ch);
          startStream(primaryLink.hash);
        }
      }
    }
  }, [channels, location.state]);

  const handleSelect = (channel) => {
    const primaryLink = channel.links?.find(l => l.isPrimary) || channel.links?.[0];
    if (!primaryLink) return;
    setActiveChannel(channel);
    startStream(primaryLink.hash);
  };

  const handleCopyVLC = () => {
    if (!activeHash) return;
    const url = `${window.location.protocol}//${window.location.hostname}:6878/ace/getstream?id=${activeHash}`;
    navigator.clipboard.writeText(url).catch(() => {});
  };

  if (loading) {
    return <div className="text-center text-gray-400 py-12">Ladowanie kanalow...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* Video player */}
      {(playbackUrl || streamLoading || error) && (
        <div className="mb-4">
          {streamLoading && (
            <div className="bg-gray-800 rounded-xl aspect-video flex items-center justify-center">
              <div className="text-gray-400">Uruchamianie streamu{activeChannel ? `: ${activeChannel.name}` : ''}...</div>
            </div>
          )}
          {error && (
            <div className="bg-gray-800 rounded-xl aspect-video flex items-center justify-center">
              <div className="text-red-400">{error}</div>
            </div>
          )}
          {playbackUrl && !streamLoading && (
            <>
              <VideoPlayer playbackUrl={playbackUrl} />
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3">
                  {activeChannel && (
                    <span className="text-white font-medium">{activeChannel.name}</span>
                  )}
                  <StreamStats stats={stats} />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyVLC}
                    className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    title="Kopiuj link do VLC"
                  >
                    VLC
                  </button>
                  <button
                    onClick={stopStream}
                    className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    Stop
                  </button>
                </div>
              </div>
              {activeChannel?.epgName && (
                <EpgTimeline epgName={activeChannel.epgName} />
              )}
            </>
          )}
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setFilter(cat.value)}
            className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${
              filter === cat.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Channel grid */}
      <ChannelGrid
        channels={channels}
        activeHash={activeHash}
        onSelect={handleSelect}
        filter={filter}
      />
    </div>
  );
}
