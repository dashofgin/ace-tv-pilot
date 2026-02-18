import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import WatchPage from './pages/WatchPage';
import ManagePage from './pages/ManagePage';
import GuidePage from './pages/GuidePage';
import Navbar from './components/Navbar';

function App() {
  const [authenticated, setAuthenticated] = useState(null);

  useEffect(() => {
    fetch('/api/auth/status')
      .then(r => r.json())
      .then(data => setAuthenticated(data.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

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
          <Route path="/login" element={<LoginPage onLogin={() => setAuthenticated(true)} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Navbar onLogout={() => setAuthenticated(false)} />
      <Routes>
        <Route path="/watch" element={<WatchPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/manage" element={<ManagePage />} />
        <Route path="*" element={<Navigate to="/watch" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
