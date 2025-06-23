import { LRUCache } from 'lru-cache';

// Enhanced Gemini API configuration
const GEMINI_API_KEY = 'AIzaSyDBysJ2sXRj7I2OXIHakLF_fFiXmJrIxOQ';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Response cache configuration
const responseCache = new LRUCache<string, CachedResponse>({
  max: 500, // Cache up to 500 responses
  ttl: 1000 * 60 * 30, // 30 minutes TTL
  updateAgeOnGet: true,
  allowStale: false
});

// Rate limiting configuration
interface RateLimiter {
  requests: number[];
  maxRequests: number;
  windowMs: number;
}

const rateLimiter: RateLimiter = {
  requests: [],
  maxRequests: 60, // 60 requests per minute (Gemini free tier limit)
  windowMs: 60 * 1000 // 1 minute window
};

// Request queue for batching
interface QueuedRequest {
  id: string;
  prompt: string;
  config: GenerationConfig;
  resolve: (response: string) => void;
  reject: (error: Error) => void;
  timestamp: number;
  priority: 'high' | 'normal' | 'low';
}

const requestQueue: QueuedRequest[] = [];
let isProcessingQueue = false;
let batchTimeout: NodeJS.Timeout | null = null;

// Cached response interface
interface CachedResponse {
  text: string;
  timestamp: number;
  tokens: number;
  confidence: number;
}

// Enhanced generation configuration
interface GenerationConfig {
  temperature: number;
  maxOutputTokens: number;
  topP: number;
  topK: number;
  candidateCount?: number;
  stopSequences?: string[];
}

// Use case specific configurations
const CONFIG_PRESETS = {
  biblical_guidance: {
    temperature: 0.7, // Balanced creativity for spiritual guidance
    maxOutputTokens: 200, // Concise responses for voice
    topP: 0.8,
    topK: 40
  },
  verse_explanation: {
    temperature: 0.5, // More focused for explanations
    maxOutputTokens: 250,
    topP: 0.7,
    topK: 30
  },
  prayer_support: {
    temperature: 0.8, // More empathetic and warm
    maxOutputTokens: 150,
    topP: 0.9,
    topK: 50
  },
  quick_answer: {
    temperature: 0.3, // Very focused for quick responses
    maxOutputTokens: 100,
    topP: 0.6,
    topK: 20
  }
} as const;

// Exponential backoff configuration
interface BackoffConfig {
  baseDelay: number;
  maxDelay: number;
  maxRetries: number;
  backoffFactor: number;
}

const BACKOFF_CONFIG: BackoffConfig = {
  baseDelay: 1000, // Start with 1 second
  maxDelay: 30000, // Max 30 seconds
  maxRetries: 3,
  backoffFactor: 2
};

// Request timeout configuration
const REQUEST_TIMEOUT = 15000; // 15 seconds

// Enhanced error types
class GeminiAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public retryable: boolean = false,
    public rateLimited: boolean = false
  ) {
    super(message);
    this.name = 'GeminiAPIError';
  }
}

// Generate cache key for requests
const generateCacheKey = (prompt: string, config: GenerationConfig): string => {
  const normalizedPrompt = prompt.toLowerCase().trim();
  const configHash = JSON.stringify(config);
  return `${normalizedPrompt}:${configHash}`;
};

// Check rate limiting
const checkRateLimit = (): boolean => {
  const now = Date.now();
  const windowStart = now - rateLimiter.windowMs;
  
  // Remove old requests outside the window
  rateLimiter.requests = rateLimiter.requests.filter(time => time > windowStart);
  
  // Check if we're under the limit
  if (rateLimiter.requests.length >= rateLimiter.maxRequests) {
    console.warn('⚠️ Rate limit reached, queuing request');
    return false;
  }
  
  // Add current request
  rateLimiter.requests.push(now);
  return true;
};

// Exponential backoff retry logic
const withExponentialBackoff = async <T>(
  operation: () => Promise<T>,
  config: BackoffConfig = BACKOFF_CONFIG
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on non-retryable errors
      if (error instanceof GeminiAPIError && !error.retryable) {
        throw error;
      }
      
      // Don't retry on the last attempt
      if (attempt === config.maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt),
        config.maxDelay
      );
      
      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * 1000;
      
      console.log(`🔄 Retry attempt ${attempt + 1}/${config.maxRetries} after ${Math.round(jitteredDelay)}ms`);
      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }
  
  throw lastError!;
};

// Detect use case from prompt
const detectUseCase = (prompt: string): keyof typeof CONFIG_PRESETS => {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('verse') || lowerPrompt.includes('scripture') || lowerPrompt.includes('bible passage')) {
    return 'verse_explanation';
  }
  
  if (lowerPrompt.includes('pray') || lowerPrompt.includes('prayer') || lowerPrompt.includes('comfort')) {
    return 'prayer_support';
  }
  
  if (lowerPrompt.length < 50 || lowerPrompt.includes('quick') || lowerPrompt.includes('brief')) {
    return 'quick_answer';
  }
  
  return 'biblical_guidance';
};

