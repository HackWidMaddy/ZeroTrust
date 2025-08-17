'use client';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      <div className="text-center">
        <div className="text-green-400 text-6xl font-mono mb-4 animate-pulse">
          ZERO<span className="text-red-500">TRACE</span>
        </div>
        <div className="text-green-300 text-xl font-mono">
          {message}
        </div>
        <div className="mt-4 text-green-500 text-sm font-mono">
          [<span className="animate-pulse">█</span>] Initializing systems
        </div>
      </div>
    </div>
  );
}
