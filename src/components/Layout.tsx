import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Reviews', icon: '📋' },
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="flex h-screen bg-surface-0">
      {/* Sidebar */}
      <nav className="w-16 bg-surface-1 border-r border-border-default flex flex-col items-center py-4 gap-2">
        {/* App logo */}
        <div className="w-10 h-10 rounded-lg bg-accent-blue/20 flex items-center justify-center text-accent-blue font-bold text-lg mb-4">
          CR
        </div>

        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors text-lg
                ${isActive
                  ? 'bg-surface-3 text-text-primary'
                  : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'
                }`}
              title={item.label}
            >
              {item.icon}
            </button>
          );
        })}
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
