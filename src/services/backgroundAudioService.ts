import { Howl } from 'howler';

// Background audio service using Howler.js for better cross-browser compatibility
class BackgroundAudioService {
  private howl: Howl | null = null;
  private fadeInterval: NodeJS.Timeout | null = null;
  private isPlaying: boolean = false;
  private targetVolume: number = 0.15; // Low volume to not interfere
  private fadeStep: number = 0.02;
  private fadeIntervalMs: number = 50;
  private isInitialized: boolean = false;

  constructor() {
    this.initializeAudio();
  }

  private initializeAudio(): void {
    try {
      console.log('🎵 Initializing background audio with Howler.js...');
      const audioUrl = 'https://pkimavazdqutcxnqwoit.supabase.co/storage/v1/object/public/audio-files/Puzzle%20Game%20Loading.mp3';
      console.log('🔗 Audio URL:', audioUrl);
      
      this.howl = new Howl({
        src: [audioUrl],
        loop: true,
        volume: 0,
        preload: true,
        html5: true, // Use HTML5 Audio for streaming
        format: ['mp3'],
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
          console.error('🌐 Network status:', navigator.onLine ? 'Online' : 'Offline');
          
          // Try to test the URL directly
          console.log('🧪 Testing audio URL accessibility...');
          fetch(audioUrl, { method: 'HEAD' })
            .then(response => {
              console.log('🧪 URL test response:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries())
              });
            })
            .catch(fetchError => {
              console.error('🧪 URL test failed:', fetchError);
            });
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
        },
        onplay: () => {
          console.log('✅ Background audio started playing');
          console.log('📊 Playback info:', {
            volume: this.howl?.volume(),
            duration: this.howl?.duration(),
            state: this.howl?.state(),
            playing: this.howl?.playing()
          });
        },
        onpause: () => {
          console.log('🔇 Background audio paused');
        },
        onstop: () => {
          console.log('🛑 Background audio stopped');
          this.isPlaying = false;
        },
        onend: () => {
          // This shouldn't happen with loop=true, but just in case
          console.log('🔄 Background audio ended (unexpected with loop)');
          if (this.isPlaying) {
            this.howl?.play();
          }
        }
      });
      
      console.log('🎵 Howl instance created:', {
        state: this.howl.state(),
        duration: this.howl.duration(),
        volume: this.howl.volume()
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

  public async startBackgroundAudio(): Promise<void> {
    console.log('🎵 startBackgroundAudio called');
    console.log('📊 Current state:', {
      isInitialized: this.isInitialized,
      isPlaying: this.isPlaying,
      howlState: this.howl?.state(),
      howlExists: !!this.howl
    });

    if (!this.howl || this.isPlaying) {
      console.log('⏭️ Background audio already playing or not initialized');
      return;
    }

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
      console.log('🎵 Starting background audio with Howler.js...');
      console.log('📊 Pre-play state:', {
        state: this.howl.state(),
        volume: this.howl.volume(),
        duration: this.howl.duration(),
        playing: this.howl.playing()
      });
      
      this.isPlaying = true;
      
      // Start playing at volume 0
      this.howl.volume(0);
      const soundId = this.howl.play();
      
      console.log('🎵 Play method called, sound ID:', soundId);
      console.log('📊 Post-play state:', {
        state: this.howl.state(),
        volume: this.howl.volume(),
        playing: this.howl.playing(),
        soundId
      });
      
      if (soundId) {
        // Fade in
        this.fadeIn();
        console.log('✅ Background audio play initiated, sound ID:', soundId);
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
      howlExists: !!this.howl,
      howlState: this.howl?.state(),
      howlPlaying: this.howl?.playing()
    });

    if (!this.howl || !this.isPlaying) {
      console.log('⏭️ Background audio not playing or not initialized');
      return;
    }

    console.log('🔇 Stopping background audio...');
    this.fadeOut();
  }

  private fadeIn(): void {
    if (!this.howl) return;
    
    console.log('📈 Starting fade in...');
    
    // Clear any existing fade
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }
    
    this.fadeInterval = setInterval(() => {
      if (!this.howl) {
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
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }
    
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
        this.howl.stop();
        this.isPlaying = false;
        this.clearFadeInterval();
        console.log('✅ Background audio fade out complete');
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
    if (this.howl && this.isPlaying) {
      this.howl.volume(this.targetVolume);
    }
  }

  public isCurrentlyPlaying(): boolean {
    const playing = this.isPlaying && this.howl?.playing() === true;
    console.log('❓ isCurrentlyPlaying check:', {
      isPlaying: this.isPlaying,
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
    console.log('✅ Background audio service cleanup complete');
  }
}

// Create singleton instance
export const backgroundAudioService = new BackgroundAudioService();