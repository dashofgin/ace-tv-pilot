import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import WatchPage from './pages/WatchPage';
import ManagePage from './pages/ManagePage';
import GuidePage from './pages/GuidePage';
import StatusPage from './pages/StatusPage';
import Navbar from './components/Navbar';

function App() {
  const [authenticated, setAuthenticated] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch('/api/auth/status')
      .then(r => r.json())
      .then(data => {
        setAuthenticated(data.authenticated);
        setIsAdmin(data.isAdmin || false);
      })
      .catch(() => setAuthenticated(false));
  }, []);

  const handleLogin = () => {
    fetch('/api/auth/status')
      .then(r => r.json())
      .then(data => {
        setAuthenticated(true);
        setIsAdmin(data.isAdmin || false);
      });
  };

  if (authenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400 text-lg">Ładowanie...</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Navbar onLogout={() => { setAuthenticated(false); setIsAdmin(false); }} isAdmin={isAdmin} />
      <Routes>
        <Route path="/watch" element={<WatchPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/manage" element={<ManagePage />} />
        {isAdmin && <Route path="/status" element={<StatusPage />} />}
        <Route path="*" element={<Navigate to="/watch" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
