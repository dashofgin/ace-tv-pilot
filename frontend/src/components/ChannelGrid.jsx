import ChannelCard from './ChannelCard';

export default function ChannelGrid({ channels, activeHash, onSelect, filter }) {
  let filtered = channels;

  if (filter && filter !== 'all') {
    if (filter === 'favorites') {
      filtered = channels.filter(ch => ch.isFavorite);
    } else {
      filtered = channels.filter(ch => ch.category === filter);
    }
  }

  if (!filtered.length) {
    return (
      <div className="text-center text-gray-500 py-12">
        {channels.length === 0
          ? 'Brak kanalow. Dodaj kanaly w zakladce Kanaly.'
          : 'Brak kanalow w tej kategorii.'}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {filtered.map(channel => {
        const primaryLink = channel.links?.find(l => l.isPrimary) || channel.links?.[0];
        return (
          <ChannelCard
            key={channel.id}
            channel={channel}
            isActive={primaryLink?.hash === activeHash}
            onClick={() => onSelect(channel)}
          />
        );
      })}
    </div>
  );
}
