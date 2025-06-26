// Enhanced audio service with Safari TTS integration and fallback mechanisms
import { safariTTS, SafariTTSService } from './safariTTSService';
import { synthesizeSpeech as elevenLabsSynthesize, playAudioBuffer, stopCurrentAudio } from './elevenLabsService';

export interface AudioPlaybackOptions {
  preferElevenLabs?: boolean;
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

export class EnhancedAudioService {
  private isElevenLabsAvailable = true;
  private isSafariTTSAvailable = false;
  private currentPlaybackMethod: 'elevenlabs' | 'safari-tts' | null = null;
  private initializationAttempted = false;

  constructor() {
    this.checkAvailability();
  }

  // Check what audio methods are available
  private async checkAvailability(): Promise<void> {
    // Check Safari TTS availability
    this.isSafariTTSAvailable = SafariTTSService.isSupported();
    
    console.log('🔍 Audio service availability check:', {
      elevenLabs: this.isElevenLabsAvailable,
      safariTTS: this.isSafariTTSAvailable,
      userAgent: navigator.userAgent.substring(0, 100)
    });
  }

  // Initialize audio services with user interaction
  async initializeWithUserInteraction(): Promise<void> {
    if (this.initializationAttempted) {
      return;
    }

    this.initializationAttempted = true;
    console.log('🎵 Initializing enhanced audio service...');

    try {
      // Initialize Safari TTS if available
      if (this.isSafariTTSAvailable) {
        await safariTTS.initialize();
        console.log('✅ Safari TTS initialized');
      }

      // Test ElevenLabs availability (don't fail if it doesn't work)
      try {
        // We'll test this when we actually need it
        console.log('✅ ElevenLabs service ready for testing');
      } catch (error) {
        console.warn('⚠️ ElevenLabs may not be available:', error);
        this.isElevenLabsAvailable = false;
      }

    } catch (error) {
      console.error('❌ Error initializing audio services:', error);
      throw error;
    }
  }

  // Main speak function with intelligent fallback
  async speak(text: string, options: AudioPlaybackOptions = {}): Promise<void> {
    console.log('🎤 Enhanced audio service speak request:', {
      textLength: text.length,
      preferElevenLabs: options.preferElevenLabs,
      elevenLabsAvailable: this.isElevenLabsAvailable,
      safariTTSAvailable: this.isSafariTTSAvailable
    });

    // Ensure initialization
    if (!this.initializationAttempted) {
      await this.initializeWithUserInteraction();
    }

    // Stop any current playback
    this.stop();

    // Determine which method to use
    const useElevenLabs = options.preferElevenLabs !== false && this.isElevenLabsAvailable;
    
    if (useElevenLabs) {
      try {
        console.log('🎵 Attempting ElevenLabs synthesis...');
        await this.speakWithElevenLabs(text, options);
        return;
      } catch (error) {
        console.warn('⚠️ ElevenLabs failed, falling back to Safari TTS:', error);
        this.isElevenLabsAvailable = false; // Mark as unavailable for future requests
        
        // Fall through to Safari TTS
      }
    }

    // Use Safari TTS as fallback or primary method
    if (this.isSafariTTSAvailable) {
      try {
        console.log('🍎 Using Safari TTS...');
        await this.speakWithSafariTTS(text, options);
        return;
      } catch (error) {
        console.error('❌ Safari TTS also failed:', error);
        options.onError?.(new Error('All audio methods failed'));
        throw error;
      }
    }

    // No audio methods available
    const error = new Error('No audio synthesis methods available');
    options.onError?.(error);
    throw error;
  }

  // Speak using ElevenLabs
  private async speakWithElevenLabs(text: string, options: AudioPlaybackOptions): Promise<void> {
    this.currentPlaybackMethod = 'elevenlabs';
    
    try {
      options.onStart?.();
      
      // Generate audio buffer
      const audioBuffer = await elevenLabsSynthesize(text);
      
      // Play audio buffer
      await playAudioBuffer(audioBuffer);
      
      options.onEnd?.();
      this.currentPlaybackMethod = null;
      
    } catch (error) {
      this.currentPlaybackMethod = null;
      throw error;
    }
  }

