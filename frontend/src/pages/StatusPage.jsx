import { useState, useEffect } from 'react';

function formatDuration(startedAt) {
  const ms = Date.now() - new Date(startedAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}min`;
}

function formatSpeed(bytesPerSec) {
  if (!bytesPerSec) return '0 KB/s';
  const kb = bytesPerSec / 1024;
  if (kb > 1024) return `${(kb / 1024).toFixed(1)} MB/s`;
  return `${Math.round(kb)} KB/s`;
}

export default function StatusPage() {
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [userMsg, setUserMsg] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [streamRes, usersRes] = await Promise.all([
          fetch('/api/stream/active'),
          fetch('/api/auth/users'),
        ]);
        if (streamRes.ok) setData(await streamRes.json());
        if (usersRes.ok) {
          const d = await usersRes.json();
          setUsers(d.users || []);
        }
      } catch (err) {
        console.error('StatusPage: failed to load', err);
      }
      setLoading(false);
    }
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  async function handleAddUser(e) {
    e.preventDefault();
    setUserMsg(null);
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUser, password: newPass }),
      });
      const data = await res.json();
      if (res.ok) {
        setUserMsg({ ok: true, text: data.message });
        setNewUser('');
        setNewPass('');
        // Refresh user list
        const usersRes = await fetch('/api/auth/users');
        if (usersRes.ok) {
          const d = await usersRes.json();
          setUsers(d.users || []);
        }
      } else {
        setUserMsg({ ok: false, text: data.error });
      }
    } catch {
      setUserMsg({ ok: false, text: 'Blad polaczenia' });
    }
  }

  async function handleDeleteUser(username) {
    if (!confirm(`Usunac uzytkownika "${username}"?`)) return;
    try {
      const res = await fetch(`/api/auth/users/${encodeURIComponent(username)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setUsers(users.filter(u => u.username !== username));
      }
    } catch {}
  }

  if (loading) {
    return <div className="text-center text-gray-400 py-12">Ladowanie...</div>;
  }

  const streams = data?.streams || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      {/* Active streams */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-white">
          Aktywne streamy
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({streams.length})
          </span>
        </h1>
        <span className="text-xs text-gray-600">Auto-odswiezanie co 10s</span>
      </div>

      {streams.length === 0 ? (
        <div className="bg-gray-800/80 rounded-lg p-8 text-center mb-8">
          <div className="text-gray-500 text-lg mb-1">Brak aktywnych streamow</div>
          <div className="text-gray-600 text-sm">Nikt aktualnie nie oglada</div>
        </div>
      ) : (
        <div className="space-y-2 mb-8">
          {streams.map(s => (
            <div
              key={s.hash}
              className="bg-gray-800/80 rounded-lg p-4 flex items-center gap-4"
            >
              <div className="w-28 shrink-0">
                <div className="text-sm font-medium text-blue-400">
                  {s.username || '?'}
                </div>
                <div className="text-xs text-gray-600">
                  {formatDuration(s.startedAt)}
                </div>
                {s.clientIp && (
                  <div className="text-[10px] text-gray-600 font-mono">
                    {s.clientIp}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-medium truncate">
                  {s.channel}
                </div>
                <div className="text-xs text-gray-500 font-mono truncate">
                  {s.hash}
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 text-xs">
                <div className="text-center">
                  <div className="text-gray-500">peers</div>
                  <div className="text-green-400 font-medium">{s.peers}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-500">download</div>
                  <div className="text-gray-300">{formatSpeed(s.speedDown)}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-500">upload</div>
                  <div className="text-gray-300">{formatSpeed(s.speedUp)}</div>
                </div>
              </div>

              <div className={`w-2 h-2 rounded-full shrink-0 ${
                s.status === 'dl' ? 'bg-green-500' :
                s.status === 'prebuf' ? 'bg-yellow-500' :
                'bg-gray-500'
              }`} title={s.status} />
            </div>
          ))}
        </div>
      )}

      {/* User management */}
      <h2 className="text-lg font-bold text-white mb-4">
        Uzytkownicy
        <span className="ml-2 text-sm font-normal text-gray-500">
          ({users.length})
        </span>
      </h2>

      <div className="bg-gray-800/80 rounded-lg overflow-hidden mb-4">
        {users.map(u => (
          <div
            key={u.username}
            className="flex items-center justify-between px-4 py-3 border-b border-gray-700/30 last:border-0"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-white">{u.username}</span>
              {u.username === 'admin' && (
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
                  admin
                </span>
              )}
            </div>
            {u.username !== 'admin' && (
              <button
                onClick={() => handleDeleteUser(u.username)}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Usun
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add user form */}
      <form onSubmit={handleAddUser} className="bg-gray-800/80 rounded-lg p-4">
        <div className="text-sm text-gray-400 mb-3">Dodaj uzytkownika</div>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Login"
              value={newUser}
              onChange={e => setNewUser(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex-1">
            <input
              type="text"
              placeholder="Haslo"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors shrink-0"
          >
            Dodaj
          </button>
        </div>
        {userMsg && (
          <div className={`mt-2 text-sm ${userMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
            {userMsg.text}
          </div>
        )}
      </form>
    </div>
  );
}
