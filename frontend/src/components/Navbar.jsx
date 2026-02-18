import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import ChangePasswordModal from './ChangePasswordModal';

export default function Navbar({ onLogout }) {
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    onLogout();
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
    }`;

  return (
    <>
      <nav className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-blue-400 mr-4">Dash TV</span>
            <NavLink to="/watch" className={linkClass}>Ogladaj</NavLink>
            <NavLink to="/guide" className={linkClass}>Telegazeta</NavLink>
            <NavLink to="/manage" className={linkClass}>Kanaly</NavLink>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Zmien haslo
            </button>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Wyloguj
            </button>
          </div>
        </div>
      </nav>
      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </>
  );
}