// Create timeout promise
const createTimeoutPromise = (ms: number): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new GeminiAPIError('Request timeout', 408, true)), ms);
  });
};

// Core API request function with timeout
const makeGeminiRequest = async (
  prompt: string,
  config: GenerationConfig,
  useStreaming: boolean = false
): Promise<string> => {
  const requestBody = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: config,
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      }
    ]
  };

  const endpoint = useStreaming ? 'streamGenerateContent' : 'generateContent';
  const url = `${GEMINI_BASE_URL}/gemini-2.0-flash:${endpoint}?key=${GEMINI_API_KEY}`;

  const requestPromise = fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  // Race between request and timeout
  const response = await Promise.race([
    requestPromise,
    createTimeoutPromise(REQUEST_TIMEOUT)
  ]);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const isRateLimited = response.status === 429;
    const isRetryable = response.status >= 500 || isRateLimited;
    
    throw new GeminiAPIError(
      errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      isRetryable,
      isRateLimited
    );
  }

  if (useStreaming) {
    return handleStreamingResponse(response);
  } else {
    return handleStandardResponse(response);
  }
};

// Handle standard response
const handleStandardResponse = async (response: Response): Promise<string> => {
  const data = await response.json();
  
  if (!data.candidates || data.candidates.length === 0) {
    throw new GeminiAPIError('No response generated', 500, true);
  }

  const generatedText = data.candidates[0]?.content?.parts?.[0]?.text;
  
  if (!generatedText) {
    throw new GeminiAPIError('Empty response generated', 500, true);
  }

  return generatedText.trim();
};

// Handle streaming response
const handleStreamingResponse = async (response: Response): Promise<string> => {
  if (!response.body) {
    throw new GeminiAPIError('No response body for streaming', 500, true);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonData = JSON.parse(line.slice(6));
            const text = jsonData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              fullText += text;
            }
          } catch (e) {
            // Skip invalid JSON lines
            continue;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!fullText.trim()) {
    throw new GeminiAPIError('Empty streaming response', 500, true);
  }

  return fullText.trim();
};

// Process request queue with batching
const processRequestQueue = async (): Promise<void> => {
  if (isProcessingQueue || requestQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  try {
    // Sort by priority and timestamp
    requestQueue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
    });

    // Process requests in batches
    const batchSize = Math.min(5, requestQueue.length); // Process up to 5 at once
    const batch = requestQueue.splice(0, batchSize);

    // Process batch concurrently with rate limiting
    const promises = batch.map(async (request) => {
      try {
        // Check rate limit before processing
        while (!checkRateLimit()) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const response = await generateGeminiResponseInternal(
          request.prompt,
          request.config,
          false // Don't queue again
        );
        
        request.resolve(response);
      } catch (error) {
        request.reject(error as Error);
      }
    });

    await Promise.allSettled(promises);

    // Continue processing if there are more requests
    if (requestQueue.length > 0) {
      setTimeout(processRequestQueue, 100);
    }
  } finally {
    isProcessingQueue = false;
  }
};

// Queue a request for batching
const queueRequest = (
  prompt: string,
  config: GenerationConfig,
  priority: 'high' | 'normal' | 'low' = 'normal'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const request: QueuedRequest = {
      id: Math.random().toString(36).substr(2, 9),
      prompt,
      config,
      resolve,
      reject,
      timestamp: Date.now(),
      priority
    };

    requestQueue.push(request);

    // Clear existing timeout and set new one
    if (batchTimeout) {
      clearTimeout(batchTimeout);
    }

    // Process queue after a short delay to allow batching
    batchTimeout = setTimeout(processRequestQueue, 50);
  });
};

// Internal generation function
const generateGeminiResponseInternal = async (
  prompt: string,
  config: GenerationConfig,
  allowQueueing: boolean = true
): Promise<string> => {
  // Check cache first
  const cacheKey = generateCacheKey(prompt, config);
  const cached = responseCache.get(cacheKey);
  
  if (cached) {
    console.log('💾 Using cached response');
    return cached.text;
  }

  // Check rate limiting
  if (!checkRateLimit()) {
    if (allowQueueing) {
      console.log('📋 Queueing request due to rate limit');
      return queueRequest(prompt, config, 'normal');
    } else {
      throw new GeminiAPIError('Rate limit exceeded', 429, true, true);
    }
  }

  // Determine if we should use streaming based on expected response length
  const useStreaming = config.maxOutputTokens > 150;

  // Make request with exponential backoff
  const response = await withExponentialBackoff(async () => {
    return makeGeminiRequest(prompt, config, useStreaming);
  });

  // Cache the response
  const cachedResponse: CachedResponse = {
    text: response,
    timestamp: Date.now(),
    tokens: response.split(' ').length, // Rough token estimate
    confidence: 0.9 // Default confidence
  };
  
  responseCache.set(cacheKey, cachedResponse);
  console.log('💾 Response cached');

  return response;
};

