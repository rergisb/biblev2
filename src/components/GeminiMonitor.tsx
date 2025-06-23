import React, { useState, useEffect } from 'react';
import { Activity, Database, Clock, Zap, RefreshCw, Trash2 } from 'lucide-react';
import { 
  getCacheStats, 
  getRateLimitStatus, 
  clearCache, 
  testGeminiConnection,
  preloadCommonResponses 
} from '../services/geminiService';

interface GeminiMonitorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GeminiMonitor: React.FC<GeminiMonitorProps> = ({ isOpen, onClose }) => {
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [rateLimitStatus, setRateLimitStatus] = useState<any>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(null);

  // Update stats every 5 seconds when open
  useEffect(() => {
    if (!isOpen) return;

    const updateStats = () => {
      setCacheStats(getCacheStats());
      setRateLimitStatus(getRateLimitStatus());
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const result = await testGeminiConnection();
      setConnectionStatus(result);
    } catch (error) {
      setConnectionStatus(false);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handlePreloadResponses = async () => {
    setIsPreloading(true);
    try {
      await preloadCommonResponses();
    } catch (error) {
      console.error('Failed to preload responses:', error);
    } finally {
      setIsPreloading(false);
    }
  };

  const handleClearCache = () => {
    clearCache();
    setCacheStats(getCacheStats());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Gemini API Monitor</h2>
              <p className="text-sm text-gray-600">Performance and optimization dashboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Connection Status */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Connection Status
              </h3>
              <button
                onClick={handleTestConnection}
                disabled={isTestingConnection}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
              >
                {isTestingConnection ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
            
            {connectionStatus !== null && (
              <div className={`flex items-center gap-2 p-3 rounded-xl ${
                connectionStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  connectionStatus ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="font-medium">
                  {connectionStatus ? 'Connection Successful' : 'Connection Failed'}
                </span>
              </div>
            )}
          </div>

          {/* Cache Statistics */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Database className="w-5 h-5" />
                Response Cache
              </h3>
              <button
                onClick={handleClearCache}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors duration-200 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear Cache
              </button>
            </div>
            
            {cacheStats && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-xl">
                  <div className="text-2xl font-bold text-gray-900">{cacheStats.size}</div>
                  <div className="text-sm text-gray-600">Cached Responses</div>
                </div>
                <div className="bg-white p-3 rounded-xl">
                  <div className="text-2xl font-bold text-gray-900">
                    {Math.round((cacheStats.size / cacheStats.maxSize) * 100)}%
                  </div>
                  <div className="text-sm text-gray-600">Cache Usage</div>
                </div>
              </div>
            )}
          </div>

          {/* Rate Limiting */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Rate Limiting
            </h3>
            
            {rateLimitStatus && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Requests in current window:</span>
                  <span className="font-bold text-gray-900">
                    {rateLimitStatus.requestsInWindow} / {rateLimitStatus.maxRequests}
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(rateLimitStatus.requestsInWindow / rateLimitStatus.maxRequests) * 100}%` 
                    }}
                  ></div>
                </div>
                
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Remaining: {rateLimitStatus.remainingRequests}</span>
                  <span>
                    Resets: {new Date(rateLimitStatus.windowResetTime).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Optimization Actions */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Optimization</h3>
            
            <div className="space-y-3">
              <button
                onClick={handlePreloadResponses}
                disabled={isPreloading}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPreloading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Preloading Common Responses...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Preload Common Responses
                  </>
                )}
              </button>
              
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-xl">
                <strong>Tip:</strong> Preloading caches frequently requested responses, 
                reducing latency for common questions about verses, prayers, and guidance.
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Performance Features</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="bg-white p-3 rounded-xl">
                <div className="font-medium text-gray-900">✅ Intelligent Caching</div>
                <div className="text-gray-600">30-minute TTL with LRU eviction</div>
              </div>
              
              <div className="bg-white p-3 rounded-xl">
                <div className="font-medium text-gray-900">✅ Rate Limiting</div>
                <div className="text-gray-600">60 requests/minute with queuing</div>
              </div>
              
              <div className="bg-white p-3 rounded-xl">
                <div className="font-medium text-gray-900">✅ Exponential Backoff</div>
                <div className="text-gray-600">Smart retry with jitter</div>
              </div>
              
              <div className="bg-white p-3 rounded-xl">
                <div className="font-medium text-gray-900">✅ Request Batching</div>
                <div className="text-gray-600">Optimized concurrent processing</div>
              </div>
              
              <div className="bg-white p-3 rounded-xl">
                <div className="font-medium text-gray-900">✅ Streaming Support</div>
                <div className="text-gray-600">For responses > 150 tokens</div>
              </div>
              
              <div className="bg-white p-3 rounded-xl">
                <div className="font-medium text-gray-900">✅ Use Case Detection</div>
                <div className="text-gray-600">Optimized parameters per context</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};