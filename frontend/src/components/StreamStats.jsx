export default function StreamStats({ stats }) {
  if (!stats) return null;

  return (
    <div className="flex items-center gap-4 text-sm text-gray-400 px-2 py-1">
      <span>Status: <span className="text-white">{stats.status || '-'}</span></span>
      <span>Peers: <span className="text-white">{stats.peers ?? '-'}</span></span>
      <span>Predkosc: <span className="text-white">{stats.speed_down ? `${Math.round(stats.speed_down)} KB/s` : '-'}</span></span>
      {stats.downloaded && (
        <span>Pobrano: <span className="text-white">{(stats.downloaded / 1024 / 1024).toFixed(1)} MB</span></span>
      )}
    </div>
  );
}