  // Speak using Safari TTS
  private async speakWithSafariTTS(text: string, options: AudioPlaybackOptions): Promise<void> {
    this.currentPlaybackMethod = 'safari-tts';
    
    try {
      await safariTTS.speak(text, {
        rate: options.rate,
        pitch: options.pitch,
        volume: options.volume,
        onStart: options.onStart,
        onEnd: () => {
          this.currentPlaybackMethod = null;
          options.onEnd?.();
        },
        onError: (error) => {
          this.currentPlaybackMethod = null;
          options.onError?.(new Error(error.error));
        }
      });
      
    } catch (error) {
      this.currentPlaybackMethod = null;
      throw error;
    }
  }

  // Stop current playback
  stop(): void {
    console.log('🛑 Stopping enhanced audio service');
    
    // Stop ElevenLabs audio
    stopCurrentAudio();
    
    // Stop Safari TTS
    safariTTS.stop();
    
    this.currentPlaybackMethod = null;
  }

  // Check if currently playing
  isPlaying(): boolean {
    switch (this.currentPlaybackMethod) {
      case 'elevenlabs':
        // We don't have a direct way to check ElevenLabs playback status
        return this.currentPlaybackMethod === 'elevenlabs';
      case 'safari-tts':
        return safariTTS.isSpeaking();
      default:
        return false;
    }
  }

  // Get service status
  getStatus(): {
    elevenLabsAvailable: boolean;
    safariTTSAvailable: boolean;
    currentMethod: string | null;
    isPlaying: boolean;
    browserInfo: any;
  } {
    return {
      elevenLabsAvailable: this.isElevenLabsAvailable,
      safariTTSAvailable: this.isSafariTTSAvailable,
      currentMethod: this.currentPlaybackMethod,
      isPlaying: this.isPlaying(),
      browserInfo: safariTTS.getBrowserInfo()
    };
  }

  // Test audio functionality
  async testAudio(): Promise<{
    elevenLabsWorks: boolean;
    safariTTSWorks: boolean;
    recommendedMethod: 'elevenlabs' | 'safari-tts' | 'none';
  }> {
    const testText = "Audio test";
    let elevenLabsWorks = false;
    let safariTTSWorks = false;

    // Test ElevenLabs
    if (this.isElevenLabsAvailable) {
      try {
        await this.speakWithElevenLabs(testText, {});
        elevenLabsWorks = true;
        console.log('✅ ElevenLabs test passed');
      } catch (error) {
        console.warn('❌ ElevenLabs test failed:', error);
        this.isElevenLabsAvailable = false;
      }
    }

    // Test Safari TTS
    if (this.isSafariTTSAvailable) {
      try {
        await this.speakWithSafariTTS(testText, {});
        safariTTSWorks = true;
        console.log('✅ Safari TTS test passed');
      } catch (error) {
        console.warn('❌ Safari TTS test failed:', error);
      }
    }

    // Determine recommended method
    let recommendedMethod: 'elevenlabs' | 'safari-tts' | 'none' = 'none';
    if (elevenLabsWorks) {
      recommendedMethod = 'elevenlabs';
    } else if (safariTTSWorks) {
      recommendedMethod = 'safari-tts';
    }

    return {
      elevenLabsWorks,
      safariTTSWorks,
      recommendedMethod
    };
  }
}

// Create singleton instance
export const enhancedAudio = new EnhancedAudioService();

// Convenience functions for backward compatibility
export const speakText = async (text: string, options: AudioPlaybackOptions = {}): Promise<void> => {
  return enhancedAudio.speak(text, options);
};

export const stopSpeaking = (): void => {
  enhancedAudio.stop();
};

export const initializeAudio = async (): Promise<void> => {
  return enhancedAudio.initializeWithUserInteraction();
};