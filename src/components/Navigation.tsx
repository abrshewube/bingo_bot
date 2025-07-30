import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Wallet, Trophy, History } from 'lucide-react';

const Navigation: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/wallet', icon: Wallet, label: 'Wallet' },
    { path: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { path: '/history', icon: History, label: 'History' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-md border-t border-white/20">
      <div className="container mx-auto px-4">
        <div className="flex justify-around py-3">
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ${
                location.pathname === path
                  ? 'text-yellow-400 bg-white/20'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon size={24} />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;