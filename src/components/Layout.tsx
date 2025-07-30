import React, { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Navigation from './Navigation';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const isGamePage = location.pathname.startsWith('/game/');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-6">
        {children}
      </div>
      {!isGamePage && <Navigation />}
    </div>
  );
};

export default Layout;