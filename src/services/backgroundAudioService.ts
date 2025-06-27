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
      
      this.howl = new Howl({
        src: ['https://pkimavazdqutcxnqwoit.supabase.co/storage/v1/object/public/audio-files/Puzzle%20Game%20Loading.mp3'],
        loop: true,
        volume: 0,
        preload: true,
        html5: true, // Use HTML5 Audio for streaming
        format: ['mp3'],
        onload: () => {
          console.log('✅ Background audio loaded successfully with Howler.js');
          this.isInitialized = true;
        },
        onloaderror: (id, error) => {
          console.error('❌ Background audio load error:', error);
          console.error('Error details:', {
            id,
            error,
            src: this.howl?._src
          });
        },
        onplayerror: (id, error) => {
          console.error('❌ Background audio play error:', error);
          console.error('Error details:', {
            id,
            error,
            state: this.howl?.state()
          });
        },
        onplay: () => {
          console.log('✅ Background audio started playing');
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
      
    } catch (error) {
      console.error('❌ Failed to initialize background audio with Howler.js:', error);
    }
  }

  public async startBackgroundAudio(): Promise<void> {
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
      }
      
      if (!this.isInitialized) {
        console.error('❌ Background audio failed to initialize within timeout');
        return;
      }
    }

    try {
      console.log('🎵 Starting background audio with Howler.js...');
      this.isPlaying = true;
      
      // Start playing at volume 0
      this.howl.volume(0);
      const soundId = this.howl.play();
      
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
      this.isPlaying = false;
    }
  }

  public stopBackgroundAudio(): void {
    if (!this.howl || !this.isPlaying) {
      console.log('⏭️ Background audio not playing or not initialized');
      return;
    }

    console.log('🔇 Stopping background audio...');
    this.fadeOut();
  }

  private fadeIn(): void {
    if (!this.howl) return;
    
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
      } else {
        this.clearFadeInterval();
        console.log('✅ Background audio fade in complete at volume:', this.targetVolume);
      }
    }, this.fadeIntervalMs);
  }

  private fadeOut(): void {
    if (!this.howl) return;
    
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
    if (this.howl && this.isPlaying) {
      this.howl.volume(this.targetVolume);
    }
  }

  public isCurrentlyPlaying(): boolean {
    return this.isPlaying && this.howl?.playing() === true;
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
  }
}

// Create singleton instance
export const backgroundAudioService = new BackgroundAudioService();