// Background audio service for ambient sound during processing
class BackgroundAudioService {
  private audio: HTMLAudioElement | null = null;
  private fadeInterval: NodeJS.Timeout | null = null;
  private isPlaying: boolean = false;
  private targetVolume: number = 0.15; // Low volume to not interfere
  private fadeStep: number = 0.02;
  private fadeIntervalMs: number = 50;

  constructor() {
    this.initializeAudio();
  }

  private initializeAudio(): void {
    try {
      this.audio = new Audio('https://pkimavazdqutcxnqwoit.supabase.co/storage/v1/object/public/audio-files/Puzzle%20Game%20Loading.mp3');
      this.audio.loop = true;
      this.audio.volume = 0;
      this.audio.preload = 'auto';
      
      // Handle audio loading events
      this.audio.addEventListener('canplaythrough', () => {
        console.log('✅ Background audio loaded and ready');
      });
      
      this.audio.addEventListener('error', (error) => {
        console.error('❌ Background audio error:', error);
      });
      
      this.audio.addEventListener('ended', () => {
        // This shouldn't happen with loop=true, but just in case
        if (this.isPlaying) {
          this.audio?.play().catch(console.error);
        }
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize background audio:', error);
    }
  }

  public async startBackgroundAudio(): Promise<void> {
    if (!this.audio || this.isPlaying) {
      return;
    }

    try {
      console.log('🎵 Starting background audio...');
      this.isPlaying = true;
      
      // Start playing at volume 0
      this.audio.volume = 0;
      await this.audio.play();
      
      // Fade in
      this.fadeIn();
      
    } catch (error) {
      console.error('❌ Failed to start background audio:', error);
      this.isPlaying = false;
    }
  }

  public stopBackgroundAudio(): void {
    if (!this.audio || !this.isPlaying) {
      return;
    }

    console.log('🔇 Stopping background audio...');
    this.fadeOut();
  }

  private fadeIn(): void {
    if (!this.audio) return;
    
    // Clear any existing fade
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }
    
    this.fadeInterval = setInterval(() => {
      if (!this.audio) {
        this.clearFadeInterval();
        return;
      }
      
      if (this.audio.volume < this.targetVolume) {
        this.audio.volume = Math.min(this.targetVolume, this.audio.volume + this.fadeStep);
      } else {
        this.clearFadeInterval();
        console.log('✅ Background audio fade in complete');
      }
    }, this.fadeIntervalMs);
  }

  private fadeOut(): void {
    if (!this.audio) return;
    
    // Clear any existing fade
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }
    
    this.fadeInterval = setInterval(() => {
      if (!this.audio) {
        this.clearFadeInterval();
        return;
      }
      
      if (this.audio.volume > 0) {
        this.audio.volume = Math.max(0, this.audio.volume - this.fadeStep);
      } else {
        this.audio.pause();
        this.audio.currentTime = 0;
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
    if (this.audio && this.isPlaying) {
      this.audio.volume = this.targetVolume;
    }
  }

  public isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  public cleanup(): void {
    this.stopBackgroundAudio();
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
  }
}

// Create singleton instance
export const backgroundAudioService = new BackgroundAudioService();