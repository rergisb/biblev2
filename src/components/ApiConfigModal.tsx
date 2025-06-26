import React, { useState, useEffect } from 'react';
import { X, Settings, Volume2, TestTube, CheckCircle, AlertCircle, Play, Square } from 'lucide-react';
import { testSpeechSynthesis, synthesizeSpeech, stopCurrentSpeech, getAvailableVoices, saveSpeechSettings } from '../services/speechService';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface ApiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SpeechConfig {
  rate: number;
  pitch: number;
  volume: number;
  voiceIndex: number;
}

export const ApiConfigModal: React.FC<ApiConfigModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useLocalStorage<SpeechConfig>('speech-settings', {
    rate: 0.9,
    pitch: 1.0,
    volume: 1.0,
    voiceIndex: -1 // -1 means auto-select
  });

  const [tempConfig, setTempConfig] = useState(config);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTempConfig(config);
      setConnectionStatus('idle');
      
      // Load available voices
      const voices = getAvailableVoices();
      setAvailableVoices(voices);
      
      // If voices are not loaded yet, wait for them
      if (voices.length === 0) {
        const loadVoices = () => {
          const newVoices = getAvailableVoices();
          if (newVoices.length > 0) {
            setAvailableVoices(newVoices);
          }
        };
        
        // Try again after a short delay
        setTimeout(loadVoices, 100);
        
        // Also listen for voiceschanged event
        if ('speechSynthesis' in window) {
          window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
          return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
        }
      }
    }
  }, [isOpen, config]);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('idle');

    try {
      const isSupported = await testSpeechSynthesis();
      setConnectionStatus(isSupported ? 'success' : 'error');
    } catch (error) {
      console.error('Speech synthesis test failed:', error);
      setConnectionStatus('error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleTestVoice = async () => {
    setIsTestingVoice(true);
    setIsPlayingTest(true);

    try {
      const testText = "Hello! This is a test of your Bible companion voice. May God's peace be with you today.";
      
      console.log('Testing voice with:', {
        voiceIndex: tempConfig.voiceIndex,
        settings: {
          rate: tempConfig.rate,
          pitch: tempConfig.pitch,
          volume: tempConfig.volume
        }
      });
      
      const selectedVoice = tempConfig.voiceIndex >= 0 ? availableVoices[tempConfig.voiceIndex] : undefined;
      
      await synthesizeSpeech(testText, {
        rate: tempConfig.rate,
        pitch: tempConfig.pitch,
        volume: tempConfig.volume,
        voice: selectedVoice
      });
      
    } catch (error) {
      console.error('Voice test failed:', error);
      alert(`Voice test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTestingVoice(false);
      setIsPlayingTest(false);
    }
  };

  const handleStopTest = () => {
    stopCurrentSpeech();
    setIsPlayingTest(false);
    setIsTestingVoice(false);
  };

  const handleSave = () => {
    setConfig(tempConfig);
    
    // Also save to the speech service
    const selectedVoice = tempConfig.voiceIndex >= 0 ? availableVoices[tempConfig.voiceIndex] : undefined;
    saveSpeechSettings({
      rate: tempConfig.rate,
      pitch: tempConfig.pitch,
      volume: tempConfig.volume,
      voice: selectedVoice
    });
    
    onClose();
  };

  const getVoiceDisplayName = (voice: SpeechSynthesisVoice) => {
    const name = voice.name;
    const lang = voice.lang;
    const isDefault = voice.default;
    
    return `${name} (${lang})${isDefault ? ' - Default' : ''}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-800 rounded-2xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Speech Configuration</h2>
              <p className="text-sm text-gray-600">Configure your voice synthesis settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          {/* Speech Synthesis Test */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">Speech Synthesis</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <TestTube className="w-4 h-4" />
                  {isTestingConnection ? 'Testing...' : 'Test Speech Support'}
                </button>
                
                {connectionStatus === 'success' && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Speech synthesis supported!</span>
                  </div>
                )}
                
                {connectionStatus === 'error' && (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Speech synthesis not supported</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Voice Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Voice Selection</h3>
              <div className="flex gap-2">
                {isPlayingTest && (
                  <button
                    onClick={handleStopTest}
                    className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors duration-200"
                  >
                    <Square className="w-4 h-4" />
                    Stop
                  </button>
                )}
                <button
                  onClick={handleTestVoice}
                  disabled={isTestingVoice || isPlayingTest}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4" />
                  {isTestingVoice ? 'Loading...' : 'Test Voice'}
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose Voice
              </label>
              <select
                value={tempConfig.voiceIndex}
                onChange={(e) => setTempConfig(prev => ({ ...prev, voiceIndex: parseInt(e.target.value) }))}
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-gray-800 focus:border-transparent"
              >
                <option value={-1} className="bg-white">Auto-select (Recommended)</option>
                {availableVoices.map((voice, index) => (
                  <option key={index} value={index} className="bg-white">
                    {getVoiceDisplayName(voice)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {availableVoices.length === 0 
                  ? 'Loading voices...' 
                  : `${availableVoices.length} voices available. Auto-select will choose the best English voice.`
                }
              </p>
            </div>
          </div>

          {/* Voice Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Voice Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Speech Rate: {tempConfig.rate.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={tempConfig.rate}
                  onChange={(e) => setTempConfig(prev => ({
                    ...prev,
                    rate: parseFloat(e.target.value)
                  }))}
                  className="w-full accent-gray-800"
                />
                <p className="text-xs text-gray-500 mt-1">How fast the voice speaks</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pitch: {tempConfig.pitch.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={tempConfig.pitch}
                  onChange={(e) => setTempConfig(prev => ({
                    ...prev,
                    pitch: parseFloat(e.target.value)
                  }))}
                  className="w-full accent-gray-800"
                />
                <p className="text-xs text-gray-500 mt-1">How high or low the voice sounds</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Volume: {Math.round(tempConfig.volume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={tempConfig.volume}
                  onChange={(e) => setTempConfig(prev => ({
                    ...prev,
                    volume: parseFloat(e.target.value)
                  }))}
                  className="w-full accent-gray-800"
                />
                <p className="text-xs text-gray-500 mt-1">How loud the voice speaks</p>
              </div>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-sm text-gray-700 mb-2">💡 Voice Testing Tip</p>
              <p className="text-xs text-gray-600">
                Adjust the settings above and click "Test Voice" to hear how they affect the voice quality. 
                The test will use a sample Bible-themed message to help you find the perfect voice for your spiritual companion.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-gray-800 text-white rounded-xl hover:bg-gray-900 transition-all duration-200"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};