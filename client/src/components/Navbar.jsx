import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const roleColors = {
  Student: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  HOD: 'bg-violet-50 text-violet-700 border border-violet-200',
  Faculty: 'bg-blue-50 text-blue-700 border border-blue-200',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <img
              src="/aharada-logo.png"
              alt="Aharada Education"
              className="h-10 object-contain"
            />
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-800">
                Aharada Education
              </h1>
              <p className="text-[10px] text-slate-500 tracking-wider uppercase font-semibold">
                Grievance Portal
              </p>
            </div>
          </div>

          {/* User Info */}
          {user && (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-800">{user.name}</span>
                <span className="text-xs text-slate-500">{user.email}</span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${roleColors[user.role]}`}>
                {user.role}
              </span>
              <button
                onClick={handleLogout}
                id="logout-button"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all duration-200 cursor-pointer"
              >
                Logout →
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
