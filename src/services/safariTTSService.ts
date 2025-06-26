// Safari-specific Text-to-Speech service with Web Speech API fallback
export class SafariTTSService {
  private speechSynthesis: SpeechSynthesis | null = null;
  private isInitialized = false;
  private voices: SpeechSynthesisVoice[] = [];
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isPlaying = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.speechSynthesis = window.speechSynthesis;
  }

  // Initialize the TTS service with Safari-specific handling
  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._performInitialization();
    return this.initializationPromise;
  }

  private async _performInitialization(): Promise<void> {
    if (!this.speechSynthesis) {
      throw new Error('Speech synthesis not supported in this browser');
    }

    console.log('🍎 Initializing Safari TTS service...');

    try {
      // Safari requires user interaction to unlock speech synthesis
      await this.unlockSpeechSynthesis();
      
      // Load available voices
      await this.loadVoices();
      
      // Select the best voice for English
      this.selectPreferredVoice();
      
      this.isInitialized = true;
      console.log('✅ Safari TTS service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Safari TTS:', error);
      throw error;
    }
  }

  // Unlock speech synthesis with user interaction (Safari requirement)
  private async unlockSpeechSynthesis(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create a silent utterance to unlock the speech synthesis
        const unlockUtterance = new SpeechSynthesisUtterance('');
        unlockUtterance.volume = 0;
        unlockUtterance.rate = 10; // Very fast to minimize delay
        unlockUtterance.pitch = 1;
        
        let unlocked = false;
        
        const onEnd = () => {
          if (!unlocked) {
            unlocked = true;
            console.log('✅ Safari speech synthesis unlocked');
            resolve();
          }
        };
        
        const onError = (error: SpeechSynthesisErrorEvent) => {
          if (!unlocked) {
            unlocked = true;
            console.warn('⚠️ Speech synthesis unlock had issues:', error);
            // Don't reject - continue anyway as it might still work
            resolve();
          }
        };
        
        unlockUtterance.onend = onEnd;
        unlockUtterance.onerror = onError;
        
        // Timeout fallback
        setTimeout(() => {
          if (!unlocked) {
            unlocked = true;
            console.log('⏰ Speech synthesis unlock timeout - continuing anyway');
            resolve();
          }
        }, 1000);
        
        this.speechSynthesis!.speak(unlockUtterance);
        
      } catch (error) {
        console.error('❌ Error unlocking speech synthesis:', error);
        reject(error);
      }
    });
  }

  // Load available voices with Safari-specific handling
  private async loadVoices(): Promise<void> {
    return new Promise((resolve) => {
      const loadVoicesAttempt = () => {
        this.voices = this.speechSynthesis!.getVoices();
        
        if (this.voices.length > 0) {
          console.log(`✅ Loaded ${this.voices.length} voices for Safari TTS`);
          resolve();
        } else {
          // Safari sometimes needs time to load voices
          console.log('⏳ Waiting for Safari voices to load...');
          setTimeout(loadVoicesAttempt, 100);
        }
      };

      // Listen for voices changed event (Safari specific)
      if (this.speechSynthesis!.onvoiceschanged !== undefined) {
        this.speechSynthesis!.onvoiceschanged = () => {
          console.log('🔄 Safari voices changed event fired');
          loadVoicesAttempt();
        };
      }

      // Start loading voices
      loadVoicesAttempt();
      
      // Fallback timeout
      setTimeout(() => {
        if (this.voices.length === 0) {
          console.warn('⚠️ No voices loaded after timeout - using default');
          resolve();
        }
      }, 3000);
    });
  }

  // Select the best voice for English content
  private selectPreferredVoice(): void {
    if (this.voices.length === 0) {
      console.warn('⚠️ No voices available for selection');
      return;
    }

    // Priority order for voice selection
    const preferredVoiceNames = [
      'Samantha', // High-quality English voice on macOS/iOS
      'Alex', // Alternative high-quality voice
      'Victoria', // Another good option
      'Karen', // Fallback option
    ];

    // First, try to find a preferred voice by name
    for (const voiceName of preferredVoiceNames) {
      const voice = this.voices.find(v => 
        v.name.includes(voiceName) && 
        (v.lang.startsWith('en-') || v.lang === 'en')
      );
      if (voice) {
        this.preferredVoice = voice;
        console.log(`✅ Selected preferred voice: ${voice.name} (${voice.lang})`);
        return;
      }
    }

    // Fallback: find any English voice
    const englishVoice = this.voices.find(v => 
      v.lang.startsWith('en-') || v.lang === 'en'
    );
    
    if (englishVoice) {
      this.preferredVoice = englishVoice;
      console.log(`✅ Selected English voice: ${englishVoice.name} (${englishVoice.lang})`);
      return;
    }

    // Last resort: use the first available voice
    this.preferredVoice = this.voices[0];
    console.log(`⚠️ Using fallback voice: ${this.preferredVoice.name} (${this.preferredVoice.lang})`);
  }

  // Speak text with Safari-optimized settings
  async speak(text: string, options: {
    rate?: number;
    pitch?: number;
    volume?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: SpeechSynthesisErrorEvent) => void;
  } = {}): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.speechSynthesis) {
      throw new Error('Speech synthesis not available');
    }

    // Stop any current speech
    this.stop();

    return new Promise((resolve, reject) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configure utterance with Safari-optimized settings
        utterance.rate = options.rate ?? 0.9; // Slightly slower for clarity
        utterance.pitch = options.pitch ?? 1.0;
        utterance.volume = options.volume ?? 0.8; // Slightly lower to avoid distortion
        
        // Use preferred voice if available
        if (this.preferredVoice) {
          utterance.voice = this.preferredVoice;
        }

        let hasEnded = false;
        let hasStarted = false;

        // Event handlers
        utterance.onstart = () => {
          hasStarted = true;
          this.isPlaying = true;
          console.log('🎵 Safari TTS started speaking');
          options.onStart?.();
        };

        utterance.onend = () => {
          if (!hasEnded) {
            hasEnded = true;
            this.isPlaying = false;
            this.currentUtterance = null;
            console.log('✅ Safari TTS finished speaking');
            options.onEnd?.();
            resolve();
          }
        };

        utterance.onerror = (error) => {
          if (!hasEnded) {
            hasEnded = true;
            this.isPlaying = false;
            this.currentUtterance = null;
            console.error('❌ Safari TTS error:', error);
            options.onError?.(error);
            reject(new Error(`Speech synthesis error: ${error.error}`));
          }
        };

        // Safari-specific: handle pause/resume events
        utterance.onpause = () => {
          console.log('⏸️ Safari TTS paused');
        };

        utterance.onresume = () => {
          console.log('▶️ Safari TTS resumed');
        };

        // Store current utterance
        this.currentUtterance = utterance;

        // Start speaking
        this.speechSynthesis.speak(utterance);

        // Safari timeout fallback
        setTimeout(() => {
          if (!hasStarted && !hasEnded) {
            console.warn('⏰ Safari TTS timeout - speech may not have started');
            hasEnded = true;
            this.stop();
            reject(new Error('Speech synthesis timeout'));
          }
        }, 10000);

      } catch (error) {
        console.error('❌ Error creating Safari TTS utterance:', error);
        reject(error);
      }
    });
  }

  // Stop current speech
  stop(): void {
    if (this.speechSynthesis && this.isPlaying) {
      console.log('🛑 Stopping Safari TTS');
      this.speechSynthesis.cancel();
      this.isPlaying = false;
      this.currentUtterance = null;
    }
  }

  // Check if currently speaking
  isSpeaking(): boolean {
    return this.isPlaying && this.speechSynthesis?.speaking === true;
  }

  // Get available voices
  getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  // Get current preferred voice
  getPreferredVoice(): SpeechSynthesisVoice | null {
    return this.preferredVoice;
  }

  // Set preferred voice
  setPreferredVoice(voice: SpeechSynthesisVoice): void {
    this.preferredVoice = voice;
    console.log(`✅ Set preferred voice to: ${voice.name} (${voice.lang})`);
  }

  // Check if TTS is supported
  static isSupported(): boolean {
    return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }

  // Get browser-specific information
  getBrowserInfo(): {
    isSafari: boolean;
    isIOS: boolean;
    supportsTTS: boolean;
    voiceCount: number;
  } {
    const userAgent = navigator.userAgent;
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    
    return {
      isSafari,
      isIOS,
      supportsTTS: SafariTTSService.isSupported(),
      voiceCount: this.voices.length
    };
  }
}

// Create singleton instance
export const safariTTS = new SafariTTSService();