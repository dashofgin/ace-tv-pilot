import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

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

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

export default function GuidePage() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState([]);
  const [epgData, setEpgData] = useState(null);
  const [filter, setFilter] = useState('all');
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [chRes, epgRes] = await Promise.all([
          fetch('/api/channels'),
          fetch('/api/epg'),
        ]);
        const chData = await chRes.json();
        const epg = await epgRes.json();
        setChannels(Array.isArray(chData) ? chData : chData.channels || []);
        setEpgData(epg);
      } catch {}
      setLoading(false);
    }
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredChannels = channels
    .filter(ch => filter === 'all' || (filter === 'favorites' ? ch.isFavorite : ch.category === filter))
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  // Build per-channel EPG lookup (memoized - 1310+ programs)
  const channelEpg = useMemo(() => {
    const map = {};
    if (epgData?.programs) {
      for (const p of epgData.programs) {
        const key = p.channel;
        if (!map[key]) map[key] = [];
        map[key].push(p);
      }
      for (const key of Object.keys(map)) {
        map[key].sort((a, b) => new Date(a.start) - new Date(b.start));
      }
    }
    return map;
  }, [epgData]);

  function getChannelPrograms(epgName) {
    if (!epgName) return { current: null, upcoming: [] };
    const programs = channelEpg[epgName.toLowerCase()] || [];
    let current = null;
    const upcoming = [];

    for (const p of programs) {
      const start = new Date(p.start).getTime();
      const stop = new Date(p.stop).getTime();
      if (start <= now && stop > now) {
        current = p;
      } else if (start > now && upcoming.length < 3) {
        upcoming.push(p);
      }
    }
    return { current, upcoming };
  }

  if (loading) {
    return <div className="text-center text-gray-400 py-12">Ladowanie programu TV...</div>;
  }

  const updatedAt = epgData?.updatedAt
    ? new Date(epgData.updatedAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
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
        {updatedAt && (
          <span className="text-xs text-gray-500 shrink-0 ml-4">
            Aktualizacja: {updatedAt}
          </span>
        )}
      </div>

      {/* Channel list */}
      <div className="space-y-1">
        {filteredChannels.map(ch => {
          const { current, upcoming } = getChannelPrograms(ch.epgName);
          const progress = current
            ? Math.min(100, Math.round(((now - new Date(current.start)) / (new Date(current.stop) - new Date(current.start))) * 100))
            : 0;

          return (
            <div
              key={ch.id}
              onClick={() => navigate('/watch', { state: { channelId: ch.id } })}
              className="bg-gray-800/80 rounded-lg p-3 hover:bg-gray-700/80 cursor-pointer transition-colors flex gap-3"
            >
              {/* Channel logo + name */}
              <div className="w-20 shrink-0 flex flex-col items-center justify-center gap-1">
                {ch.logo ? (
                  <img
                    src={ch.logo}
                    alt={ch.name}
                    className="w-8 h-8 object-contain rounded"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center text-xs text-gray-400 font-bold">
                    {ch.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="text-xs text-gray-400 text-center leading-tight truncate w-full">
                  {ch.name}
                </span>
              </div>

              {/* EPG info */}
              <div className="flex-1 min-w-0">
                {current ? (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-semibold rounded-full">
                        <span className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
                        TERAZ
                      </span>
                      <span className="text-sm text-white font-medium truncate">
                        {current.title}
                      </span>
                      <span className="text-xs text-gray-500 shrink-0 ml-auto">
                        {formatTime(current.start)} - {formatTime(current.stop)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700/50 rounded-full h-1 mb-1.5">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-400 h-1 rounded-full transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {upcoming.length > 0 && (
                      <div className="flex gap-3 text-xs text-gray-500 truncate">
                        {upcoming.map((p, i) => (
                          <span key={i} className="truncate">
                            <span className="text-gray-600">{formatTime(p.start)}</span>{' '}
                            {p.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                ) : upcoming.length > 0 ? (
                  <div className="text-sm text-gray-400 pt-1">
                    <span className="text-xs text-gray-600">Nastepnie: </span>
                    {upcoming.map((p, i) => (
                      <span key={i} className="mr-3">
                        <span className="text-gray-500">{formatTime(p.start)}</span>{' '}
                        {p.title}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 pt-1">Brak danych EPG</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
