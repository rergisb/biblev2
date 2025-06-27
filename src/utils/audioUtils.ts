// Audio utility functions for browser-based sound effects
let pulseAudio: HTMLAudioElement | null = null;

export const playPulseSound = async (): Promise<void> => {
  try {
    // Create or reuse audio instance
    if (!pulseAudio) {
      pulseAudio = new Audio('/sounds/pulse.mp3');
      pulseAudio.volume = 0.7; // Increased from 0.3 to 0.7 for more noticeable sound
      pulseAudio.preload = 'auto';
    }

    // Reset to beginning if already playing
    pulseAudio.currentTime = 0;
    
    // Play the sound
    const playPromise = pulseAudio.play();
    
    if (playPromise !== undefined) {
      await playPromise;
    }
  } catch (error) {
    console.log('Pulse sound not available or failed to play:', error);
    // Fallback: create a synthetic beep using Web Audio API
    try {
      await playSyntheticPulse();
    } catch (synthError) {
      console.log('Synthetic pulse also failed:', synthError);
    }
  }
};

// Fallback synthetic pulse sound using Web Audio API
const playSyntheticPulse = async (): Promise<void> => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Create a short, subtle pulse tone
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Configure the pulse sound
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800Hz tone
  oscillator.type = 'sine';
  
  // Create a quick fade in/out envelope - increased volume for synthetic pulse too
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + 0.05); // Increased from 0.1 to 0.25
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2); // Fade out
  
  // Play for 200ms
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.2);
  
  // Clean up
  setTimeout(() => {
    try {
      audioContext.close();
    } catch (e) {
      console.log('AudioContext cleanup note:', e);
    }
  }, 300);
};

export const stopPulseSound = (): void => {
  if (pulseAudio && !pulseAudio.paused) {
    pulseAudio.pause();
    pulseAudio.currentTime = 0;
  }
};