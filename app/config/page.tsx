'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '../components/PageLayout';
import LoadingScreen from '../components/LoadingScreen';
import { User, parseUserFromCookie, removeCookie } from '../utils/auth';

interface ConfigField {
  id: string;
  label: string;
  type: 'text' | 'password' | 'select' | 'checkbox';
  placeholder?: string;
  options?: string[];
  value: string | boolean;
  required?: boolean;
  helpText?: string;
}

interface ConfigSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  fields: ConfigField[];
}

export default function ConfigPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('github');
  const [configData, setConfigData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string>('');
  const router = useRouter();

  // All configuration sections
  const configSections: ConfigSection[] = [
    {
      id: 'github',
      title: 'GitHub Integration',
      description: 'Configure GitHub Personal Access Token and repository settings',
      icon: '🐙',
      fields: [
        {
          id: 'pat',
          label: 'Personal Access Token',
          type: 'password',
          placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
          value: '',
          required: true,
          helpText: 'Create a PAT with repo, workflow, and gist permissions'
        },
        {
          id: 'username',
          label: 'GitHub Username',
          type: 'text',
          placeholder: 'your-username',
          value: '',
          required: true
        },
        {
          id: 'repo',
          label: 'Repository Name',
          type: 'text',
          placeholder: 'zerotrace-agents',
          value: '',
          required: true
        },
        {
          id: 'branch',
          label: 'Default Branch',
          type: 'select',
          options: ['main', 'master', 'develop'],
          value: 'main'
        },
        {
          id: 'enabled',
          label: 'Enable GitHub Integration',
          type: 'checkbox',
          value: false
        }
      ]
    },
    {
      id: 'telegram',
      title: 'Telegram Bot',
      description: 'Configure Telegram bot token and channel settings',
      icon: '📱',
      fields: [
        {
          id: 'bot_token',
          label: 'Bot Token',
          type: 'password',
          placeholder: '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz',
          value: '',
          required: true,
          helpText: 'Get this from @BotFather on Telegram'
        }
      ]
    },
    {
      id: 'google',
      title: 'Google Services',
      description: 'Configure Google Drive, Gmail, and other Google APIs',
      icon: '🔍',
      fields: [
        {
          id: 'client_id',
          label: 'Client ID',
          type: 'text',
          placeholder: '123456789-abcdefghijklmnop.apps.googleusercontent.com',
          value: '',
          required: true
        },
        {
          id: 'client_secret',
          label: 'Client Secret',
          type: 'password',
          placeholder: 'GOCSPX-xxxxxxxxxxxxxxxxxxxx',
          value: '',
          required: true
        },
        {
          id: 'drive_folder',
          label: 'Drive Folder ID',
          type: 'text',
          placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          value: '',
          helpText: 'ID of the folder where files will be stored'
        },
        {
          id: 'enabled',
          label: 'Enable Google Services',
          type: 'checkbox',
          value: false
        }
      ]
    },
    {
      id: 'sheets',
      title: 'Google Sheets',
      description: 'Configure Google Sheets integration and Apps Script deployment',
      icon: '📊',
      fields: [
        {
          id: 'spreadsheet_id',
          label: 'Spreadsheet ID',
          type: 'text',
          placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          value: '',
          required: true,
          helpText: 'ID from the Google Sheets URL'
        },
        {
          id: 'sheet_name',
          label: 'Sheet Name',
          type: 'text',
          placeholder: 'Sheet1',
          value: 'Sheet1',
          required: true,
          helpText: 'Name of the specific sheet tab'
        },
        {
          id: 'apps_script_url',
          label: 'Google Apps Script Public URL',
          type: 'text',
          placeholder: 'https://script.google.com/macros/s/AKfycbz.../exec',
          value: '',
          required: true,
          helpText: 'Public deployment URL from Google Apps Script'
        },
      ]
    },
    {
      id: 'dns',
      title: 'DNS & Network',
      description: 'Configure DNS servers, proxy settings, and network options',
      icon: '🌐',
      fields: [
        {
          id: 'dns_primary',
          label: 'Primary DNS Server',
          type: 'text',
          placeholder: '8.8.8.8',
          value: '8.8.8.8'
        },
        {
          id: 'dns_secondary',
          label: 'Secondary DNS Server',
          type: 'text',
          placeholder: '1.1.1.1',
          value: '1.1.1.1'
        },
        {
          id: 'dns_domain',
          label: 'DNS Domain',
          type: 'text',
          placeholder: 'example.com',
          value: '',
          helpText: 'Domain for DNS TXT record exfiltration'
        },
        {
          id: 'proxy_enabled',
          label: 'Enable Proxy',
          type: 'checkbox',
          value: false
        },
        {
          id: 'proxy_url',
          label: 'Proxy URL',
          type: 'text',
          placeholder: 'http://proxy.example.com:8080',
          value: ''
        }
      ]
    },
    {
      id: 'security',
      title: 'Security & Encryption',
      description: 'Configure encryption keys, certificates, and security settings',
      icon: '🔒',
      fields: [
        {
          id: 'encryption_key',
          label: 'Encryption Key',
          type: 'password',
          placeholder: '32-character encryption key',
          value: '',
          required: true,
          helpText: '32-character key for AES-256 encryption'
        },
        {
          id: 'certificate_path',
          label: 'SSL Certificate Path',
          type: 'text',
          placeholder: '/etc/ssl/certs/zerotrace.crt',
          value: ''
        },
        {
          id: 'private_key_path',
          label: 'Private Key Path',
          type: 'text',
          placeholder: '/etc/ssl/private/zerotrace.key',
          value: ''
        },
        {
          id: 'enable_ssl',
          label: 'Enable SSL/TLS',
          type: 'checkbox',
          value: true
        }
      ]
    },
    {
      id: 'monitoring',
      title: 'Monitoring & Logging',
      description: 'Configure logging, monitoring, and alerting settings',
      icon: '📊',
      fields: [
        {
          id: 'log_level',
          label: 'Log Level',
          type: 'select',
          options: ['DEBUG', 'INFO', 'WARN', 'ERROR'],
          value: 'INFO'
        },
        {
          id: 'log_file_path',
          label: 'Log File Path',
          type: 'text',
          placeholder: '/var/log/zerotrace/',
          value: '/var/log/zerotrace/'
        },
        {
          id: 'enable_metrics',
          label: 'Enable Metrics Collection',
          type: 'checkbox',
          value: true
        },
        {
          id: 'metrics_port',
          label: 'Metrics Port',
          type: 'text',
          placeholder: '9090',
          value: '9090'
        },
        {
          id: 'alert_email',
          label: 'Alert Email',
          type: 'text',
          placeholder: 'admin@example.com',
          value: ''
        }
      ]
    }
  ];

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

  // Load config after user is set
  useEffect(() => {
    if (user && !loading) {
      loadConfigFromBackend();
    }
  }, [user, loading]);

  const loadConfigFromBackend = async () => {
    try {
      const username = user?.username || 'admin';
      console.log('Loading config for username:', username);
      
      const response = await fetch(`http://localhost:5000/config?username=${username}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Config response:', result);
        
        if (result.status === 'success' && result.data) {
          console.log('Loaded config data:', result.data);
          setConfigData(result.data);
        }
      }
    } catch (error) {
      console.error('Error loading config from backend:', error);
    }
  };

  const handleFieldChange = (sectionId: string, fieldId: string, value: string | boolean) => {
    setConfigData(prev => ({
      ...prev,
      [`${sectionId}_${fieldId}`]: value
    }));
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setSaveStatus('idle');

    try {
      // Prepare data for backend
      const backendData = {
        ...configData,
        timestamp: new Date().toISOString(),
        username: user?.username || 'unknown'
      };
      
      console.log('Saving config data:', backendData);

      // Send to backend
      const response = await fetch('http://localhost:5000/configinput', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendData),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          // Show result
          setSaveMessage(`${result.action === 'updated' ? 'Updated' : 'Created'} configuration successfully!`);
          setSaveStatus('success');
          
          // Reload config to show updated data
          setTimeout(() => {
            loadConfigFromBackend();
            setSaveStatus('idle');
            setSaveMessage('');
          }, 2000);
        } else {
          throw new Error('Failed to save configuration');
        }
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    removeCookie('user');
    router.push('/');
  };

  const getFieldValue = (sectionId: string, fieldId: string, defaultValue: string | boolean) => {
    return configData[`${sectionId}_${fieldId}`] ?? defaultValue;
  };

  if (loading) {
    return <LoadingScreen message="Loading Configuration..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <PageLayout user={user} currentPage="config" onLogout={handleLogout}>
      {/* Main Content Area */}
      <main className="flex-1 p-6 bg-gray-950 overflow-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-mono font-bold text-green-400 mb-4">Configuration</h1>
          <p className="text-gray-400 font-mono">Configure all framework integrations, API keys, and system settings</p>
        </div>

        {/* Save Status */}
        {saveStatus !== 'idle' && (
          <div className={`mb-6 p-4 rounded-lg font-mono text-sm ${
            saveStatus === 'success' 
              ? 'bg-green-900/20 border border-green-500 text-green-400' 
              : 'bg-red-900/20 border border-red-500 text-red-400'
          }`}>
            {saveStatus === 'success' ? (
              <div>
                <div className="font-semibold">✓ Configuration saved successfully!</div>
                {saveMessage && <div className="text-xs mt-1 opacity-80">{saveMessage}</div>}
              </div>
            ) : (
              '✗ Error saving configuration'
            )}
          </div>
        )}

        {/* Debug Info */}
        <div className="mb-6 p-4 rounded-lg font-mono text-sm bg-gray-900/20 border border-gray-700 text-gray-300">
          <div className="font-semibold mb-2">🔍 Debug Info:</div>
          <div className="text-xs space-y-1">
            <div>Username: {user?.username || 'unknown'}</div>
            <div>Loaded Config Keys: {Object.keys(configData).length}</div>
            <div>Config Data: {JSON.stringify(configData, null, 2)}</div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Left Sidebar - Configuration Sections */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
              <h2 className="text-lg font-mono font-semibold text-white mb-4">Configuration Sections</h2>
              <div className="space-y-2">
                {configSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left p-3 rounded-lg font-mono text-sm transition-all duration-200 ${
                      activeSection === section.id
                        ? 'bg-green-600/20 border border-green-500 text-green-400'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{section.icon}</span>
                      <div>
                        <div className="font-semibold">{section.title}</div>
                        <div className="text-xs text-gray-400">{section.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Content - Configuration Form */}
          <div className="flex-1">
            {configSections.map((section) => (
              <div key={section.id} className={`${activeSection === section.id ? 'block' : 'hidden'}`}>
                <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
                  {/* Section Header */}
                  <div className="mb-6">
                    <h2 className="text-2xl font-mono font-bold text-white flex items-center space-x-3">
                      <span>{section.icon}</span>
                      <span>{section.title}</span>
                    </h2>
                    <p className="text-gray-400 font-mono mt-2">{section.description}</p>
                  </div>

                  {/* Configuration Fields */}
                  <div className="space-y-6">
                    {section.fields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <label className="block text-gray-300 font-mono text-sm font-semibold">
                          {field.label}
                          {field.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        
                        {field.type === 'text' && (
                          <input
                            type="text"
                            value={getFieldValue(section.id, field.id, field.value) as string}
                            onChange={(e) => handleFieldChange(section.id, field.id, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
                          />
                        )}

                        {field.type === 'password' && (
                          <input
                            type="password"
                            value={getFieldValue(section.id, field.id, field.value) as string}
                            onChange={(e) => handleFieldChange(section.id, field.id, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
                          />
                        )}

                        {field.type === 'select' && (
                          <select
                            value={getFieldValue(section.id, field.id, field.value) as string}
                            onChange={(e) => handleFieldChange(section.id, field.id, e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
                          >
                            {field.options?.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        )}

                        {field.type === 'checkbox' && (
                          <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={getFieldValue(section.id, field.id, field.value) as boolean}
                              onChange={(e) => handleFieldChange(section.id, field.id, e.target.checked)}
                              className="w-5 h-5 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
                            />
                            <span className="text-gray-300 font-mono text-sm">Enable this integration</span>
                          </label>
                        )}

                        {field.helpText && (
                          <p className="text-gray-500 font-mono text-xs">{field.helpText}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-between items-center">
          <button
            onClick={loadConfigFromBackend}
            className="px-6 py-3 rounded-lg font-mono font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            🔄 REFRESH CONFIG
          </button>
          
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className={`px-8 py-3 rounded-lg font-mono font-semibold transition-all duration-200 ${
              saving
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {saving ? 'SAVING...' : 'SAVE ALL CONFIGURATIONS'}
          </button>
        </div>
      </main>
    </PageLayout>
  );
}
