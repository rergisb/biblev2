const ELEVENLABS_API_KEY = 'sk_0a236e276dde22d5f926d20bd3d0a63b7ad9a6ddf6cca72d';
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Using a popular voice ID from ElevenLabs (Rachel - a warm, friendly voice)
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export const defaultVoiceSettings: VoiceSettings = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.5,
  use_speaker_boost: true
};

// Global audio context for better mobile support
let audioContext: AudioContext | null = null;
let currentAudioSource: AudioBufferSourceNode | null = null;

// Detect mobile devices
const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

// Enhanced audio context initialization with mobile-specific handling
const initializeAudioContext = async (): Promise<AudioContext> => {
  if (!audioContext) {
    try {
      console.log('🔊 Initializing audio context for mobile...');
      
      // Use webkitAudioContext for Safari compatibility
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContext = new AudioContextClass();
      
      console.log('📱 Audio context created, state:', audioContext.state);
      
      // Resume context if suspended (required for mobile)
      if (audioContext.state === 'suspended') {
        console.log('🔄 Resuming suspended audio context...');
        await audioContext.resume();
        console.log('✅ Audio context resumed, new state:', audioContext.state);
      }
      
      // For iOS, create a dummy audio node to fully unlock the context
      if (isIOS) {
        console.log('🍎 iOS detected - creating dummy audio to unlock context...');
        try {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.01);
          
          console.log('✅ iOS audio context unlocked');
        } catch (iosError) {
          console.warn('⚠️ iOS audio unlock failed:', iosError);
        }
      }
      
      console.log('✅ Audio context initialized successfully:', audioContext.state);
    } catch (error) {
      console.error('❌ Failed to initialize audio context:', error);
      throw new Error('Audio not supported on this device');
    }
  }
  
  // Ensure context is running
  if (audioContext.state === 'suspended') {
    console.log('🔄 Resuming audio context...');
    await audioContext.resume();
    console.log('✅ Audio context resumed');
  }
  
  return audioContext;
};

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

// Get voice settings from localStorage or fallback to default
const getVoiceSettings = (): VoiceSettings => {
  try {
    const config = localStorage.getItem('elevenlabs-config');
    if (config) {
      const parsed = JSON.parse(config);
      return parsed.voiceSettings || defaultVoiceSettings;
    }
  } catch (error) {
    console.error('Error reading voice settings:', error);
  }
  return defaultVoiceSettings;
};

// Get voice ID from localStorage or fallback to default
const getVoiceId = (): string => {
  try {
    const config = localStorage.getItem('elevenlabs-config');
    if (config) {
      const parsed = JSON.parse(config);
      return parsed.voiceId || DEFAULT_VOICE_ID;
    }
  } catch (error) {
    console.error('Error reading voice ID:', error);
  }
  return DEFAULT_VOICE_ID;
};

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

export const synthesizeSpeech = async (
  text: string,
  voiceId?: string,
  voiceSettings?: VoiceSettings,
  testApiKey?: string
): Promise<ArrayBuffer> => {
  try {
    const apiKey = testApiKey || getApiKey();
    const finalVoiceId = voiceId || getVoiceId();
    const finalVoiceSettings = voiceSettings || getVoiceSettings();

    console.log('🎤 Synthesizing speech:', { text: text.substring(0, 50) + '...', voiceId: finalVoiceId });

    const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${finalVoiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: finalVoiceSettings
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    console.log('✅ Speech synthesis completed, buffer size:', audioBuffer.byteLength);
    return audioBuffer;
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    throw error;
  }
};

// Enhanced audio playback with improved mobile support
export const playAudioBuffer = async (audioBuffer: ArrayBuffer): Promise<void> => {
  try {
    console.log('🔊 Starting audio playback for mobile...');
    
    // Stop any currently playing audio
    stopCurrentAudio();
    
    // For mobile devices, try HTML5 audio first as it's more reliable
    if (isMobile) {
      console.log('📱 Using mobile-optimized HTML5 audio playback...');
      return playAudioBufferMobile(audioBuffer);
    }
    
    // For desktop, use Web Audio API
    console.log('🖥️ Using Web Audio API for desktop...');
    return playAudioBufferWebAudio(audioBuffer);
    
  } catch (error) {
    console.error('❌ Error in playAudioBuffer:', error);
    
    // Fallback to HTML5 audio for any device if Web Audio fails
    console.log('🔄 Falling back to HTML5 audio...');
    return playAudioBufferMobile(audioBuffer);
  }
};

// Mobile-optimized HTML5 audio playback
const playAudioBufferMobile = (audioBuffer: ArrayBuffer): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      console.log('📱 Setting up mobile HTML5 audio playback...');
      
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio();
      
      // Store reference globally for stopping
      (window as any).currentAudio = audio;
      
      // Enhanced mobile compatibility settings
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      audio.volume = 1.0;
      audio.muted = false;
      
      // iOS Safari specific settings
      if (isIOS) {
        console.log('🍎 Applying iOS-specific audio settings...');
        audio.playsInline = true;
        (audio as any).webkitPlaysInline = true;
      }
      
      let hasEnded = false;
      let hasStarted = false;
      
      const cleanup = () => {
        if (!hasEnded) {
          hasEnded = true;
          URL.revokeObjectURL(audioUrl);
          if ((window as any).currentAudio === audio) {
            (window as any).currentAudio = null;
          }
        }
      };
      
      // Success handlers
      audio.oncanplaythrough = () => {
        console.log('✅ Mobile audio can play through');
      };
      
      audio.onloadeddata = () => {
        console.log('✅ Mobile audio data loaded');
      };
      
      audio.onplay = () => {
        console.log('✅ Mobile audio started playing');
        hasStarted = true;
      };
      
      audio.onended = () => {
        console.log('✅ Mobile audio playback completed');
        cleanup();
        resolve();
      };
      
      // Error handlers
      audio.onerror = (error) => {
        console.error('❌ Mobile audio playback error:', error);
        cleanup();
        reject(new Error('Mobile audio playback failed'));
      };
      
      audio.onpause = () => {
        if (!hasEnded && hasStarted) {
          console.log('🔇 Mobile audio manually paused');
          cleanup();
          resolve();
        }
      };
      
      // Set the source and load
      audio.src = audioUrl;
      audio.load();
      
      // Enhanced play with better error handling for mobile
      const attemptPlay = async () => {
        try {
          console.log('🎵 Attempting to play mobile audio...');
          const playPromise = audio.play();
          
          if (playPromise !== undefined) {
            await playPromise;
            console.log('✅ Mobile audio play promise resolved');
          }
        } catch (playError) {
          console.error('❌ Mobile audio play failed:', playError);
          
          // Handle specific mobile errors with user-friendly messages
          if (playError instanceof Error) {
            if (playError.name === 'NotAllowedError') {
              cleanup();
              reject(new Error('Please tap the screen first to enable audio on your device'));
            } else if (playError.name === 'NotSupportedError') {
              cleanup();
              reject(new Error('Audio format not supported on this device'));
            } else if (playError.name === 'AbortError') {
              cleanup();
              reject(new Error('Audio playback was interrupted'));
            } else {
              cleanup();
              reject(playError);
            }
          } else {
            cleanup();
            reject(new Error('Unknown audio playback error'));
          }
        }
      };
      
      // Small delay before attempting to play (helps with mobile)
      setTimeout(attemptPlay, 100);
      
      // Fallback timeout for mobile devices
      setTimeout(() => {
        if (!hasEnded && !hasStarted) {
          console.warn('⏰ Mobile audio playback timeout');
          cleanup();
          reject(new Error('Audio playback timeout - device may be in silent mode'));
        }
      }, 15000);
      
    } catch (error) {
      console.error('❌ Error creating mobile audio:', error);
      reject(error);
    }
  });
};

