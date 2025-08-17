'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '../components/PageLayout';
import LoadingScreen from '../components/LoadingScreen';
import { User, parseUserFromCookie, removeCookie } from '../utils/auth';

interface Message {
  id: string;
  type: 'ai' | 'user';
  content: string;
  timestamp: Date;
}

export default function AIAssistantPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hello! I'm your ZeroTrace AI assistant. How can I help you analyze your C2 infrastructure today?",
      timestamp: new Date()
    },
    {
      id: '2',
      type: 'ai',
      content: "Hello! I'm your ZeroTrace AI assistant. I can help you analyze your C2 infrastructure, suggest optimizations, and provide threat intelligence. How can I assist you today?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
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
  }, [router]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogout = () => {
    removeCookie('user');
    router.push('/');
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: generateAIResponse(inputMessage),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000); // Random delay between 1-3 seconds
  };

  const generateAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('agent') || input.includes('fleet')) {
      return "I can help you with agent management! I can analyze your agent fleet, suggest deployment strategies, and help optimize your C2 infrastructure. What specific aspect would you like to explore?";
    } else if (input.includes('security') || input.includes('threat')) {
      return "Threat intelligence is crucial for C2 operations. I can help you analyze potential detection vectors, suggest evasion techniques, and provide insights on current threat landscapes. What's your primary concern?";
    } else if (input.includes('network') || input.includes('routing')) {
      return "Network infrastructure optimization is key to maintaining reliable C2 channels. I can help you analyze your current setup, suggest improvements, and identify potential bottlenecks. What would you like to focus on?";
    } else if (input.includes('payload') || input.includes('malware')) {
      return "Payload development requires careful consideration of target environments and evasion techniques. I can help you analyze your current payloads, suggest improvements, and discuss best practices. What's your target scenario?";
    } else {
      return "I'm here to help with all aspects of your ZeroTrace operations. I can assist with agent management, threat intelligence, network optimization, payload development, and much more. What would you like to discuss?";
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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
      <main className="flex-1 flex flex-col bg-gray-950">
        {/* Page Title */}
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-4xl font-mono font-bold text-green-400">AI Assistant</h1>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-4 ${
                message.type === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.type === 'ai' && (
                <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  🤖
                </div>
              )}
              
              <div
                className={`max-w-3xl rounded-lg p-4 ${
                  message.type === 'ai'
                    ? 'bg-gray-800 text-white'
                    : 'bg-green-600 text-white'
                }`}
              >
                <div className="font-mono text-sm leading-relaxed">
                  {message.content}
                </div>
                <div className={`text-xs mt-2 ${
                  message.type === 'ai' ? 'text-gray-400' : 'text-green-200'
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
              <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
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

        {/* Chat Input */}
        <div className="p-6 border-t border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your operations..."
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isTyping}
              className={`px-6 py-3 rounded-lg font-mono text-sm font-semibold transition-all duration-200 ${
                !inputMessage.trim() || isTyping
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              SEND
            </button>
          </div>
        </div>
      </main>
    </PageLayout>
  );
}
