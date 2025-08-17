'use client';

export default function Header() {
  return (
    <header className="bg-gray-900 border-b border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          {/* Hamburger Menu */}
          <button className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Server Status */}
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 font-mono text-sm">C2 Server Online 142ms</span>
          </div>
        </div>

        {/* Global Search */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🌐</span>
            </div>
            <input
              type="text"
              placeholder="Global search... (Press / to focus)"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-mono text-sm font-semibold transition-colors">
            GENERATE AGENT
          </button>
          <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-mono text-sm transition-colors">
            RUN COMMAND
          </button>
          <button className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
            🌙
          </button>
          <button className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-mono text-sm font-semibold transition-colors">
            RedTeam-01
          </button>
        </div>
      </div>
    </header>
  );
}
