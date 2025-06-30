import { Howl } from 'howler';

// Background audio service using Howler.js for better cross-browser compatibility
class BackgroundAudioService {
  private howl: Howl | null = null;
  private fadeInterval: NodeJS.Timeout | null = null;
  private isPlaying: boolean = false;
  private targetVolume: number = 0.2; // Slightly higher volume for better presence
  private fadeStep: number = 0.03; // Faster fade for more responsive feel
  private fadeIntervalMs: number = 30; // Smoother fade transitions
  private isInitialized: boolean = false;
  private isFadingOut: boolean = false;

  constructor() {
    this.initializeAudio();
  }

  private initializeAudio(): void {
    try {
      console.log('🎵 Initializing background audio with Howler.js...');
      const audioUrl = 'https://pkimavazdqutcxnqwoit.supabase.co/storage/v1/object/public/audio-files/Puzzle-Game-Loading.mp3';
      console.log('🔗 Audio URL:', audioUrl);
      
      this.howl = new Howl({
        src: [audioUrl],
        loop: true, // Enable seamless looping
        volume: 0,
        preload: true,
        html5: false, // Use Web Audio API for better performance and seamless looping
        format: ['mp3'],
        autoplay: false,
        onload: () => {
          console.log('✅ Background audio loaded successfully with Howler.js');
          console.log('📊 Audio duration:', this.howl?.duration(), 'seconds');
          console.log('📊 Audio state after load:', this.howl?.state());
          this.isInitialized = true;
        },
        onloaderror: (id, error) => {
          console.error('❌ Background audio load error:', error);
          console.error('🔍 Error details:', {
            id,
            error,
            src: this.howl?._src,
            state: this.howl?.state(),
            errorType: typeof error,
            errorMessage: error?.message || 'No error message',
            timestamp: new Date().toISOString()
          });
          
          // Fallback to HTML5 audio if Web Audio fails
          console.log('🔄 Retrying with HTML5 audio...');
          this.retryWithHtml5();
        },
        onplayerror: (id, error) => {
          console.error('❌ Background audio play error:', error);
          console.error('🔍 Play error details:', {
            id,
            error,
            state: this.howl?.state(),
            playing: this.howl?.playing(),
            volume: this.howl?.volume(),
            duration: this.howl?.duration(),
            errorType: typeof error,
            errorMessage: error?.message || 'No error message',
            timestamp: new Date().toISOString()
          });
          
          // Try to unlock audio context and retry
          this.unlockAudioAndRetry();
        },
        onplay: () => {
          console.log('✅ Background audio started playing');
          console.log('📊 Playback info:', {
            volume: this.howl?.volume(),
            duration: this.howl?.duration(),
            state: this.howl?.state(),
            playing: this.howl?.playing(),
            loop: this.howl?.loop()
          });
          this.isPlaying = true;
        },
        onpause: () => {
          console.log('🔇 Background audio paused');
          this.isPlaying = false;
        },
        onstop: () => {
          console.log('🛑 Background audio stopped');
          this.isPlaying = false;
          this.isFadingOut = false;
        },
        onend: () => {
          // This shouldn't happen with loop=true, but handle it gracefully
          console.log('🔄 Background audio ended (unexpected with loop=true)');
          if (this.isPlaying && !this.isFadingOut) {
            console.log('🔄 Restarting background audio to maintain loop');
            setTimeout(() => {
              if (this.howl && this.isPlaying) {
                this.howl.play();
              }
            }, 50);
          }
        },
        onfade: () => {
          console.log('🎚️ Background audio fade event');
        }
      });
      
      console.log('🎵 Howl instance created:', {
        state: this.howl.state(),
        duration: this.howl.duration(),
        volume: this.howl.volume(),
        loop: this.howl.loop()
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize background audio with Howler.js:', error);
      console.error('🔍 Initialization error details:', {
        error,
        errorType: typeof error,
        errorMessage: error?.message || 'No error message',
        stack: error?.stack
      });
    }
  }

  private retryWithHtml5(): void {
    try {
      console.log('🔄 Retrying background audio with HTML5...');
      const audioUrl = 'https://pkimavazdqutcxnqwoit.supabase.co/storage/v1/object/public/audio-files/Puzzle-Game-Loading.mp3';
      
      this.howl = new Howl({
        src: [audioUrl],
        loop: true,
        volume: 0,
        preload: true,
        html5: true, // Force HTML5 audio
        format: ['mp3'],
        autoplay: false,
        onload: () => {
          console.log('✅ Background audio loaded with HTML5 fallback');
          this.isInitialized = true;
        },
        onloaderror: (id, error) => {
          console.error('❌ HTML5 fallback also failed:', error);
        },
        onplay: () => {
          console.log('✅ Background audio playing with HTML5');
          this.isPlaying = true;
        },
        onstop: () => {
          this.isPlaying = false;
          this.isFadingOut = false;
        }
      });
    } catch (error) {
      console.error('❌ HTML5 fallback initialization failed:', error);
    }
  }

  private unlockAudioAndRetry(): void {
    console.log('🔓 Attempting to unlock audio context...');
    
    // Try to resume audio context if suspended
    if (typeof window !== 'undefined' && window.AudioContext) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('✅ Audio context resumed');
          // Retry playing after a short delay
          setTimeout(() => {
            if (this.howl && this.isPlaying) {
              this.howl.play();
            }
          }, 100);
        }).catch(error => {
          console.error('❌ Failed to resume audio context:', error);
        });
      }
    }
  }

  public async startBackgroundAudio(): Promise<void> {
    console.log('🎵 startBackgroundAudio called');
    console.log('📊 Current state:', {
      isInitialized: this.isInitialized,
      isPlaying: this.isPlaying,
      isFadingOut: this.isFadingOut,
      howlState: this.howl?.state(),
      howlExists: !!this.howl
    });

    if (!this.howl || this.isPlaying) {
      console.log('⏭️ Background audio already playing or not initialized');
      return;
    }

    // Reset fading state
    this.isFadingOut = false;

    // Wait for initialization if needed
    if (!this.isInitialized) {
      console.log('⏳ Waiting for background audio to initialize...');
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max wait
      
      while (!this.isInitialized && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
        console.log(`⏳ Waiting attempt ${attempts}/${maxAttempts}, state: ${this.howl?.state()}`);
      }
      
      if (!this.isInitialized) {
        console.error('❌ Background audio failed to initialize within timeout');
        console.error('📊 Final state:', {
          isInitialized: this.isInitialized,
          howlState: this.howl?.state(),
          duration: this.howl?.duration()
        });
        return;
      }
    }

    try {
      console.log('🎵 Starting background audio with seamless loop...');
      console.log('📊 Pre-play state:', {
        state: this.howl.state(),
        volume: this.howl.volume(),
        duration: this.howl.duration(),
        playing: this.howl.playing(),
        loop: this.howl.loop()
      });
      
      // Ensure volume starts at 0 for smooth fade in
      this.howl.volume(0);
      
      // Start playing
      const soundId = this.howl.play();
      
      console.log('🎵 Play method called, sound ID:', soundId);
      console.log('📊 Post-play state:', {
        state: this.howl.state(),
        volume: this.howl.volume(),
        playing: this.howl.playing(),
        soundId,
        loop: this.howl.loop()
      });
      
      if (soundId) {
        // Start fade in immediately
        this.fadeIn();
        console.log('✅ Background audio play initiated with seamless loop, sound ID:', soundId);
      } else {
        console.error('❌ Failed to get sound ID from Howler.js play()');
        this.isPlaying = false;
      }
      
    } catch (error) {
      console.error('❌ Failed to start background audio:', error);
      console.error('🔍 Start error details:', {
        error,
        errorType: typeof error,
        errorMessage: error?.message || 'No error message',
        stack: error?.stack
      });
      this.isPlaying = false;
    }
  }

  public stopBackgroundAudio(): void {
    console.log('🔇 stopBackgroundAudio called');
    console.log('📊 Current state:', {
      isPlaying: this.isPlaying,
      isFadingOut: this.isFadingOut,
      howlExists: !!this.howl,
      howlState: this.howl?.state(),
      howlPlaying: this.howl?.playing()
    });

    if (!this.howl || !this.isPlaying || this.isFadingOut) {
      console.log('⏭️ Background audio not playing, not initialized, or already fading out');
      return;
    }

    console.log('🔇 Stopping background audio with fade out...');
    this.isFadingOut = true;
    this.fadeOut();
  }

  private fadeIn(): void {
    if (!this.howl || this.isFadingOut) return;
    
    console.log('📈 Starting fade in...');
    
    // Clear any existing fade
    this.clearFadeInterval();
    
    this.fadeInterval = setInterval(() => {
      if (!this.howl || this.isFadingOut) {
        this.clearFadeInterval();
        return;
      }
      
      const currentVolume = this.howl.volume();
      if (currentVolume < this.targetVolume) {
        const newVolume = Math.min(this.targetVolume, currentVolume + this.fadeStep);
        this.howl.volume(newVolume);
        console.log('📈 Fade in progress:', newVolume.toFixed(3));
      } else {
        this.clearFadeInterval();
        console.log('✅ Background audio fade in complete at volume:', this.targetVolume);
      }
    }, this.fadeIntervalMs);
  }

  private fadeOut(): void {
    if (!this.howl) return;
    
    console.log('📉 Starting fade out...');
    
    // Clear any existing fade
    this.clearFadeInterval();
    
    this.fadeInterval = setInterval(() => {
      if (!this.howl) {
        this.clearFadeInterval();
        return;
      }
      
      const currentVolume = this.howl.volume();
      if (currentVolume > 0) {
        const newVolume = Math.max(0, currentVolume - this.fadeStep);
        this.howl.volume(newVolume);
        console.log('📉 Fade out progress:', newVolume.toFixed(3));
      } else {
        // Stop the audio completely
        this.howl.stop();
        this.isPlaying = false;
        this.isFadingOut = false;
        this.clearFadeInterval();
        console.log('✅ Background audio fade out complete and stopped');
      }
    }, this.fadeIntervalMs);
  }

  private clearFadeInterval(): void {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
  }

  public setVolume(volume: number): void {
    this.targetVolume = Math.max(0, Math.min(1, volume));
    console.log('🔊 Setting target volume to:', this.targetVolume);
    if (this.howl && this.isPlaying && !this.isFadingOut) {
      this.howl.volume(this.targetVolume);
    }
  }

  public isCurrentlyPlaying(): boolean {
    const playing = this.isPlaying && this.howl?.playing() === true && !this.isFadingOut;
    console.log('❓ isCurrentlyPlaying check:', {
      isPlaying: this.isPlaying,
      isFadingOut: this.isFadingOut,
      howlPlaying: this.howl?.playing(),
      result: playing
    });
    return playing;
  }

  public getAudioState(): string {
    if (!this.howl) return 'not_initialized';
    return this.howl.state();
  }

  public cleanup(): void {
    console.log('🧹 Cleaning up background audio service...');
    this.isFadingOut = true;
    this.stopBackgroundAudio();
    
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    
    if (this.howl) {
      this.howl.unload();
      this.howl = null;
    }
    
    this.isInitialized = false;
    this.isPlaying = false;
    this.isFadingOut = false;
    console.log('✅ Background audio service cleanup complete');
  }
}

// Create singleton instance
export const backgroundAudioService = new BackgroundAudioService();