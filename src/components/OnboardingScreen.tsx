import React, { useState, useEffect } from 'react';
import { Mic, Volume2, AlertCircle, Play } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { synthesizeSpeech, playAudioBuffer, prepareAudioContext } from '../services/elevenLabsService';

interface OnboardingScreenProps {
  onOnboardingComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onOnboardingComplete }) => {
  const [currentStep, setCurrentStep] = useState<'welcome' | 'playing-welcome' | 'requesting-permission' | 'completed' | 'error'>('welcome');
  const [error, setError] = useState<string | null>(null);
  const [hasUserTapped, setHasUserTapped] = useState(false);
  const [audioContextReady, setAudioContextReady] = useState(false);
  
  const { requestMicrophonePermission, microphonePermissionStatus, browserSupportsSpeechRecognition } = useSpeechRecognition();

  // Detect mobile devices
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Debug logging
  useEffect(() => {
    console.log('🎬 OnboardingScreen:', {
      currentStep,
      browserSupportsSpeechRecognition,
      microphonePermissionStatus,
      hasUserTapped
    });
  }, [currentStep, browserSupportsSpeechRecognition, microphonePermissionStatus, hasUserTapped]);

  // Check browser support first
  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      console.log('❌ Browser does not support speech recognition');
      setError('Your browser does not support voice recognition. Please use Chrome, Safari, or another modern browser.');
      setCurrentStep('error');
      return;
    }
  }, [browserSupportsSpeechRecognition]);

  // Handle the entire onboarding flow automatically with proper timing
  const startOnboardingFlow = async () => {
    if (hasUserTapped) return;
    
    setHasUserTapped(true);
    setError(null);
    
    try {
      console.log('🎬 Starting onboarding flow...');
      
      // Step 1: Prepare audio context
      if (!audioContextReady) {
        console.log('🔊 Preparing audio context...');
        await prepareAudioContext();
        setAudioContextReady(true);
        console.log('✅ Audio context prepared');
      }
      
      // Step 2: Play welcome message and wait for completion
      setCurrentStep('playing-welcome');
      
      const welcomeMessage = "Welcome to My Guiding Light. A popup for microphone access will appear now. Please tap Allow when prompted.";
      console.log('🎤 Playing welcome message...');
      
      const welcomeAudioBuffer = await synthesizeSpeech(welcomeMessage);
      await playAudioBuffer(welcomeAudioBuffer); // Wait for completion
      
      console.log('✅ Welcome message completed');
      
      // Step 3: Show permission popup after voice completes
      setCurrentStep('requesting-permission');
      
      // Small delay to ensure voice has fully finished
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('🎙️ Requesting microphone permission...');
      const permissionGranted = await requestMicrophonePermission();
      
      if (permissionGranted) {
        console.log('✅ Microphone permission granted');
        setCurrentStep('completed');
        
        // Small delay before transitioning
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 4: Complete onboarding and proceed to main app
        console.log('🎯 Completing onboarding...');
        onOnboardingComplete();
      } else {
        console.log('❌ Microphone permission denied');
        setError('Microphone access is required for this voice-activated Bible companion. Please refresh the page and allow microphone access when prompted.');
        setCurrentStep('error');
      }
      
    } catch (error) {
      console.error('❌ Error in onboarding flow:', error);
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
    onOnboardingComplete();
  };

  // Render different states with minimal text
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
              
              <h1 className="text-4xl font-bold text-gray-900 mb-6 leading-tight">My Guiding Light</h1>
              
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
                  <span className="text-xl">TAP TO START</span>
                </button>
              </div>
              
              {/* Minimal info for accessibility */}
              <div className="bg-gray-100 border-4 border-gray-300 rounded-2xl p-6">
                <p className="text-gray-900 font-bold text-lg mb-2">
                  Voice-Activated Bible Companion
                </p>
                <p className="text-gray-800 text-base font-medium">
                  Tap anywhere to begin setup
                </p>
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
              
              <h1 className="text-4xl font-bold text-gray-900 mb-6">Playing Welcome</h1>
              
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
              
              <h1 className="text-4xl font-bold text-gray-900 mb-6">Allow Microphone</h1>
              
              <div className="bg-orange-50 border-4 border-orange-200 rounded-2xl p-6 mb-6">
                <p className="text-orange-800 text-xl font-bold mb-4">
                  Tap "Allow" when prompted
                </p>
                <div className="text-orange-700 text-lg space-y-2">
                  <p>1. Look for browser popup</p>
                  <p>2. Click "Allow" or "Yes"</p>
                  <p>3. Check address bar if no popup</p>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-orange-600 text-lg">
                <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Waiting for permission...</span>
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
              
              <div className="bg-green-50 border-4 border-green-200 rounded-2xl p-6 mb-6">
                <p className="text-green-800 text-xl font-bold">
                  ✅ Ready to use voice assistant
                </p>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-green-600 text-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Starting your Bible companion...</span>
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
              
              {error && (
                <div className="bg-red-50 border-4 border-red-200 rounded-2xl p-6 mb-8">
                  <p className="text-red-800 text-lg font-medium">
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
                  Continue Without Voice
                </button>
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