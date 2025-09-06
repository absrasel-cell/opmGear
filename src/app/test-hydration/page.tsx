'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';

export default function TestHydrationPage() {
  const [mounted, setMounted] = useState(false);
  const [effectCount, setEffectCount] = useState(0);
  const { user, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    console.log('🧪 TestHydration: First useEffect executed!');
    setMounted(true);
  }, []);

  useEffect(() => {
    console.log('🧪 TestHydration: Effect count useEffect executed!');
    setEffectCount(prev => prev + 1);
  }, [mounted]);

  const handleClick = () => {
    console.log('🖱️ TestHydration: Button clicked!');
    alert('Client-side JavaScript is working!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          Hydration Test Page
        </h1>
        
        <div className="grid gap-6">
          {/* Hydration Status */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Hydration Status</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Mounted:</span>
                <span className={`font-mono ${mounted ? 'text-green-400' : 'text-red-400'}`}>
                  {mounted ? '✅ Yes' : '❌ No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Effect Count:</span>
                <span className="text-blue-400 font-mono">{effectCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Window Available:</span>
                <span className={`font-mono ${typeof window !== 'undefined' ? 'text-green-400' : 'text-red-400'}`}>
                  {typeof window !== 'undefined' ? '✅ Yes' : '❌ No'}
                </span>
              </div>
            </div>
          </div>

          {/* Auth Status */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Auth Status</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Loading:</span>
                <span className={`font-mono ${loading ? 'text-yellow-400' : 'text-green-400'}`}>
                  {loading ? '⏳ Yes' : '✅ No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Authenticated:</span>
                <span className={`font-mono ${isAuthenticated ? 'text-green-400' : 'text-red-400'}`}>
                  {isAuthenticated ? '✅ Yes' : '❌ No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">User Email:</span>
                <span className="text-blue-400 font-mono">
                  {user?.email || 'Not authenticated'}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Tests */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Interactive Tests</h2>
            <div className="space-y-4">
              <button
                onClick={handleClick}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Test Click Handler
              </button>
              
              <button
                onClick={() => {
                  console.log('🧪 Console test from hydration page');
                  console.log('Auth state:', { user, loading, isAuthenticated });
                  console.log('Hydration state:', { mounted, effectCount });
                }}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                Log Debug Info
              </button>
            </div>
          </div>

          {/* Console Instructions */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-yellow-400 mb-2">Instructions</h3>
            <p className="text-yellow-100 text-sm">
              Open browser DevTools (F12) and check the Console tab. You should see:
            </p>
            <ul className="list-disc list-inside text-yellow-100 text-sm mt-2 space-y-1">
              <li>🧪 TestHydration: First useEffect executed!</li>
              <li>🧪 TestHydration: Effect count useEffect executed!</li>
              <li>🚀 AuthProvider: HYDRATION SUCCESSFUL messages</li>
              <li>Clicking buttons should trigger console logs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}