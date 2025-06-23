// Audio feedback service for user interaction sounds
let audioContext: AudioContext | null = null;
let pulseInterval: NodeJS.Timeout | null = null;
let isPlayingPulses = false;

// Initialize audio context for sound effects
const initializeAudioContext = async (): Promise<AudioContext> => {
  if (!audioContext) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContext = new AudioContextClass();
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      console.log('✅ Audio feedback context initialized');
    } catch (error) {
      console.error('❌ Failed to initialize audio feedback context:', error);
      throw new Error('Audio feedback not supported');
    }
  }
  
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
  
  return audioContext;
};

// Generate a single pulse sound effect
const createSinglePulse = async (frequency: number = 800, duration: number = 0.15): Promise<void> => {
  try {
    const context = await initializeAudioContext();
    
    // Create oscillator for the tone
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    // Configure oscillator
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    
    // Configure gain envelope for clear, audible pulse
    const now = context.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.25, now + 0.02); // Quick fade in with good volume
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration); // Smooth fade out
    
    // Start and stop the oscillator
    oscillator.start(now);
    oscillator.stop(now + duration);
    
  } catch (error) {
    console.error('❌ Error creating pulse sound:', error);
    // Fail silently - don't interrupt user experience
  }
};

// Start rhythmic pulses at 60 BPM (1 pulse per second)
export const startRhythmicPulses = async (): Promise<void> => {
  try {
    // Stop any existing pulses first
    stopRhythmicPulses();
    
    console.log('🎵 Starting rhythmic pulses at 60 BPM');
    isPlayingPulses = true;
    
    // Play first pulse immediately
    await createSinglePulse(800, 0.15);
    
    // Set up interval for subsequent pulses (1000ms = 60 BPM)
    pulseInterval = setInterval(async () => {
      if (isPlayingPulses) {
        await createSinglePulse(800, 0.15);
      }
    }, 1000);
    
  } catch (error) {
    console.log('Audio feedback not available');
    isPlayingPulses = false;
  }
};

// Stop rhythmic pulses
export const stopRhythmicPulses = (): void => {
  if (pulseInterval) {
    console.log('🔇 Stopping rhythmic pulses');
    clearInterval(pulseInterval);
    pulseInterval = null;
  }
  isPlayingPulses = false;
};

// Check if pulses are currently playing
export const arePulsesPlaying = (): boolean => {
  return isPlayingPulses;
};

// Play processing start sound (single pulse to indicate start)
export const playProcessingStartSound = async (): Promise<void> => {
  try {
    await createSinglePulse(900, 0.2); // Slightly higher pitch for start
  } catch (error) {
    console.log('Audio feedback not available');
  }
};

// Play success sound (higher pitch)
export const playSuccessSound = async (): Promise<void> => {
  try {
    await createSinglePulse(1000, 0.2); // 1000Hz, 0.2 seconds
  } catch (error) {
    console.log('Audio feedback not available');
  }
};

// Play error sound (lower but still audible pitch)
export const playErrorSound = async (): Promise<void> => {
  try {
    await createSinglePulse(600, 0.4); // 600Hz, 0.4 seconds
  } catch (error) {
    console.log('Audio feedback not available');
  }
};

// Prepare audio context on user interaction
export const prepareAudioFeedback = async (): Promise<void> => {
  try {
    await initializeAudioContext();
    console.log('✅ Audio feedback prepared');
  } catch (error) {
    console.error('❌ Failed to prepare audio feedback:', error);
  }
};