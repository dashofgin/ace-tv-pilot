import StatusDot from './StatusDot';

export default function ChannelTable({ channels, onEdit, onDelete, onCheck }) {
  if (!channels.length) {
    return (
      <div className="text-center text-gray-500 py-12">
        Brak kanalow. Kliknij "Dodaj kanal" zeby dodac pierwszy.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400 border-b border-gray-700">
            <th className="pb-2 pr-4">Nazwa</th>
            <th className="pb-2 pr-4">Kategoria</th>
            <th className="pb-2 pr-4">Linki</th>
            <th className="pb-2 pr-4">Status</th>
            <th className="pb-2 text-right">Akcje</th>
          </tr>
        </thead>
        <tbody>
          {channels.map(channel => {
            const primaryLink = channel.links?.find(l => l.isPrimary) || channel.links?.[0];
            return (
              <tr key={channel.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    {channel.isFavorite && <span title="Ulubiony">*</span>}
                    <span className="font-medium">{channel.name}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-gray-400">{channel.category}</td>
                <td className="py-3 pr-4 text-gray-400">{channel.links?.length || 0}</td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <StatusDot status={primaryLink?.status} />
                    {primaryLink?.peers > 0 && (
                      <span className="text-xs text-gray-400">{primaryLink.peers}p</span>
                    )}
                  </div>
                </td>
                <td className="py-3 text-right">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => onCheck(channel.id)}
                      className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                      title="Sprawdz linki"
                    >
                      Sprawdz
                    </button>
                    <button
                      onClick={() => onEdit(channel)}
                      className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                    >
                      Edytuj
                    </button>
                    <button
                      onClick={() => onDelete(channel.id)}
                      className="px-2 py-1 text-xs bg-red-600/80 hover:bg-red-600 rounded transition-colors"
                    >
                      Usun
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
