import StatusDot from './StatusDot';
import EpgBar from './EpgBar';

export default function ChannelCard({ channel, isActive, onClick }) {
  const primaryLink = channel.links?.find(l => l.isPrimary) || channel.links?.[0];
  const status = primaryLink?.status || 'unknown';

  const initials = channel.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center p-4 rounded-xl transition-all duration-200 ${
        isActive
          ? 'bg-blue-600 ring-2 ring-blue-400 scale-105'
          : 'bg-gray-800 hover:bg-gray-700 hover:scale-102'
      }`}
    >
      <div className="absolute top-2 right-2">
        <StatusDot status={status} />
      </div>

      {channel.logo ? (
        <img
          src={channel.logo}
          alt={channel.name}
          className="w-12 h-12 object-contain rounded-lg mb-2"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      ) : (
        <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center text-sm font-bold text-gray-300 mb-2">
          {initials}
        </div>
      )}

      <span className="text-sm font-medium text-center leading-tight line-clamp-2">
        {channel.name}
      </span>

      <EpgBar epgName={channel.epgName} />
    </button>
  );
}
