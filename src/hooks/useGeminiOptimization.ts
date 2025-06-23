import { useState, useEffect, useCallback } from 'react';
import { 
  getCacheStats, 
  getRateLimitStatus, 
  preloadCommonResponses,
  testGeminiConnection 
} from '../services/geminiService';

interface OptimizationStats {
  cacheHitRate: number;
  rateLimitUtilization: number;
  averageResponseTime: number;
  totalRequests: number;
  cachedRequests: number;
}

interface UseGeminiOptimizationReturn {
  stats: OptimizationStats;
  isOptimizing: boolean;
  optimize: () => Promise<void>;
  testConnection: () => Promise<boolean>;
  refreshStats: () => void;
}

export const useGeminiOptimization = (): UseGeminiOptimizationReturn => {
  const [stats, setStats] = useState<OptimizationStats>({
    cacheHitRate: 0,
    rateLimitUtilization: 0,
    averageResponseTime: 0,
    totalRequests: 0,
    cachedRequests: 0
  });
  
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [requestTimes, setRequestTimes] = useState<number[]>([]);

  // Track request performance
  const trackRequest = useCallback((responseTime: number, fromCache: boolean) => {
    setRequestTimes(prev => [...prev.slice(-99), responseTime]); // Keep last 100 requests
    setStats(prev => ({
      ...prev,
      totalRequests: prev.totalRequests + 1,
      cachedRequests: fromCache ? prev.cachedRequests + 1 : prev.cachedRequests
    }));
  }, []);

  // Calculate stats
  const refreshStats = useCallback(() => {
    const cacheStats = getCacheStats();
    const rateLimitStatus = getRateLimitStatus();
    
    const avgResponseTime = requestTimes.length > 0 
      ? requestTimes.reduce((a, b) => a + b, 0) / requestTimes.length 
      : 0;
    
    const cacheHitRate = stats.totalRequests > 0 
      ? (stats.cachedRequests / stats.totalRequests) * 100 
      : 0;
    
    const rateLimitUtilization = rateLimitStatus.maxRequests > 0
      ? (rateLimitStatus.requestsInWindow / rateLimitStatus.maxRequests) * 100
      : 0;

    setStats(prev => ({
      ...prev,
      cacheHitRate,
      rateLimitUtilization,
      averageResponseTime: avgResponseTime
    }));
  }, [requestTimes, stats.totalRequests, stats.cachedRequests]);

  // Auto-refresh stats every 10 seconds
  useEffect(() => {
    const interval = setInterval(refreshStats, 10000);
    return () => clearInterval(interval);
  }, [refreshStats]);

  // Optimization function
  const optimize = useCallback(async () => {
    setIsOptimizing(true);
    try {
      console.log('🚀 Starting Gemini optimization...');
      
      // Preload common responses
      await preloadCommonResponses();
      
      // Refresh stats after optimization
      refreshStats();
      
      console.log('✅ Gemini optimization completed');
    } catch (error) {
      console.error('❌ Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [refreshStats]);

  // Test connection function
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const startTime = Date.now();
      const result = await testGeminiConnection();
      const responseTime = Date.now() - startTime;
      
      trackRequest(responseTime, false);
      return result;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }, [trackRequest]);

  // Initialize with current stats
  useEffect(() => {
    refreshStats();
  }, []);

  return {
    stats,
    isOptimizing,
    optimize,
    testConnection,
    refreshStats
  };
};