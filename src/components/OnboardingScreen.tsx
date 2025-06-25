import React, { useState, useEffect } from 'react';
import { Mic, Volume2, AlertCircle, VolumeX, Play } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { synthesizeSpeech, playAudioBuffer, prepareAudioContext } from '../services/elevenLabsService';

interface OnboardingScreenProps {
  onOnboardingComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onOnboardingComplete }) => {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useLocalStorage('has-completed-onboarding', false);
  const [currentStep, setCurrentStep] = useState<'welcome' | 'playing-welcome' | 'playing-popup-message' | 'requesting-permission' | 'completed' | 'error'>('welcome');
  const [error, setError] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [hasUserTapped, setHasUserTapped] = useState(false);
  const [audioContextReady, setAudioContextReady] = useState(false);
  
  const { requestMicrophonePermission, microphonePermissionStatus, browserSupportsSpeechRecognition } = useSpeechRecognition();

  // Detect mobile devices
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // If onboarding is already completed, immediately proceed to main app
  useEffect(() => {
    if (hasCompletedOnboarding) {
      console.log('✅ Onboarding already completed, proceeding to main app');
      onOnboardingComplete();
      return;
    }

    // Check browser support first
    if (!browserSupportsSpeechRecognition) {
      console.log('❌ Browser does not support speech recognition');
      setError('Your browser does not support voice recognition. Please use Chrome, Safari, or another modern browser.');
      setCurrentStep('error');
      return;
    }
  }, [hasCompletedOnboarding, onOnboardingComplete, browserSupportsSpeechRecognition]);

  // Handle the entire onboarding flow automatically
  const startOnboardingFlow = async () => {
    if (hasUserTapped) return;
    
    setHasUserTapped(true);
    setError(null);
    
    try {
      console.log('🎬 Starting onboarding flow...');
      
      // Step 1: Prepare audio context
      if (!audioContextReady) {
        await prepareAudioContext();
        setAudioContextReady(true);
      }
      
      // Step 2: Play welcome message
      setCurrentStep('playing-welcome');
      setIsPlayingAudio(true);
      
      const welcomeMessage = "Welcome to My Guiding Light. To begin, tap anywhere on the screen to enable voice interaction.";
      console.log('🎤 Playing welcome message...');
      
      const welcomeAudioBuffer = await synthesizeSpeech(welcomeMessage);
      await playAudioBuffer(welcomeAudioBuffer);
      
      console.log('✅ Welcome message completed');
      
      // Step 3: Immediately play popup message
      setCurrentStep('playing-popup-message');
      
      const popupMessage = "A popup for microphone access will appear now. Please tap Allow when prompted.";
      console.log('🎤 Playing popup message...');
      
      const popupAudioBuffer = await synthesizeSpeech(popupMessage);
      await playAudioBuffer(popupAudioBuffer);
      
      console.log('✅ Popup message completed');
      setIsPlayingAudio(false);
      
      // Step 4: Show permission popup
      setCurrentStep('requesting-permission');
      
      // Small delay before requesting permission
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('🎙️ Requesting microphone permission...');
      const permissionGranted = await requestMicrophonePermission();
      
      if (permissionGranted) {
        console.log('✅ Microphone permission granted');
        setCurrentStep('completed');
        
        // Mark onboarding as completed
        setHasCompletedOnboarding(true);
        
        // Small delay before transitioning
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 5: Proceed to main app
        onOnboardingComplete();
      } else {
        console.log('❌ Microphone permission denied');
        setError('Microphone access is required for this voice-activated Bible companion. Please refresh the page and allow microphone access when prompted.');
        setCurrentStep('error');
      }
      
    } catch (error) {
      console.error('❌ Error in onboarding flow:', error);
      setIsPlayingAudio(false);
      setError('There was an issue setting up the voice assistant. Please refresh the page and try again.');
      setCurrentStep('error');
    }
  };

  const handleRetry = () => {
    setError(null);
    setHasUserTapped(false);
    setCurrentStep('welcome');
  };

  const handleSkipOnboarding = () => {
    console.log('⏭️ User chose to skip onboarding');
    setHasCompletedOnboarding(true);
    onOnboardingComplete();
  };

  // Render different states
  const renderContent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div 
            className="min-h-screen bg-white flex items-center justify-center px-4 cursor-pointer"
            onClick={startOnboardingFlow}
          >
            <div className="w-full max-w-lg text-center">
              {/* Large, prominent icon */}
              <div className="w-32 h-32 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
                <Volume2 className="w-16 h-16 text-white" />
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 mb-6 leading-tight">Welcome to My Guiding Light</h1>
              <p className="text-gray-700 text-xl mb-8 leading-relaxed font-medium">
                Your AI-powered Bible companion for spiritual guidance and scripture.
              </p>
              
              {/* Very large, high-contrast button for accessibility */}
              <div className="mb-8">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startOnboardingFlow();
                  }}
                  disabled={hasUserTapped}
                  className="w-full h-32 bg-gray-900 hover:bg-black text-white rounded-3xl transition-all duration-300 font-bold text-2xl flex flex-col items-center justify-center gap-4 disabled:opacity-70 disabled:cursor-not-allowed shadow-2xl border-4 border-gray-800 hover:border-black transform hover:scale-105 active:scale-95"
                  style={{ minHeight: '128px' }}
                >
                  <Play className="w-12 h-12" />
                  <span className="text-xl">🔊 TAP TO START</span>
                  <span className="text-lg font-normal">Enable voice features</span>
                </button>
              </div>
              
              {/* High contrast info box */}
              <div className="bg-gray-100 border-4 border-gray-300 rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">📱</span>
                  </div>
                  <p className="text-gray-900 font-bold text-lg">
                    {isMobile ? 'Mobile Device Detected' : 'Voice Assistant Ready'}
                  </p>
                </div>
                
                <p className="text-gray-800 text-lg leading-relaxed mb-4 font-medium">
                  {isMobile 
                    ? 'Mobile browsers require user interaction before playing audio. Tap anywhere on the screen to begin.'
                    : 'Click anywhere on the screen or the button above to start your spiritual journey.'
                  }
                </p>
                
                <div className="bg-amber-100 border-2 border-amber-300 rounded-xl p-4">
                  <p className="text-amber-900 text-base font-medium">
                    <strong>♿ Accessibility:</strong> This app is designed for visually impaired users with large, high-contrast buttons and voice guidance.
                  </p>
                </div>
              </div>
              
              {/* Tap anywhere indicator */}
              <div className="text-center">
                <div className="animate-bounce">
                  <div className="w-4 h-4 bg-gray-800 rounded-full mx-auto mb-2"></div>
                </div>
                <p className="text-gray-500 text-lg font-medium">Tap anywhere on the screen to begin</p>
              </div>
            </div>
          </div>
        );

      case 'playing-welcome':
        return (
          <div className="min-h-screen bg-white flex items-center justify-center px-4">
            <div className="w-full max-w-lg text-center">
              <div className="w-32 h-32 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
                <Volume2 className="w-16 h-16 text-white animate-pulse" />
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 mb-6">Welcome Message Playing</h1>
              <p className="text-gray-700 text-xl mb-8 leading-relaxed">
                🔊 "Welcome to My Guiding Light. To begin, tap anywhere on the screen to enable voice interaction."
              </p>
              
              <div className="bg-green-50 border-4 border-green-200 rounded-2xl p-6">
                <div className="flex items-center justify-center gap-1 mb-4">
                  <div className="w-2 h-8 bg-green-600 rounded-full animate-pulse"></div>
                  <div className="w-2 h-12 bg-green-700 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-8 bg-green-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-12 bg-green-700 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  <div className="w-2 h-8 bg-green-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
                
                <p className="text-green-800 text-lg font-medium">
                  🎵 Playing welcome message...
                </p>
                <p className="text-green-700 text-sm mt-2">
                  Please listen carefully. The next step will begin automatically.
                </p>
              </div>
            </div>
          </div>
        );

      case 'playing-popup-message':
        return (
          <div className="min-h-screen bg-white flex items-center justify-center px-4">
            <div className="w-full max-w-lg text-center">
              <div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
                <Mic className="w-16 h-16 text-white animate-pulse" />
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 mb-6">Preparing Microphone Setup</h1>
              <p className="text-gray-700 text-xl mb-8 leading-relaxed">
                🔊 "A popup for microphone access will appear now. Please tap Allow when prompted."
              </p>
              
              <div className="bg-blue-50 border-4 border-blue-200 rounded-2xl p-6">
                <div className="flex items-center justify-center gap-1 mb-4">
                  <div className="w-2 h-8 bg-blue-600 rounded-full animate-pulse"></div>
                  <div className="w-2 h-12 bg-blue-700 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-8 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-12 bg-blue-700 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  <div className="w-2 h-8 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
                
                <p className="text-blue-800 text-lg font-medium">
                  🎵 Playing setup instructions...
                </p>
                <p className="text-blue-700 text-sm mt-2">
                  Get ready to allow microphone access when prompted.
                </p>
              </div>
            </div>
          </div>
        );

      case 'requesting-permission':
        return (
          <div className="min-h-screen bg-white flex items-center justify-center px-4">
            <div className="w-full max-w-lg text-center">
              <div className="w-32 h-32 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl animate-pulse">
                <Mic className="w-16 h-16 text-white" />
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 mb-6">Microphone Permission</h1>
              <p className="text-gray-700 text-xl mb-8 leading-relaxed">
                Please tap "Allow" when prompted by your browser
              </p>
              
              <div className="bg-orange-50 border-4 border-orange-200 rounded-2xl p-6 mb-6">
                <p className="text-orange-800 text-lg font-medium mb-4">
                  <strong>What to do:</strong>
                </p>
                <ol className="text-orange-700 text-lg text-left space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="bg-orange-200 text-orange-800 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">1</span>
                    <span>Look for a browser popup asking for microphone access</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-orange-200 text-orange-800 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">2</span>
                    <span>Click "Allow" or "Yes" to grant permission</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-orange-200 text-orange-800 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">3</span>
                    <span>If you don't see a popup, check your browser's address bar for a microphone icon</span>
                  </li>
                </ol>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-orange-600 text-lg">
                <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Waiting for your response...</span>
              </div>
            </div>
          </div>
        );

      case 'completed':
        return (
          <div className="min-h-screen bg-white flex items-center justify-center px-4">
            <div className="w-full max-w-lg text-center">
              <div className="w-32 h-32 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
                <Mic className="w-16 h-16 text-white" />
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 mb-6">Setup Complete!</h1>
              <p className="text-gray-700 text-xl mb-8 leading-relaxed">
                Your voice assistant is ready to help with biblical guidance
              </p>
              
              <div className="bg-green-50 border-4 border-green-200 rounded-2xl p-6 mb-6">
                <p className="text-green-800 text-lg font-medium">
                  ✅ <strong>Success!</strong> You can now use voice commands to get Bible verses, spiritual guidance, and prayer support.
                </p>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-green-600 text-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Redirecting to your Bible companion...</span>
              </div>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="min-h-screen bg-white flex items-center justify-center px-4">
            <div className="w-full max-w-lg text-center">
              <div className="w-32 h-32 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
                <AlertCircle className="w-16 h-16 text-white" />
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 mb-6">Setup Issue</h1>
              <p className="text-gray-700 text-xl mb-8 leading-relaxed">
                We encountered a problem setting up your voice assistant
              </p>
              
              {error && (
                <div className="bg-red-50 border-4 border-red-200 rounded-2xl p-6 mb-8">
                  <p className="text-red-800 text-lg leading-relaxed font-medium">
                    <strong>Error:</strong><br />
                    {error}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <button
                  onClick={handleRetry}
                  className="w-full h-16 px-6 py-3 bg-gray-800 text-white rounded-2xl hover:bg-gray-900 transition-all duration-200 font-bold text-xl"
                >
                  Try Again
                </button>
                
                <button
                  onClick={handleSkipOnboarding}
                  className="w-full h-16 px-6 py-3 bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 transition-all duration-200 font-bold text-xl"
                >
                  Continue Without Voice (Not Recommended)
                </button>
              </div>

              <div className="mt-8 bg-blue-50 border-4 border-blue-200 rounded-2xl p-6">
                <p className="text-blue-800 text-lg leading-relaxed font-medium">
                  <strong>💡 Tip:</strong> This app is designed for visually impaired users and works best with voice interaction enabled.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return renderContent();
};