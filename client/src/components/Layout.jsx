import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';

export default function Layout({ children }) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="py-6 text-center text-sm font-semibold text-slate-500 border-t border-slate-200 mt-12">
        <p>© 2026 Aharada Education — Student Grievance Portal. All rights reserved.</p>
      </footer>
    </div>
  );
}
