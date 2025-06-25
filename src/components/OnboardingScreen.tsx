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
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  const { requestMicrophonePermission, microphonePermissionStatus, browserSupportsSpeechRecognition } = useSpeechRecognition();

  // Detect mobile devices
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Debug logging
  useEffect(() => {
    console.log('🎬 OnboardingScreen:', {
      currentStep,
      browserSupportsSpeechRecognition,
      microphonePermissionStatus,
      hasUserTapped,
      isMobile,
      isIOS,
      audioContextReady
    });
  }, [currentStep, browserSupportsSpeechRecognition, microphonePermissionStatus, hasUserTapped, isMobile, isIOS, audioContextReady]);

  // Check browser support first
  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      console.log('❌ Browser does not support speech recognition');
      setError('Your browser does not support voice recognition. Please use Chrome, Safari, or another modern browser.');
      setCurrentStep('error');
      return;
    }
  }, [browserSupportsSpeechRecognition]);

  // Enhanced mobile audio preparation
  const prepareAudioForMobile = async (): Promise<boolean> => {
    try {
      console.log('📱 Preparing audio for mobile device...');
      
      // Initialize audio context with user gesture
      await prepareAudioContext();
      
      // For iOS, we need to create a dummy audio element and play it to unlock audio
      if (isIOS) {
        console.log('🍎 iOS detected - unlocking audio context...');
        
        // Create a silent audio buffer to unlock the context
        const silentAudio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        silentAudio.volume = 0.01;
        silentAudio.muted = false;
        
        try {
          await silentAudio.play();
          console.log('✅ iOS audio context unlocked');
          silentAudio.pause();
          silentAudio.currentTime = 0;
        } catch (iosError) {
          console.warn('⚠️ iOS audio unlock failed:', iosError);
        }
      }
      
      setAudioContextReady(true);
      console.log('✅ Mobile audio prepared successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to prepare mobile audio:', error);
      setError('Audio setup failed. Please ensure your device volume is on and try again.');
      return false;
    }
  };

  // Enhanced onboarding flow with better mobile support
  const startOnboardingFlow = async () => {
    if (hasUserTapped) return;
    
    setHasUserTapped(true);
    setError(null);
    
    try {
      console.log('🎬 Starting onboarding flow...');
      
      // Step 1: Prepare audio context with mobile-specific handling
      console.log('🔊 Preparing audio context for mobile...');
      const audioReady = await prepareAudioForMobile();
      
      if (!audioReady) {
        throw new Error('Failed to prepare audio system');
      }
      
      // Step 2: Play welcome message with enhanced error handling
      setCurrentStep('playing-welcome');
      setIsPlayingAudio(true);
      
      const welcomeMessage = "Welcome to My Guiding Light. A popup for microphone access will appear now. Please tap Allow when prompted.";
      console.log('🎤 Playing welcome message...');
      
      try {
        const welcomeAudioBuffer = await synthesizeSpeech(welcomeMessage);
        console.log('🔊 Audio buffer created, starting playback...');
        
        // Enhanced playback with mobile-specific handling
        await playAudioBuffer(welcomeAudioBuffer);
        console.log('✅ Welcome message completed successfully');
        
      } catch (audioError) {
        console.error('❌ Audio playback failed:', audioError);
        
        // For mobile, show a visual message instead of failing
        if (isMobile) {
          console.log('📱 Mobile audio failed - showing visual message');
          await new Promise(resolve => setTimeout(resolve, 3000)); // Show visual message for 3 seconds
        } else {
          throw audioError;
        }
      } finally {
        setIsPlayingAudio(false);
      }
      
      // Step 3: Show permission popup after audio completes (or timeout)
      setCurrentStep('requesting-permission');
      
      // Longer delay for mobile to ensure audio has fully finished
      const permissionDelay = isMobile ? 1000 : 500;
      await new Promise(resolve => setTimeout(resolve, permissionDelay));
      
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
      setIsPlayingAudio(false);
      
      // Provide mobile-specific error messages
      if (isMobile && error instanceof Error && error.message.includes('audio')) {
        setError('Audio setup failed. Please ensure your device is not in silent mode and try again.');
      } else {
        setError('There was an issue setting up the voice assistant. Please refresh the page and try again.');
      }
      setCurrentStep('error');
    }
  };

  const handleRetry = () => {
    setError(null);
    setHasUserTapped(false);
    setAudioContextReady(false);
    setIsPlayingAudio(false);
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
              
              {/* Mobile-specific instructions */}
              <div className="bg-gray-100 border-4 border-gray-300 rounded-2xl p-6">
                <p className="text-gray-900 font-bold text-lg mb-2">
                  Voice-Activated Bible Companion
                </p>
                {isMobile && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mt-4">
                    <p className="text-blue-800 text-sm font-medium">
                      📱 <strong>Mobile Device:</strong> Ensure your device is not in silent mode for the best experience
                    </p>
                  </div>
                )}
                <p className="text-gray-800 text-base font-medium mt-2">
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
              
              <h1 className="text-4xl font-bold text-gray-900 mb-6">Welcome Message</h1>
              
              <div className="bg-green-50 border-4 border-green-200 rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-center gap-1 mb-4">
                  <div className="w-2 h-8 bg-green-600 rounded-full animate-pulse"></div>
                  <div className="w-2 h-12 bg-green-700 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-8 bg-green-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-12 bg-green-700 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  <div className="w-2 h-8 bg-green-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
                
                <p className="text-green-800 text-lg font-medium mb-4">
                  {isPlayingAudio ? '🎵 Playing welcome message...' : '📱 Preparing audio...'}
                </p>
                
                {/* Show the actual message text for mobile users in case audio fails */}
                <div className="bg-white border-2 border-green-300 rounded-xl p-4">
                  <p className="text-green-900 text-base font-medium">
                    "Welcome to My Guiding Light. A popup for microphone access will appear now. Please tap Allow when prompted."
                  </p>
                </div>
              </div>
              
              {isMobile && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <p className="text-blue-800 text-sm">
                    📱 If you don't hear audio, that's normal on mobile. The message above shows what would be spoken.
                  </p>
                </div>
              )}
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
              
              {isMobile && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
                  <p className="text-blue-800 text-sm font-medium">
                    📱 <strong>Mobile Tip:</strong> The permission popup might appear at the top of your screen or in the address bar
                  </p>
                </div>
              )}
              
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

              {isMobile && (
                <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <p className="text-blue-800 text-sm">
                    📱 <strong>Mobile Troubleshooting:</strong> Make sure your device is not in silent mode, check volume settings, and ensure no other apps are using the microphone.
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return renderContent();
};