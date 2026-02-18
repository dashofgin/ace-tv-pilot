import { useState } from 'react';
import { useChannels } from '../hooks/useChannels';
import ChannelTable from '../components/ChannelTable';
import ChannelForm from '../components/ChannelForm';
import SearchPanel from '../components/SearchPanel';

export default function ManagePage() {
  const { channels, loading, addChannel, updateChannel, deleteChannel, checkChannel } = useChannels();
  const [showForm, setShowForm] = useState(false);
  const [editChannel, setEditChannel] = useState(null);
  const [checkingAll, setCheckingAll] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const handleAdd = () => {
    setEditChannel(null);
    setShowForm(true);
  };

  const handleEdit = (channel) => {
    setEditChannel(channel);
    setShowForm(true);
  };

  const handleSave = async (data) => {
    if (editChannel) {
      await updateChannel(editChannel.id, data);
    } else {
      await addChannel(data);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Na pewno usunac ten kanal?')) {
      await deleteChannel(id);
    }
  };

  const handleCheckAll = async () => {
    setCheckingAll(true);
    try {
      await fetch('/api/check', { method: 'POST' });
    } catch {}
    setCheckingAll(false);
  };

  const handleExport = () => {
    window.open('/api/export', '_blank');
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const res = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          window.location.reload();
        }
      } catch (err) {
        alert('Blad importu: ' + err.message);
      }
    };
    input.click();
  };

  if (loading) {
    return <div className="text-center text-gray-400 py-12">Ladowanie...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Kanaly ({channels.length})</h1>
        <div className="flex gap-2 flex-wrap justify-end">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              showSearch ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            Szukaj linkow
          </button>
          <button
            onClick={handleCheckAll}
            disabled={checkingAll}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 rounded-lg transition-colors"
          >
            {checkingAll ? 'Sprawdzanie...' : 'Sprawdz wszystkie'}
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Eksport
          </button>
          <button
            onClick={handleImport}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Import
          </button>
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            Dodaj kanal
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="mb-6">
          <SearchPanel />
        </div>
      )}

      <ChannelTable
        channels={channels}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCheck={checkChannel}
      />

      {showForm && (
        <ChannelForm
          channel={editChannel}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