// Main public API function
export const generateGeminiResponse = async (
  userMessage: string,
  priority: 'high' | 'normal' | 'low' = 'normal'
): Promise<string> => {
  try {
    // Detect use case and get optimal configuration
    const useCase = detectUseCase(userMessage);
    const config = CONFIG_PRESETS[useCase];
    
    console.log(`🎯 Detected use case: ${useCase}`);
    console.log(`⚙️ Using config:`, config);

    // Create optimized system prompt
    const systemPrompt = createOptimizedPrompt(userMessage, useCase);

    // Generate response
    const response = await generateGeminiResponseInternal(systemPrompt, config);
    
    // Post-process response for voice synthesis
    return optimizeForVoice(response);

  } catch (error) {
    console.error('❌ Error in generateGeminiResponse:', error);
    
    // Return contextual fallback based on user message
    return getFallbackResponse(userMessage, error as Error);
  }
};

// Create optimized prompt based on use case
const createOptimizedPrompt = (userMessage: string, useCase: keyof typeof CONFIG_PRESETS): string => {
  const basePrompt = `You are a compassionate and knowledgeable Bible companion. Provide ${useCase.replace('_', ' ')} that is:
- Concise and suitable for voice synthesis
- Spiritually encouraging and biblically grounded
- Clear and easy to understand when spoken aloud
- Focused on the user's specific need

User request: ${userMessage}

Response:`;

  return basePrompt;
};

// Optimize response for voice synthesis
const optimizeForVoice = (text: string): string => {
  return text
    // Remove markdown formatting
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    // Ensure proper sentence spacing
    .replace(/\.\s+/g, '. ')
    // Remove excessive line breaks
    .replace(/\n{3,}/g, '\n\n')
    // Ensure it ends with proper punctuation
    .replace(/([^.!?])\s*$/, '$1.')
    .trim();
};

// Get contextual fallback response
const getFallbackResponse = (userMessage: string, error: Error): string => {
  const lowerMessage = userMessage.toLowerCase();
  
  if (error instanceof GeminiAPIError && error.rateLimited) {
    return "I'm receiving many requests right now. Please wait a moment and try again. God's patience is infinite, and so should ours be.";
  }
  
  if (lowerMessage.includes('verse') || lowerMessage.includes('scripture')) {
    return "I'm having trouble connecting right now, but here's a beautiful verse: 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future.' - Jeremiah 29:11";
  }
  
  if (lowerMessage.includes('pray') || lowerMessage.includes('prayer')) {
    return "Even when I can't connect fully, remember that God hears your prayers. 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.' - Philippians 4:6";
  }
  
  if (lowerMessage.includes('help') || lowerMessage.includes('guidance')) {
    return "I'm experiencing some connection issues, but God's guidance is always available. 'Trust in the Lord with all your heart and lean not on your own understanding.' - Proverbs 3:5";
  }
  
  return "I'm having trouble connecting to provide you with biblical guidance right now. Please try again in a moment. Remember, God is always with you.";
};

// Utility functions for monitoring and management

// Get cache statistics
export const getCacheStats = () => {
  return {
    size: responseCache.size,
    maxSize: responseCache.max,
    hitRate: responseCache.calculatedSize / (responseCache.calculatedSize + responseCache.size),
    oldestEntry: Math.min(...Array.from(responseCache.values()).map(v => v.timestamp))
  };
};

// Get rate limiting status
export const getRateLimitStatus = () => {
  const now = Date.now();
  const windowStart = now - rateLimiter.windowMs;
  const activeRequests = rateLimiter.requests.filter(time => time > windowStart);
  
  return {
    requestsInWindow: activeRequests.length,
    maxRequests: rateLimiter.maxRequests,
    remainingRequests: rateLimiter.maxRequests - activeRequests.length,
    windowResetTime: windowStart + rateLimiter.windowMs
  };
};

// Clear cache manually
export const clearCache = (): void => {
  responseCache.clear();
  console.log('🗑️ Response cache cleared');
};

// Test connection with optimized request
export const testGeminiConnection = async (): Promise<boolean> => {
  try {
    const testResponse = await generateGeminiResponseInternal(
      "Hello! Just testing the connection. Please respond with a brief greeting.",
      CONFIG_PRESETS.quick_answer,
      false // Don't queue test requests
    );
    
    return testResponse.length > 0;
  } catch (error) {
    console.error('❌ Gemini connection test failed:', error);
    return false;
  }
};

// Preload common responses for better performance
export const preloadCommonResponses = async (): Promise<void> => {
  const commonPrompts = [
    "Give me a verse for comfort",
    "Help me with prayer",
    "I need spiritual guidance",
    "Share a Bible verse about hope",
    "I'm feeling anxious"
  ];

  console.log('🚀 Preloading common responses...');
  
  const promises = commonPrompts.map(async (prompt) => {
    try {
      await generateGeminiResponse(prompt, 'low');
    } catch (error) {
      console.log(`Failed to preload: ${prompt}`);
    }
  });

  await Promise.allSettled(promises);
  console.log('✅ Common responses preloaded');
};