// Safari-specific Text-to-Speech service with Web Speech API fallback
export class SafariTTSService {
  private speechSynthesis: SpeechSynthesis | null = null;
  private isInitialized = false;
  private voices: SpeechSynthesisVoice[] = [];
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isPlaying = false;
  private initializationPromise: Promise<void> | null = null;
  private isUnlocked = false;

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

  // Enhanced unlock speech synthesis with better iOS compatibility
  private async unlockSpeechSynthesis(): Promise<void> {
    if (this.isUnlocked) {
      console.log('✅ Safari speech synthesis already unlocked');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        console.log('🔓 Attempting to unlock Safari speech synthesis...');
        
        // Create a very short, barely audible utterance to unlock the speech synthesis
        // Using a single letter instead of empty string for better iOS compatibility
        const unlockUtterance = new SpeechSynthesisUtterance('a');
        unlockUtterance.volume = 0.001; // Very quiet but not silent
        unlockUtterance.rate = 10; // Very fast to minimize audible impact
        unlockUtterance.pitch = 1;
        
        let unlocked = false;
        let attempts = 0;
        const maxAttempts = 3;
        
        const attemptUnlock = () => {
          attempts++;
          console.log(`🔄 Unlock attempt ${attempts}/${maxAttempts}`);
          
          const onEnd = () => {
            if (!unlocked) {
              unlocked = true;
              this.isUnlocked = true;
              console.log('✅ Safari speech synthesis unlocked successfully');
              resolve();
            }
          };
          
          const onError = (error: SpeechSynthesisErrorEvent) => {
            console.warn(`⚠️ Speech synthesis unlock attempt ${attempts} had issues:`, error);
            
            if (attempts < maxAttempts) {
              // Try again with a slight delay
              setTimeout(() => {
                if (!unlocked) {
                  attemptUnlock();
                }
              }, 500);
            } else if (!unlocked) {
              unlocked = true;
              this.isUnlocked = true; // Mark as unlocked anyway
              console.log('⚠️ Speech synthesis unlock completed with warnings - continuing anyway');
              resolve();
            }
          };
          
          const onStart = () => {
            console.log(`🎵 Unlock utterance ${attempts} started`);
          };
          
          unlockUtterance.onend = onEnd;
          unlockUtterance.onerror = onError;
          unlockUtterance.onstart = onStart;
          
          try {
            // Cancel any previous speech before attempting unlock
            this.speechSynthesis!.cancel();
            
            // Small delay to ensure cancel is processed
            setTimeout(() => {
              this.speechSynthesis!.speak(unlockUtterance);
            }, 100);
            
          } catch (speakError) {
            console.error(`❌ Error speaking unlock utterance ${attempts}:`, speakError);
            if (attempts < maxAttempts) {
              setTimeout(() => {
                if (!unlocked) {
                  attemptUnlock();
                }
              }, 500);
            } else {
              onError(speakError as SpeechSynthesisErrorEvent);
            }
          }
        };
        
        // Start the first unlock attempt
        attemptUnlock();
        
        // Extended timeout fallback for iOS
        setTimeout(() => {
          if (!unlocked) {
            unlocked = true;
            this.isUnlocked = true;
            console.log('⏰ Speech synthesis unlock timeout - marking as unlocked and continuing');
            resolve();
          }
        }, 5000); // Increased from 1000ms to 5000ms for better iOS compatibility
        
      } catch (error) {
        console.error('❌ Error in unlockSpeechSynthesis:', error);
        // Don't reject - mark as unlocked and continue
        this.isUnlocked = true;
        resolve();
      }
    });
  }

  // Load available voices with Safari-specific handling
  private async loadVoices(): Promise<void> {
    return new Promise((resolve) => {
      let voiceLoadAttempts = 0;
      const maxVoiceLoadAttempts = 10;
      
      const loadVoicesAttempt = () => {
        voiceLoadAttempts++;
        this.voices = this.speechSynthesis!.getVoices();
        
        if (this.voices.length > 0) {
          console.log(`✅ Loaded ${this.voices.length} voices for Safari TTS (attempt ${voiceLoadAttempts})`);
          resolve();
        } else if (voiceLoadAttempts < maxVoiceLoadAttempts) {
          // Safari sometimes needs time to load voices
          console.log(`⏳ Waiting for Safari voices to load... (attempt ${voiceLoadAttempts}/${maxVoiceLoadAttempts})`);
          setTimeout(loadVoicesAttempt, 200);
        } else {
          console.warn('⚠️ No voices loaded after maximum attempts - continuing with default');
          resolve();
        }
      };

      // Listen for voices changed event (Safari specific)
      if (this.speechSynthesis!.onvoiceschanged !== undefined) {
        this.speechSynthesis!.onvoiceschanged = () => {
          console.log('🔄 Safari voices changed event fired');
          if (this.voices.length === 0) {
            loadVoicesAttempt();
          }
        };
      }

      // Start loading voices immediately
      loadVoicesAttempt();
    });
  }

  // Select the best voice for English content
  private selectPreferredVoice(): void {
    if (this.voices.length === 0) {
      console.warn('⚠️ No voices available for selection');
      return;
    }

    // Priority order for voice selection (optimized for iOS)
    const preferredVoiceNames = [
      'Samantha', // High-quality English voice on macOS/iOS
      'Alex', // Alternative high-quality voice
      'Victoria', // Another good option
      'Karen', // Fallback option
      'Daniel', // iOS specific
      'Moira', // iOS specific
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

  // Enhanced speak method with better iOS handling
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

    // Ensure we're unlocked before speaking
    if (!this.isUnlocked) {
      console.log('🔓 Re-attempting unlock before speaking...');
      await this.unlockSpeechSynthesis();
    }

    // Stop any current speech
    this.stop();

    return new Promise((resolve, reject) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configure utterance with iOS-optimized settings
        utterance.rate = options.rate ?? 0.8; // Slightly slower for better iOS compatibility
        utterance.pitch = options.pitch ?? 1.0;
        utterance.volume = options.volume ?? 0.9; // Higher volume for iOS
        
        // Use preferred voice if available
        if (this.preferredVoice) {
          utterance.voice = this.preferredVoice;
          console.log(`🎵 Using voice: ${this.preferredVoice.name}`);
        }

        let hasEnded = false;
        let hasStarted = false;
        let startTimeout: NodeJS.Timeout;
        let endTimeout: NodeJS.Timeout;

        const cleanup = () => {
          if (startTimeout) clearTimeout(startTimeout);
          if (endTimeout) clearTimeout(endTimeout);
        };

        // Event handlers with enhanced iOS compatibility
        utterance.onstart = () => {
          hasStarted = true;
          this.isPlaying = true;
          cleanup();
          console.log('🎵 Safari TTS started speaking');
          options.onStart?.();
          
          // Set a reasonable timeout for completion
          endTimeout = setTimeout(() => {
            if (!hasEnded) {
              console.warn('⏰ Safari TTS taking longer than expected, but continuing...');
            }
          }, Math.max(text.length * 100, 5000)); // Dynamic timeout based on text length
        };

        utterance.onend = () => {
          if (!hasEnded) {
            hasEnded = true;
            this.isPlaying = false;
            this.currentUtterance = null;
            cleanup();
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
            cleanup();
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

        // Enhanced start mechanism for iOS
        try {
          // Ensure speech synthesis is ready
          if (this.speechSynthesis.paused) {
            this.speechSynthesis.resume();
          }
          
          // Cancel any lingering speech
          this.speechSynthesis.cancel();
          
          // Small delay to ensure cancel is processed
          setTimeout(() => {
            try {
              console.log(`🎵 Starting Safari TTS for text: "${text.substring(0, 50)}..."`);
              this.speechSynthesis!.speak(utterance);
              
              // Timeout for start detection
              startTimeout = setTimeout(() => {
                if (!hasStarted && !hasEnded) {
                  console.warn('⏰ Safari TTS timeout - speech may not have started');
                  hasEnded = true;
                  this.stop();
                  cleanup();
                  reject(new Error('Speech synthesis timeout'));
                }
              }, 15000); // Increased timeout for iOS
              
            } catch (speakError) {
              console.error('❌ Error starting Safari TTS:', speakError);
              cleanup();
              reject(speakError);
            }
          }, 100);
          
        } catch (error) {
          console.error('❌ Error preparing Safari TTS:', error);
          cleanup();
          reject(error);
        }

      } catch (error) {
        console.error('❌ Error creating Safari TTS utterance:', error);
        reject(error);
      }
    });
  }

  // Enhanced stop method
  stop(): void {
    if (this.speechSynthesis && this.isPlaying) {
      console.log('🛑 Stopping Safari TTS');
      try {
        this.speechSynthesis.cancel();
        // Also try pause as a fallback
        if (this.speechSynthesis.speaking) {
          this.speechSynthesis.pause();
        }
      } catch (error) {
        console.warn('⚠️ Error stopping Safari TTS:', error);
      }
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
    isUnlocked: boolean;
  } {
    const userAgent = navigator.userAgent;
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    
    return {
      isSafari,
      isIOS,
      supportsTTS: SafariTTSService.isSupported(),
      voiceCount: this.voices.length,
      isUnlocked: this.isUnlocked
    };
  }

  // Force re-unlock (useful for debugging)
  async forceUnlock(): Promise<void> {
    this.isUnlocked = false;
    await this.unlockSpeechSynthesis();
  }
}

// Create singleton instance
export const safariTTS = new SafariTTSService();