// Audio feedback service for user interaction sounds
let audioContext: AudioContext | null = null;

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

// Generate a subtle pulse sound effect
const createPulseSound = async (frequency: number = 500, duration: number = 0.3): Promise<void> => {
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
    
    // Configure gain envelope for smooth pulse
    const now = context.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.05); // Quick fade in
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration); // Smooth fade out
    
    // Start and stop the oscillator
    oscillator.start(now);
    oscillator.stop(now + duration);
    
  } catch (error) {
    console.error('❌ Error creating pulse sound:', error);
    // Fail silently - don't interrupt user experience
  }
};

// Play processing start sound
export const playProcessingStartSound = async (): Promise<void> => {
  try {
    await createPulseSound(500, 0.3); // 500Hz, 0.3 seconds
  } catch (error) {
    console.log('Audio feedback not available');
  }
};

// Play success sound (slightly higher pitch)
export const playSuccessSound = async (): Promise<void> => {
  try {
    await createPulseSound(600, 0.2); // 600Hz, 0.2 seconds
  } catch (error) {
    console.log('Audio feedback not available');
  }
};

// Play error sound (slightly lower pitch)
export const playErrorSound = async (): Promise<void> => {
  try {
    await createPulseSound(400, 0.4); // 400Hz, 0.4 seconds
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