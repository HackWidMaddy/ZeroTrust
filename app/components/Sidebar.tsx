'use client';

import { useRouter } from 'next/navigation';

interface User {
  username: string;
  role: string;
}

interface SidebarProps {
  user: User;
  currentPage: string;
  onLogout: () => void;
}

export default function Sidebar({ user, currentPage, onLogout }: SidebarProps) {
  const router = useRouter();

  const navigationItems = [
    { id: 'dashboard', label: 'Overview', icon: '📊', path: '/dashboard' },
    { id: 'agentfactory', label: 'Agent Factory', icon: '🏭', path: '/agentfactory' },
    { id: 'agentsandfleet', label: 'Agents & Fleet', icon: '🤖', path: '/agentsandfleet' },
    { id: 'channels', label: 'Channels & Routing', icon: '📡', path: '/channels' },
    { id: 'payload', label: 'Payload Builder', icon: '💣', path: '/payload' },
    { id: 'stego', label: 'Stego Lab', icon: '🔒', path: '/stego' },
    { id: 'exfil', label: 'Exfil Ops', icon: '📤', path: '/exfil' },
    { id: 'mesh', label: 'Mesh Visualizer', icon: '🌐', path: '/mesh' },
    { id: 'aiassistant', label: 'AI Assistant', icon: '🤖', path: '/aiassistant' },
    { id: 'audit', label: 'Audit & Logs', icon: '📋', path: '/audit' },
    { id: 'settings', label: 'Settings', icon: '⚙️', path: '/settings' },
    { id: 'help', label: 'Help / Docs', icon: '❓', path: '/help' }
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-700 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-2xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">
          ZeroTrace
        </h1>
        <p className="text-gray-400 text-sm font-mono mt-1">Command Centre</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={`w-full text-left p-3 rounded-lg font-mono text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-green-600/20 border border-green-500 text-green-400'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {item.icon} {item.label}
            </button>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-gray-700">
        <div className="text-sm text-gray-400 font-mono">
          Logged in as: <span className="text-green-400">{user.username}</span>
        </div>
        <button
          onClick={onLogout}
          className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors font-mono text-sm"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
