// Native browser speech synthesis service
export interface SpeechSettings {
  rate: number;
  pitch: number;
  volume: number;
  voice?: SpeechSynthesisVoice;
}

export const defaultSpeechSettings: SpeechSettings = {
  rate: 0.9,
  pitch: 1.0,
  volume: 1.0
};

// Global speech synthesis instance
let currentUtterance: SpeechSynthesisUtterance | null = null;
let speechSynthesis: SpeechSynthesis | null = null;

// Initialize speech synthesis
const initializeSpeechSynthesis = (): SpeechSynthesis => {
  if (!speechSynthesis) {
    if ('speechSynthesis' in window) {
      speechSynthesis = window.speechSynthesis;
    } else {
      throw new Error('Speech synthesis not supported in this browser');
    }
  }
  return speechSynthesis;
};

// Get speech settings from localStorage or fallback to default
const getSpeechSettings = (): SpeechSettings => {
  try {
    const config = localStorage.getItem('speech-settings');
    if (config) {
      const parsed = JSON.parse(config);
      return { ...defaultSpeechSettings, ...parsed };
    }
  } catch (error) {
    console.error('Error reading speech settings:', error);
  }
  return defaultSpeechSettings;
};

// Get available voices
export const getAvailableVoices = (): SpeechSynthesisVoice[] => {
  try {
    const synthesis = initializeSpeechSynthesis();
    return synthesis.getVoices();
  } catch (error) {
    console.error('Error getting voices:', error);
    return [];
  }
};

// Get preferred voice (prioritize English voices)
const getPreferredVoice = (): SpeechSynthesisVoice | null => {
  const voices = getAvailableVoices();
  
  if (voices.length === 0) {
    return null;
  }
  
  // Try to find a good English voice
  const englishVoices = voices.filter(voice => 
    voice.lang.startsWith('en') && !voice.name.includes('Google')
  );
  
  // Prefer female voices for warmth
  const femaleVoices = englishVoices.filter(voice => 
    voice.name.toLowerCase().includes('female') ||
    voice.name.toLowerCase().includes('woman') ||
    voice.name.toLowerCase().includes('samantha') ||
    voice.name.toLowerCase().includes('victoria') ||
    voice.name.toLowerCase().includes('karen') ||
    voice.name.toLowerCase().includes('susan')
  );
  
  if (femaleVoices.length > 0) {
    return femaleVoices[0];
  }
  
  if (englishVoices.length > 0) {
    return englishVoices[0];
  }
  
  // Fallback to first available voice
  return voices[0];
};

// Test speech synthesis
export const testSpeechSynthesis = (): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      const synthesis = initializeSpeechSynthesis();
      const utterance = new SpeechSynthesisUtterance('Test');
      
      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);
      
      // Set very short text and low volume for testing
      utterance.text = 'Hi';
      utterance.volume = 0.1;
      utterance.rate = 2.0; // Speak fast for quick test
      
      synthesis.speak(utterance);
      
      // Timeout after 3 seconds
      setTimeout(() => resolve(false), 3000);
    } catch (error) {
      console.error('Speech synthesis test failed:', error);
      resolve(false);
    }
  });
};

// Synthesize speech using browser's native TTS
export const synthesizeSpeech = async (
  text: string,
  customSettings?: Partial<SpeechSettings>
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      console.log('🔊 Starting native speech synthesis...');
      
      // Stop any currently playing speech
      stopCurrentSpeech();
      
      const synthesis = initializeSpeechSynthesis();
      const settings = { ...getSpeechSettings(), ...customSettings };
      
      // Create utterance
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply settings
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;
      
      // Set preferred voice
      const preferredVoice = settings.voice || getPreferredVoice();
      if (preferredVoice) {
        utterance.voice = preferredVoice;
        console.log('🎤 Using voice:', preferredVoice.name);
      }
      
      // Store reference for stopping
      currentUtterance = utterance;
      
      let hasEnded = false;
      
      const cleanup = () => {
        if (!hasEnded) {
          hasEnded = true;
          if (currentUtterance === utterance) {
            currentUtterance = null;
          }
        }
      };
      
      utterance.onend = () => {
        console.log('✅ Speech synthesis completed');
        cleanup();
        resolve();
      };
      
      utterance.onerror = (event) => {
        console.error('❌ Speech synthesis error:', event.error);
        cleanup();
        reject(new Error(`Speech synthesis failed: ${event.error}`));
      };
      
      utterance.onstart = () => {
        console.log('🎵 Speech synthesis started');
      };
      
      // Start speaking
      synthesis.speak(utterance);
      
      // Fallback timeout
      setTimeout(() => {
        if (!hasEnded) {
          console.warn('⏰ Speech synthesis timeout');
          cleanup();
          reject(new Error('Speech synthesis timeout'));
        }
      }, 30000);
      
    } catch (error) {
      console.error('❌ Error in synthesizeSpeech:', error);
      reject(error);
    }
  });
};

// Stop currently playing speech
export const stopCurrentSpeech = (): void => {
  try {
    if (speechSynthesis && speechSynthesis.speaking) {
      console.log('🛑 Stopping speech synthesis');
      speechSynthesis.cancel();
    }
    
    if (currentUtterance) {
      currentUtterance = null;
    }
  } catch (error) {
    console.error('Error stopping speech:', error);
  }
};

// Check if speech synthesis is supported
export const isSpeechSynthesisSupported = (): boolean => {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
};

// Check if currently speaking
export const isSpeaking = (): boolean => {
  try {
    return speechSynthesis ? speechSynthesis.speaking : false;
  } catch (error) {
    return false;
  }
};

// Save speech settings to localStorage
export const saveSpeechSettings = (settings: Partial<SpeechSettings>): void => {
  try {
    const currentSettings = getSpeechSettings();
    const newSettings = { ...currentSettings, ...settings };
    localStorage.setItem('speech-settings', JSON.stringify(newSettings));
  } catch (error) {
    console.error('Error saving speech settings:', error);
  }
};