// Type definitions for the optimized Gemini service

export interface GeminiConfig {
  temperature: number;
  maxOutputTokens: number;
  topP: number;
  topK: number;
  candidateCount?: number;
  stopSequences?: string[];
}

export interface CachedResponse {
  text: string;
  timestamp: number;
  tokens: number;
  confidence: number;
  useCase: string;
}

export interface RequestMetrics {
  requestId: string;
  prompt: string;
  responseTime: number;
  tokenCount: number;
  fromCache: boolean;
  useCase: string;
  timestamp: number;
  success: boolean;
  error?: string;
}

export interface RateLimitInfo {
  requestsInWindow: number;
  maxRequests: number;
  remainingRequests: number;
  windowResetTime: number;
  isLimited: boolean;
}

export interface CacheStatistics {
  size: number;
  maxSize: number;
  hitRate: number;
  missRate: number;
  oldestEntry: number;
  newestEntry: number;
  totalHits: number;
  totalMisses: number;
}

export interface OptimizationReport {
  cacheStats: CacheStatistics;
  rateLimitInfo: RateLimitInfo;
  averageResponseTime: number;
  totalRequests: number;
  successRate: number;
  costSavings: {
    cachedRequests: number;
    estimatedTokensSaved: number;
    estimatedCostSaved: number;
  };
  recommendations: string[];
}

export type UseCase = 'biblical_guidance' | 'verse_explanation' | 'prayer_support' | 'quick_answer';

export type RequestPriority = 'high' | 'normal' | 'low';

export interface QueuedRequest {
  id: string;
  prompt: string;
  config: GeminiConfig;
  resolve: (response: string) => void;
  reject: (error: Error) => void;
  timestamp: number;
  priority: RequestPriority;
  useCase: UseCase;
  retryCount: number;
}

export interface StreamingOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}

export class GeminiOptimizationError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false,
    public rateLimited: boolean = false
  ) {
    super(message);
    this.name = 'GeminiOptimizationError';
  }
}

export interface BackoffStrategy {
  baseDelay: number;
  maxDelay: number;
  maxRetries: number;
  backoffFactor: number;
  jitterFactor: number;
}

export interface PerformanceMetrics {
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  averageTokensPerRequest: number;
  requestsPerMinute: number;
  errorRate: number;
  cacheHitRate: number;
}