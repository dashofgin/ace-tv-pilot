import { useState, useEffect } from 'react';

const CATEGORIES = [
  { value: 'tv', label: 'TV' },
  { value: 'sport', label: 'Sport' },
  { value: 'news', label: 'Wiadomosci' },
  { value: 'kids', label: 'Dla dzieci' },
  { value: 'movies', label: 'Filmy' },
  { value: 'other', label: 'Inne' },
];

export default function ChannelForm({ channel, onSave, onClose }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('tv');
  const [logo, setLogo] = useState('');
  const [epgName, setEpgName] = useState('');
  const [linksText, setLinksText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isEdit = !!channel;

  useEffect(() => {
    if (channel) {
      setName(channel.name || '');
      setCategory(channel.category || 'tv');
      setLogo(channel.logo || '');
      setEpgName(channel.epgName || '');
      setLinksText(
        (channel.links || [])
          .map(l => `${l.hash}${l.label ? ` | ${l.label}` : ''}`)
          .join('\n')
      );
    }
  }, [channel]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Podaj nazwe kanalu');
      return;
    }

    const lines = linksText.trim().split('\n').filter(Boolean);
    if (!lines.length) {
      setError('Podaj przynajmniej jeden link acestream');
      return;
    }

    const links = lines.map((line) => {
      const parts = line.split('|').map(s => s.trim());
      return {
        hash: parts[0],
        label: parts[1] || '',
      };
    });

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        category,
        logo: logo.trim(),
        epgName: epgName.trim(),
        links,
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {isEdit ? 'Edytuj kanal' : 'Dodaj kanal'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nazwa *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 text-white focus:outline-none focus:border-blue-500"
              placeholder="np. TVP Sport"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Kategoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 text-white focus:outline-none focus:border-blue-500"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Logo URL</label>
            <input
              type="text"
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 text-white focus:outline-none focus:border-blue-500"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Nazwa EPG</label>
            <input
              type="text"
              value={epgName}
              onChange={(e) => setEpgName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 text-white focus:outline-none focus:border-blue-500"
              placeholder="np. TVPSport.pl"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Linki acestream * <span className="text-gray-500">(jeden na linie, opcjonalnie: hash | etykieta)</span>
            </label>
            <textarea
              value={linksText}
              onChange={(e) => setLinksText(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
              rows={4}
              placeholder={"acestream://abc123... | glowny\nabc456... | zapasowy"}
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              {saving ? 'Zapisywanie...' : 'Zapisz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
