'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '../components/PageLayout';
import LoadingScreen from '../components/LoadingScreen';
import { User, parseUserFromCookie, removeCookie } from '../utils/auth';

interface RoundStatus {
  active: boolean;
  round_id: string | null;
  created_at: string | null;
  config: {
    vector_size: number;
    min_clients: number;
  } | null;
  global_weights: number[];
  received_updates: number;
}

export default function FederatedLearningPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<RoundStatus | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vectorSize, setVectorSize] = useState(100);
  const [minClients, setMinClients] = useState(1);
  const router = useRouter();

  const fetchStatus = async () => {
    try {
      const response = await fetch('http://localhost:5000/fl/status');
      if (!response.ok) throw new Error('Failed to fetch status');
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching status:', err);
    }
  };

  const startRound = async () => {
    setLoadingAction(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/fl/start-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vector_size: vectorSize,
          min_clients: minClients,
        }),
      });

      if (!response.ok) throw new Error('Failed to start round');

      const data = await response.json();
      console.log('Round started:', data);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start round');
      console.error('Error starting round:', err);
    } finally {
      setLoadingAction(false);
    }
  };

  useEffect(() => {
    const loadUser = () => {
      try {
        const userData = parseUserFromCookie();
        setUser(userData);
        if (!userData) {
          router.push('/');
        }
        setLoading(false);
      } catch (err) {
        console.error('Auth check failed:', err);
        setLoading(false);
      }
    };
    loadUser();
  }, [router]);

  useEffect(() => {
    if (!loading) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 3000); // Poll every 3 seconds
      return () => clearInterval(interval);
    }
  }, [loading]);

  const handleLogout = () => {
    removeCookie('user');
    router.push('/');
  };

  if (loading || !user) {
    return <LoadingScreen />;
  }

  return (
    <PageLayout
      user={user}
      currentPage="federated"
      onLogout={handleLogout}
    >
      <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🤖 Federated Learning</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Control Panel */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">Start New Round</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Vector Size
                </label>
                <input
                  type="number"
                  value={vectorSize}
                  onChange={(e) => setVectorSize(parseInt(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2"
                  placeholder="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Min Clients
                </label>
                <input
                  type="number"
                  value={minClients}
                  onChange={(e) => setMinClients(parseInt(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2"
                  placeholder="1"
                />
              </div>

              <button
                onClick={startRound}
                disabled={loadingAction}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded font-medium"
              >
                {loadingAction ? 'Starting...' : 'Start Round'}
              </button>

              {error && (
                <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Status Panel */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">Round Status</h2>

            {status ? (
              <div className="space-y-3">
                <div>
                  <span className="text-gray-400">Active:</span>
                  <span
                    className={`ml-2 font-semibold ${
                      status.active ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {status.active ? '✓ Yes' : '✗ No'}
                  </span>
                </div>

                {status.round_id && (
                  <div>
                    <span className="text-gray-400">Round ID:</span>
                    <span className="ml-2 text-gray-300 font-mono text-sm">
                      {status.round_id.substring(0, 8)}...
                    </span>
                  </div>
                )}

                {status.created_at && (
                  <div>
                    <span className="text-gray-400">Created:</span>
                    <span className="ml-2 text-gray-300">
                      {new Date(status.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                )}

                {status.config && (
                  <>
                    <div>
                      <span className="text-gray-400">Vector Size:</span>
                      <span className="ml-2 text-gray-300">
                        {status.config.vector_size}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Min Clients:</span>
                      <span className="ml-2 text-gray-300">
                        {status.config.min_clients}
                      </span>
                    </div>
                  </>
                )}

                <div>
                  <span className="text-gray-400">Received Updates:</span>
                  <span className="ml-2 text-blue-400 font-semibold">
                    {status.received_updates}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-gray-500">Loading status...</div>
            )}
          </div>
        </div>

        {/* Global Weights Visualization */}
        {status && status.active && status.global_weights && (
          <div className="mt-6 bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">Global Weights</h2>
            <div className="text-gray-400 text-sm mb-2">
              Showing first 50 of {status.global_weights.length} weights
            </div>
            <div className="flex flex-wrap gap-1">
              {status.global_weights.slice(0, 50).map((weight, idx) => (
                <div
                  key={idx}
                  className="w-6 h-6 rounded flex items-center justify-center text-xs"
                  style={{
                    backgroundColor: `rgba(${weight > 0 ? '34, 197, 94' : '239, 68, 68'}, ${Math.min(Math.abs(weight), 1)})`,
                  }}
                  title={`Index ${idx}: ${weight.toFixed(3)}`}
                >
                  {weight.toFixed(1)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-gray-900 rounded-lg p-6 border border-gray-800">
          <h2 className="text-xl font-semibold mb-4">How to Use</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Start a new round with your desired vector size</li>
            <li>
              Run the PowerShell agent script on compromised machines:
              <code className="block bg-gray-800 px-3 py-2 rounded mt-2">
                .\federated_learning_agent.ps1 -ClientId "bot-001"
                -CoordinatorUrl "http://your-server:5000"
              </code>
            </li>
            <li>Watch as agents submit updates and the global weights are
              aggregated</li>
            <li>Monitor the status panel for real-time updates</li>
          </ol>
        </div>
      </div>
    </div>
    </PageLayout>
  );
}

