'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '../components/PageLayout';
import LoadingScreen from '../components/LoadingScreen';
import { User, parseUserFromCookie, removeCookie } from '../utils/auth';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in via cookies
    const userInfo = parseUserFromCookie();
    if (!userInfo) {
      router.push('/');
      return;
    }

    setUser(userInfo);
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    removeCookie('user');
    router.push('/');
  };

  if (loading) {
    return <LoadingScreen message="Loading Dashboard..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <PageLayout user={user} currentPage="dashboard" onLogout={handleLogout}>
      {/* Main Content Area */}
      <main className="flex-1 p-6 bg-gray-950 overflow-auto">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-mono font-bold text-green-400 mb-4">ZeroTrace Command Centre</h1>
          <p className="text-gray-400 font-mono">Welcome back, {user.username}. System status: OPERATIONAL</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 font-mono text-sm">Active Agents</p>
                <p className="text-3xl font-mono font-bold text-green-400">24</p>
              </div>
              <div className="text-4xl">🤖</div>
            </div>
            <div className="mt-4 text-green-400 text-sm font-mono">+3 from yesterday</div>
          </div>

          <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 font-mono text-sm">C2 Channels</p>
                <p className="text-3xl font-mono font-bold text-blue-400">12</p>
              </div>
              <div className="text-4xl">📡</div>
            </div>
            <div className="mt-4 text-blue-400 text-sm font-mono">All operational</div>
          </div>

          <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 font-mono text-sm">Threat Level</p>
                <p className="text-3xl font-mono font-bold text-yellow-400">MEDIUM</p>
              </div>
              <div className="text-4xl">⚠️</div>
            </div>
            <div className="mt-4 text-yellow-400 text-sm font-mono">3 new detections</div>
          </div>

          <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 font-mono text-sm">Uptime</p>
                <p className="text-3xl font-mono font-bold text-green-400">99.9%</p>
              </div>
              <div className="text-4xl">🟢</div>
            </div>
            <div className="mt-4 text-green-400 text-sm font-mono">Last 30 days</div>
          </div>
        </div>

        {/* Global Agent Distribution */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 mb-8">
          <h2 className="text-2xl font-mono font-bold text-white mb-4">Global Agent Distribution</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-2">🇺🇸</div>
              <p className="text-gray-400 font-mono text-sm">North America</p>
              <p className="text-2xl font-mono font-bold text-green-400">12</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">🇪🇺</div>
              <p className="text-gray-400 font-mono text-sm">Europe</p>
              <p className="text-2xl font-mono font-bold text-blue-400">8</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">🌏</div>
              <p className="text-gray-400 font-mono text-sm">Asia Pacific</p>
              <p className="text-2xl font-mono font-bold text-yellow-400">4</p>
            </div>
          </div>
        </div>

        {/* Channel Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-mono font-bold text-white mb-4">Channel Performance</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-mono">GitHub</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-700 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '98%' }}></div>
                  </div>
                  <span className="text-green-400 font-mono text-sm">98%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-mono">Telegram</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-700 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                  </div>
                  <span className="text-green-400 font-mono text-sm">95%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-mono">DNS TXT</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-700 rounded-full h-2">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '87%' }}></div>
                  </div>
                  <span className="text-yellow-400 font-mono text-sm">87%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-mono font-bold text-white mb-4">Recent Activity</h2>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-gray-300 font-mono text-sm">Agent ZT-001247 connected from US</span>
                <span className="text-gray-500 font-mono text-xs">2m ago</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-gray-300 font-mono text-sm">New payload deployed to 3 agents</span>
                <span className="text-gray-500 font-mono text-xs">5m ago</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-gray-300 font-mono text-sm">Threat detection: Suspicious network activity</span>
                <span className="text-gray-500 font-mono text-xs">12m ago</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-gray-300 font-mono text-sm">C2 server backup completed</span>
                <span className="text-gray-500 font-mono text-xs">1h ago</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/agentfactory')}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-mono font-semibold transition-colors"
          >
            🏭 Create New Agent
          </button>
          <button
            onClick={() => router.push('/agentsandfleet')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-mono font-semibold transition-colors"
          >
            🤖 Manage Fleet
          </button>
          <button
            onClick={() => router.push('/aiassistant')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-mono font-semibold transition-colors"
          >
            🤖 AI Assistant
          </button>
        </div>
      </main>
    </PageLayout>
  );
}
