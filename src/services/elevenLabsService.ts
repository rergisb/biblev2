// ElevenLabs service - now only for speech recognition (speech-to-text)
// Text-to-speech functionality has been moved to speechService.ts

const ELEVENLABS_API_KEY = 'sk_0a236e276dde22d5f926d20bd3d0a63b7ad9a6ddf6cca72d';
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Get API key from localStorage or fallback to default
const getApiKey = (): string => {
  try {
    const config = localStorage.getItem('elevenlabs-config');
    if (config) {
      const parsed = JSON.parse(config);
      return parsed.apiKey || ELEVENLABS_API_KEY;
    }
  } catch (error) {
    console.error('Error reading API config:', error);
  }
  return ELEVENLABS_API_KEY;
};

// Test API connection for speech recognition features
export const testApiConnection = async (testApiKey?: string): Promise<boolean> => {
  try {
    const apiKey = testApiKey || getApiKey();
    
    const response = await fetch(`${ELEVENLABS_API_URL}/user`, {
      headers: {
        'xi-api-key': apiKey
      }
    });

    return response.ok;
  } catch (error) {
    console.error('API connection test failed:', error);
    return false;
  }
};

// Note: Speech synthesis functions have been removed and moved to speechService.ts
// This service now only handles ElevenLabs API connectivity for potential future speech recognition features

export const getAvailableVoices = async (testApiKey?: string) => {
  try {
    const apiKey = testApiKey || getApiKey();
    
    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        'xi-api-key': apiKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching voices:', error);
    throw error;
  }
};