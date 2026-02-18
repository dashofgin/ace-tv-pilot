const STATUS_CONFIG = {
  ok: { color: 'bg-green-500', label: 'Dostepny', emoji: '' },
  low: { color: 'bg-yellow-500', label: 'Malo peerow', emoji: '' },
  fail: { color: 'bg-red-500', label: 'Niedostepny', emoji: '' },
  unknown: { color: 'bg-gray-500', label: 'Niesprawdzony', emoji: '' },
};

export default function StatusDot({ status = 'unknown' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;

  return (
    <span className="relative group" title={config.label}>
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${config.color}`} />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-700 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {config.label}
      </span>
    </span>
  );
}
