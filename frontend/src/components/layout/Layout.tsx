import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from './CommandPalette';
import { ToastProvider } from '../ui/Toast';
import { PageTransition } from './PageTransition';
import { useTheme } from '../../context/ThemeContext';

export const Layout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const location = useLocation();
  const { template } = useTheme();

  return (
    <ToastProvider>
      <div
        className={`min-h-screen bg-background text-foreground flex transition-colors ${
          template === 'cyber-dark' ? 'bg-cyber-grid' : ''
        }`}
      >
        {/* Collapsible Sidebar */}
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          activeAlertCount={3}
        />

        {/* Main Content Area */}
        <div
          className={`flex-1 flex flex-col transition-all duration-300 min-w-0 ${
            collapsed ? 'ml-20' : 'ml-64'
          }`}
        >
          <Header
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
            activeAlertCount={3}
          />

          <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </main>
        </div>

        {/* Global Command Palette */}
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
        />
      </div>
    </ToastProvider>
  );
};
