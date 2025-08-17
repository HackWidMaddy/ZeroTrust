'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { md5 } from './utils/md5';

interface User {
  username: string;
  password: string;
  role: string;
}

export default function Home() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [matrixText, setMatrixText] = useState('');
  const router = useRouter();

  // Matrix rain effect
  useEffect(() => {
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    let matrix = '';
    
    const interval = setInterval(() => {
      matrix = chars[Math.floor(Math.random() * chars.length)];
      setMatrixText(matrix);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Load users from JSON file with better error handling
    const loadUsers = async () => {
      try {
        const response = await fetch('/users.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setUsers(data);
        setLoading(false);
      } catch (err) {
        console.error('Error loading users:', err);
        // Fallback to hardcoded users if JSON fails
        const fallbackUsers: User[] = [
          {
            username: "admin",
            password: "21232f297a57a5a743894a0e4a801fc3",
            role: "administrator"
          },
          {
            username: "user",
            password: "5f4dcc3b5aa765d61d8327deb882cf99",
            role: "user"
          },
          {
            username: "test",
            password: "098f6bcd4621d373cade4e832627b4f6",
            role: "tester"
          }
        ];
        setUsers(fallbackUsers);
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    const hashedPassword = md5(password);
    const user = users.find(u => 
      u.username === username && u.password === hashedPassword
    );

    if (user) {
      setShowWarning(true);
    } else {
      setError('Invalid username or password');
    }
  };

  const handleAcceptWarning = () => {
    // Store user info in cookies for middleware compatibility
    const userData = {
      username,
      role: users.find(u => u.username === username)?.role
    };
    
    // Set cookie with user data
    document.cookie = `user=${JSON.stringify(userData)}; path=/; max-age=3600; SameSite=Strict`;
    
    // Redirect to dashboard
    router.push('/dashboard');
  };

  const handleDeclineWarning = () => {
    setShowWarning(false);
    setUsername('');
    setPassword('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        {/* Matrix background */}
        <div className="absolute inset-0 bg-gradient-to-b from-green-900/20 to-black">
          <div className="absolute inset-0 opacity-20">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="absolute text-green-400 text-xs animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 3}s`
                }}
              >
                {matrixText}
              </div>
            ))}
          </div>
        </div>
        
        <div className="relative z-10 text-center">
          <div className="text-green-400 text-6xl font-mono mb-4 animate-pulse">
            ZERO<span className="text-red-500">TRACE</span>
          </div>
          <div className="text-green-300 text-xl font-mono">
            Initializing system...
          </div>
          <div className="mt-4 text-green-500 text-sm font-mono">
            [<span className="animate-pulse">█</span>] Loading modules
          </div>
        </div>
      </div>
    );
  }

  if (showWarning) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        {/* Matrix background */}
        <div className="absolute inset-0 bg-gradient-to-b from-red-900/20 to-black">
          <div className="absolute inset-0 opacity-10">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="absolute text-red-400 text-xs animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`
                }}
              >
                {matrixText}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900/90 border-2 border-red-500 rounded-lg p-8 max-w-2xl w-full relative z-10 backdrop-blur-sm">
          {/* Warning Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="text-red-400 text-4xl animate-pulse">⚠️</div>
            <div>
              <h1 className="text-red-400 font-mono font-bold text-2xl tracking-wider">EDUCATIONAL USE ONLY</h1>
              <p className="text-gray-300 text-sm font-mono">ZeroTrace C2 Framework - Red Team Simulation Platform</p>
            </div>
          </div>

          {/* Purpose Description */}
          <div className="mb-6">
            <h2 className="text-cyan-400 font-mono font-semibold mb-3 text-lg">This application is designed for:</h2>
            <ul className="text-gray-300 space-y-2 ml-4 font-mono">
              <li className="flex items-center gap-2">
                <span className="text-green-400">▶</span>
                Educational purposes and cybersecurity training
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">▶</span>
                Red team simulation exercises
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">▶</span>
                Blue team defense training
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">▶</span>
                Authorized penetration testing scenarios
              </li>
            </ul>
          </div>

          {/* Warning Message */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-red-400 text-2xl animate-pulse">⚠️</div>
              <h3 className="text-red-400 font-mono font-bold text-xl">WARNING:</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed font-mono border-l-2 border-red-500 pl-4">
              Unauthorized use of this software for malicious purposes is strictly prohibited and illegal. 
              By proceeding, you acknowledge that you will use this software responsibly and in compliance 
              with applicable laws.
            </p>
          </div>

          {/* Agreement Checkbox */}
          <div className="mb-6">
            <label className="flex items-center gap-3 text-gray-300 cursor-pointer font-mono">
              <input 
                type="checkbox" 
                className="w-5 h-5 text-green-600 bg-gray-800 border-red-500 rounded focus:ring-green-500 focus:ring-2"
                defaultChecked
              />
              <span className="text-sm">I understand and agree to use this software for educational purposes only</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button
              onClick={handleDeclineWarning}
              className="px-6 py-3 bg-gray-800 border-2 border-gray-600 text-white rounded-lg hover:bg-gray-700 hover:border-gray-500 transition-all duration-200 font-mono font-semibold tracking-wide"
            >
              DECLINE
            </button>
            <button
              onClick={handleAcceptWarning}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-cyan-600 text-white rounded-lg hover:from-green-700 hover:to-cyan-700 transition-all duration-200 font-mono font-semibold tracking-wide shadow-lg hover:shadow-green-500/25"
            >
              ACCEPT
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Matrix background */}
      <div className="absolute inset-0 bg-gradient-to-b from-green-900/20 via-black to-blue-900/20">
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-green-400 text-xs animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            >
              {matrixText}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900/90 border-2 border-green-500 rounded-lg p-8 max-w-md w-full relative z-10 backdrop-blur-sm shadow-2xl shadow-green-500/20">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400 mb-2 tracking-wider">
            ZERO<span className="text-red-500">TRACE</span>
          </h1>
          <p className="text-gray-400 font-mono text-sm tracking-wide">Red Team Simulation Platform</p>
          <div className="mt-2 text-green-400 text-xs font-mono">
            [<span className="animate-pulse">█</span>] System Ready
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-mono font-medium text-green-400 mb-2 tracking-wide">
              USERNAME
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 font-mono tracking-wide"
              placeholder="Enter username"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-mono font-medium text-green-400 mb-2 tracking-wide">
              PASSWORD
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 font-mono tracking-wide"
              placeholder="Enter password"
              required
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center font-mono bg-red-900/20 border border-red-500 rounded-lg p-3">
              <span className="text-red-400">⚠</span> {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-green-600 to-cyan-600 text-white py-3 px-4 rounded-lg hover:from-green-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200 font-mono font-semibold tracking-wider shadow-lg hover:shadow-green-500/25"
          >
            ACCESS SYSTEM
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm font-mono mb-3 tracking-wide">
            DEMO CREDENTIALS:
          </p>
          <div className="text-gray-500 text-xs space-y-1 font-mono">
            <div className="bg-gray-800/50 p-2 rounded border border-gray-700">
              <span className="text-green-400">admin</span> / <span className="text-cyan-400">admin</span>
            </div>
            <div className="bg-gray-800/50 p-2 rounded border border-gray-700">
              <span className="text-green-400">user</span> / <span className="text-cyan-400">password</span>
            </div>
            <div className="bg-gray-800/50 p-2 rounded border border-gray-700">
              <span className="text-green-400">test</span> / <span className="text-cyan-400">test</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
