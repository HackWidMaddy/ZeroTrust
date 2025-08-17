'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '../components/PageLayout';
import LoadingScreen from '../components/LoadingScreen';
import { User, parseUserFromCookie, removeCookie } from '../utils/auth';

interface Agent {
  id: string;
  host: string;
  country: string;
  os: string;
  privileges: string;
  rtt: string;
  lastContact: string;
  status: 'online' | 'offline' | 'sleeping';
}

export default function AgentsAndFleetPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [countryFilter, setCountryFilter] = useState('All Countries');
  const router = useRouter();

  // Mock agent data
  const [agents] = useState<Agent[]>([
    {
      id: 'ZT-001247',
      host: 'FIN-SRV01',
      country: 'US',
      os: 'Windows 11',
      privileges: 'SYSTEM',
      rtt: '47ms',
      lastContact: '0s ago',
      status: 'online'
    },
    {
      id: 'ZT-001248',
      host: 'DEV-WS02',
      country: 'UK',
      os: 'Ubuntu 22.04',
      privileges: 'root',
      rtt: '89ms',
      lastContact: '2m ago',
      status: 'online'
    },
    {
      id: 'ZT-001249',
      host: 'MAC-PRO01',
      country: 'DE',
      os: 'macOS Sonoma',
      privileges: 'admin',
      rtt: '156ms',
      lastContact: '5m ago',
      status: 'sleeping'
    },
    {
      id: 'ZT-001250',
      host: 'TEST-AND01',
      country: 'JP',
      os: 'Android 13',
      privileges: 'user',
      rtt: '234ms',
      lastContact: '1h ago',
      status: 'offline'
    }
  ]);

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

  const handleBatchCommand = () => {
    console.log('Executing batch command on all agents');
  };

  const handleExportList = () => {
    console.log('Exporting agent list');
  };

  const handleAgentAction = (agentId: string, action: string) => {
    console.log(`Executing ${action} on agent ${agentId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-400';
      case 'offline':
        return 'bg-red-400';
      case 'sleeping':
        return 'bg-yellow-400';
      default:
        return 'bg-gray-400';
    }
  };

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.host.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All Status' || agent.status === statusFilter.toLowerCase();
    const matchesCountry = countryFilter === 'All Countries' || agent.country === countryFilter;
    
    return matchesSearch && matchesStatus && matchesCountry;
  });

  if (loading) {
    return <LoadingScreen message="Loading Agents & Fleet..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <PageLayout user={user} currentPage="agentsandfleet" onLogout={handleLogout}>
      {/* Main Content Area */}
      <main className="flex-1 p-6 bg-gray-950 overflow-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-mono font-bold text-green-400">Agents & Fleet Management</h1>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBatchCommand}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-mono text-sm font-semibold transition-colors"
            >
              BATCH COMMAND
            </button>
            <button
              onClick={handleExportList}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-mono text-sm transition-colors"
            >
              EXPORT LIST
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm w-64"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option>All Status</option>
              <option>online</option>
              <option>offline</option>
              <option>sleeping</option>
            </select>

            {/* Country Filter */}
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option>All Countries</option>
              <option>US</option>
              <option>UK</option>
              <option>DE</option>
              <option>JP</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 rounded-lg font-mono text-sm font-semibold transition-all duration-200 ${
                viewMode === 'grid'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
              }`}
            >
              GRID
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-lg font-mono text-sm font-semibold transition-all duration-200 ${
                viewMode === 'table'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
              }`}
            >
              TABLE
            </button>
          </div>
        </div>

        {/* Agents Display */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAgents.map((agent) => (
              <div key={agent.id} className="bg-gray-900 rounded-lg p-6 border border-gray-700 hover:border-green-500 transition-all duration-200">
                {/* Agent Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-mono font-bold text-green-400">{agent.id}</h3>
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)}`}></div>
                </div>

                {/* Agent Details */}
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-mono">Host:</span>
                    <span className="text-white font-mono">{agent.host}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-mono">Country:</span>
                    <span className="text-white font-mono">{agent.country}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-mono">OS:</span>
                    <span className="text-white font-mono">{agent.os}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-mono">Privileges:</span>
                    <span className="text-white font-mono">{agent.privileges}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-mono">RTT:</span>
                    <span className="text-white font-mono">{agent.rtt}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-mono">Last Contact:</span>
                    <span className="text-white font-mono">{agent.lastContact}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAgentAction(agent.id, 'screenshot')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded font-mono text-xs transition-colors"
                  >
                    Screenshot
                  </button>
                  <button
                    onClick={() => handleAgentAction(agent.id, 'keylog')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded font-mono text-xs transition-colors"
                  >
                    Keylog
                  </button>
                  <button
                    onClick={() => handleAgentAction(agent.id, 'fileaccess')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded font-mono text-xs transition-colors"
                  >
                    FileAccess
                  </button>
                  <button
                    onClick={() => handleAgentAction(agent.id, 'networkscan')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded font-mono text-xs transition-colors"
                  >
                    NetworkScan
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-mono font-medium text-gray-300 uppercase tracking-wider">Agent ID</th>
                  <th className="px-6 py-3 text-left text-xs font-mono font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-mono font-medium text-gray-300 uppercase tracking-wider">Host</th>
                  <th className="px-6 py-3 text-left text-xs font-mono font-medium text-gray-300 uppercase tracking-wider">Country</th>
                  <th className="px-6 py-3 text-left text-xs font-mono font-medium text-gray-300 uppercase tracking-wider">OS</th>
                  <th className="px-6 py-3 text-left text-xs font-mono font-medium text-gray-300 uppercase tracking-wider">Privileges</th>
                  <th className="px-6 py-3 text-left text-xs font-mono font-medium text-gray-300 uppercase tracking-wider">RTT</th>
                  <th className="px-6 py-3 text-left text-xs font-mono font-medium text-gray-300 uppercase tracking-wider">Last Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-mono font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredAgents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-green-400 font-mono font-semibold">{agent.id}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)} mr-2`}></div>
                        <span className="text-sm font-mono capitalize">{agent.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-white">{agent.host}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-white">{agent.country}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-white">{agent.os}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-white">{agent.privileges}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-white">{agent.rtt}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-white">{agent.lastContact}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleAgentAction(agent.id, 'screenshot')}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-mono transition-colors"
                        >
                          SS
                        </button>
                        <button
                          onClick={() => handleAgentAction(agent.id, 'keylog')}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-mono transition-colors"
                        >
                          KL
                        </button>
                        <button
                          onClick={() => handleAgentAction(agent.id, 'fileaccess')}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-mono transition-colors"
                        >
                          FA
                        </button>
                        <button
                          onClick={() => handleAgentAction(agent.id, 'networkscan')}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-mono transition-colors"
                        >
                          NS
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* No Results */}
        {filteredAgents.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg font-mono">No agents found matching your criteria</div>
            <div className="text-gray-500 text-sm font-mono mt-2">Try adjusting your search or filters</div>
          </div>
        )}
      </main>
    </PageLayout>
  );
}
