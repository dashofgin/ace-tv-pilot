import { useState, useEffect } from 'react';

export function useAuth() {
  const [authenticated, setAuthenticated] = useState(null);

  useEffect(() => {
    fetch('/api/auth/status')
      .then(r => r.json())
      .then(data => setAuthenticated(data.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

  const login = async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok) {
      setAuthenticated(true);
      return { ok: true };
    }
    return { ok: false, error: data.error };
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAuthenticated(false);
  };

  return { authenticated, login, logout };
}
