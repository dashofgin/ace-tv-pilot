import { useState, useEffect } from 'react';

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(start, stop) {
  const mins = Math.round((new Date(stop) - new Date(start)) / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default function EpgTimeline({ epgName }) {
  const [data, setData] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!epgName) return;
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/epg/channel/${encodeURIComponent(epgName)}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {}
    }

    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [epgName]);

  // Update "now" every 30s for progress bar
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  if (!data?.now && !data?.schedule?.length) return null;

  const currentProg = data.now;
  const upcoming = (data.schedule || []).filter(p => p !== currentProg).slice(0, 8);

  const currentProgress = currentProg
    ? Math.min(100, Math.round(((now - new Date(currentProg.start)) / (new Date(currentProg.stop) - new Date(currentProg.start))) * 100))
    : 0;

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl mt-3 overflow-hidden">
      {/* Current program - hero section */}
      {currentProg && (
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-semibold rounded-full">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              TERAZ
            </span>
            <span className="text-xs text-gray-500">
              {formatTime(currentProg.start)} - {formatTime(currentProg.stop)}
            </span>
            <span className="text-xs text-gray-600">
              {formatDuration(currentProg.start, currentProg.stop)}
            </span>
          </div>
          <h3 className="text-white font-medium text-sm leading-snug mb-2">
            {currentProg.title}
          </h3>
          <div className="w-full bg-gray-700/50 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-400 h-1.5 rounded-full transition-all duration-1000"
              style={{ width: `${currentProgress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">{formatTime(currentProg.start)}</span>
            <span className="text-xs text-gray-500">{formatTime(currentProg.stop)}</span>
          </div>
        </div>
      )}

      {/* Upcoming programs */}
      {upcoming.length > 0 && (
        <div className="divide-y divide-gray-700/30">
          {upcoming.map((prog, i) => (
            <div
              key={`${prog.start}-${i}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-700/30 transition-colors"
            >
              <span className="text-xs text-gray-500 font-mono w-12 shrink-0">
                {formatTime(prog.start)}
              </span>
              <span className="text-sm text-gray-300 truncate flex-1">
                {prog.title}
              </span>
              <span className="text-xs text-gray-600 shrink-0">
                {formatDuration(prog.start, prog.stop)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