// Web Audio API playback for desktop
const playAudioBufferWebAudio = async (audioBuffer: ArrayBuffer): Promise<void> => {
  try {
    console.log('🖥️ Setting up Web Audio API playback...');
    
    // Initialize audio context
    const context = await initializeAudioContext();
    
    // Decode audio data
    const decodedBuffer = await context.decodeAudioData(audioBuffer.slice(0));
    console.log('✅ Audio buffer decoded successfully');
    
    // Create audio source
    const source = context.createBufferSource();
    source.buffer = decodedBuffer;
    source.connect(context.destination);
    
    // Store reference for stopping
    currentAudioSource = source;
    
    return new Promise((resolve, reject) => {
      let hasEnded = false;
      
      const cleanup = () => {
        if (!hasEnded) {
          hasEnded = true;
          if (currentAudioSource === source) {
            currentAudioSource = null;
          }
        }
      };
      
      source.onended = () => {
        console.log('✅ Web Audio playback completed');
        cleanup();
        resolve();
      };
      
      // Handle errors
      const handleError = (error: any) => {
        console.error('❌ Web Audio playback error:', error);
        cleanup();
        reject(new Error('Web Audio playback failed'));
      };
      
      try {
        // Start playback
        source.start(0);
        console.log('🎵 Web Audio source started');
        
        // Fallback timeout
        setTimeout(() => {
          if (!hasEnded) {
            console.warn('⏰ Web Audio playback timeout');
            cleanup();
            reject(new Error('Web Audio playback timeout'));
          }
        }, 30000);
        
      } catch (error) {
        handleError(error);
      }
    });
    
  } catch (error) {
    console.error('❌ Error in Web Audio playback:', error);
    throw error;
  }
};

// Function to stop currently playing audio
export const stopCurrentAudio = (): void => {
  // Stop Web Audio API source
  if (currentAudioSource) {
    try {
      console.log('🛑 Stopping Web Audio API source');
      currentAudioSource.stop();
      currentAudioSource = null;
    } catch (error) {
      console.log('Note: Audio source already stopped');
      currentAudioSource = null;
    }
  }
  
  // Stop HTML5 audio fallback
  const currentAudio = (window as any).currentAudio;
  if (currentAudio && !currentAudio.paused) {
    console.log('🛑 Stopping HTML5 audio');
    currentAudio.pause();
    currentAudio.currentTime = 0;
    (window as any).currentAudio = null;
  }
};

// Enhanced audio context preparation with mobile-specific handling
export const prepareAudioContext = async (): Promise<void> => {
  try {
    console.log('🔊 Preparing audio context with mobile support...');
    
    await initializeAudioContext();
    
    // Additional mobile preparation
    if (isMobile) {
      console.log('📱 Performing additional mobile audio preparation...');
      
      // Create a very short silent audio to fully unlock mobile audio
      try {
        const context = audioContext!;
        const buffer = context.createBuffer(1, 1, 22050);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(0);
        
        console.log('✅ Mobile audio context fully prepared');
      } catch (mobileError) {
        console.warn('⚠️ Mobile audio preparation warning:', mobileError);
      }
    }
    
    console.log('✅ Audio context prepared for playback');
  } catch (error) {
    console.error('❌ Failed to prepare audio context:', error);
    throw error;
  }
};

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