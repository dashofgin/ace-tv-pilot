import { useState, useEffect } from 'react';

export default function EpgBar({ epgName }) {
  const [program, setProgram] = useState(null);

  useEffect(() => {
    if (!epgName) return;

    let cancelled = false;

    async function fetchEpg() {
      try {
        const res = await fetch(`/api/epg/channel/${encodeURIComponent(epgName)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setProgram(data);
      } catch {
        // ignore
      }
    }

    fetchEpg();
    // Refresh every 5 minutes
    const interval = setInterval(fetchEpg, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [epgName]);

  if (!epgName || !program?.now) return null;

  const start = new Date(program.now.start);
  const stop = new Date(program.now.stop);
  const now = Date.now();
  const progress = Math.round(((now - start) / (stop - start)) * 100);

  return (
    <div className="w-full mt-1">
      <div className="text-xs text-gray-400 truncate" title={program.now.title}>
        {program.now.title}
      </div>
      <div className="w-full bg-gray-700 rounded-full h-1 mt-0.5">
        <div
          className="bg-blue-500 h-1 rounded-full"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}
