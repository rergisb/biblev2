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
  const [currentStep, setCurrentStep] = useState<'initial' | 'audio-prompt' | 'preparing-popup' | 'requesting-permission' | 'completed' | 'error'>('initial');
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

    // Start with the initial screen, but show audio prompt for mobile
    if (isMobile) {
      setCurrentStep('audio-prompt');
    } else {
      setCurrentStep('initial');
    }
  }, [hasCompletedOnboarding, onOnboardingComplete, browserSupportsSpeechRecognition, isMobile]);

  const playWelcomeMessage = async () => {
    try {
      console.log('🎤 Playing welcome message...');
      setIsPlayingAudio(true);
      setError(null);
      
      // Prepare audio context
      if (!audioContextReady) {
        await prepareAudioContext();
        setAudioContextReady(true);
      }
      
      const welcomeMessage = "Welcome to My Guiding Light. To begin, tap anywhere on the screen to enable voice interaction.";
      const audioBuffer = await synthesizeSpeech(welcomeMessage);
      await playAudioBuffer(audioBuffer);
      
      console.log('✅ Welcome message played successfully');
      
      // Small delay before moving to next step
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Move to preparing popup step
      setCurrentStep('preparing-popup');
      
    } catch (error) {
      console.error('❌ Failed to play welcome message:', error);
      setError('Audio playback failed. Please check your device settings and try again.');
    } finally {
      setIsPlayingAudio(false);
    }
  };

  const handleAudioPromptTap = async () => {
    if (hasUserTapped) return;
    
    setHasUserTapped(true);
    await playWelcomeMessage();
  };

  const handleContinueWithoutAudio = () => {
    setCurrentStep('preparing-popup');
  };

  const handlePreparePopup = async () => {
    try {
      setIsPlayingAudio(true);
      
      // Ensure audio context is ready
      if (!audioContextReady) {
        await prepareAudioContext();
        setAudioContextReady(true);
      }
      
      const secondMessage = "A popup for microphone access will appear now. Please tap Allow when prompted.";
      
      try {
        const audioBuffer = await synthesizeSpeech(secondMessage);
        await playAudioBuffer(audioBuffer);
        console.log('✅ Second message played successfully');
      } catch (audioError) {
        console.warn('⚠️ Audio playback failed, continuing with permission request:', audioError);
      }

      setIsPlayingAudio(false);

      // Small delay before requesting permission
      await new Promise(resolve => setTimeout(resolve, 500));

      // Request microphone permission
      console.log('🎙️ Requesting microphone permission...');
      setCurrentStep('requesting-permission');

      const permissionGranted = await requestMicrophonePermission();
      
      if (permissionGranted) {
        console.log('✅ Microphone permission granted');
        setCurrentStep('completed');
        
        // Mark onboarding as completed
        setHasCompletedOnboarding(true);
        
        // Small delay before transitioning
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Proceed to main app
        onOnboardingComplete();
      } else {
        console.log('❌ Microphone permission denied');
        setError('Microphone access is required for this voice-activated Bible companion. Please refresh the page and allow microphone access when prompted.');
        setCurrentStep('error');
      }

    } catch (error) {
      console.error('❌ Error in prepare popup flow:', error);
      setError('There was an issue setting up the voice assistant. Please refresh the page and try again.');
      setCurrentStep('error');
      setIsPlayingAudio(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setHasUserTapped(false);
    setCurrentStep(isMobile ? 'audio-prompt' : 'initial');
  };

  const handleSkipOnboarding = () => {
    console.log('⏭️ User chose to skip onboarding');
    setHasCompletedOnboarding(true);
    onOnboardingComplete();
  };

  // Render different states
  const renderContent = () => {
    switch (currentStep) {
      case 'initial':
        return (
          <div 
            className="text-center cursor-pointer min-h-screen flex items-center justify-center"
            onClick={playWelcomeMessage}
          >
            <div className="w-full max-w-lg">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mic className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Welcome to My Guiding Light</h1>
              <p className="text-gray-600 text-xl mb-8 leading-relaxed">
                Your AI-powered Bible companion for spiritual guidance and scripture.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 max-w-md mx-auto mb-8">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <Volume2 className="w-5 h-5 text-blue-600" />
                  <p className="text-blue-800 text-sm font-medium">Voice Message Ready</p>
                </div>
                
                <p className="text-blue-800 text-sm leading-relaxed mb-3">
                  <strong>Message:</strong><br />
                  "Welcome to My Guiding Light. To begin, tap anywhere on the screen to enable voice interaction."
                </p>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playWelcomeMessage();
                  }}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Play Welcome Message
                </button>
              </div>

              <div className="animate-bounce">
                <div className="w-4 h-4 bg-gray-800 rounded-full mx-auto"></div>
              </div>
              <p className="text-gray-500 text-sm mt-4">Tap anywhere to start</p>
            </div>
          </div>
        );

      case 'audio-prompt':
        return (
          <div className="text-center min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-lg">
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
                  onClick={handleAudioPromptTap}
                  disabled={isPlayingAudio || hasUserTapped}
                  className="w-full h-32 bg-gray-900 hover:bg-black text-white rounded-3xl transition-all duration-300 font-bold text-2xl flex flex-col items-center justify-center gap-4 disabled:opacity-70 disabled:cursor-not-allowed shadow-2xl border-4 border-gray-800 hover:border-black transform hover:scale-105 active:scale-95"
                  style={{ minHeight: '128px' }}
                >
                  {isPlayingAudio ? (
                    <>
                      <Volume2 className="w-12 h-12 animate-pulse" />
                      <span className="text-xl">🔊 Playing Audio...</span>
                      <div className="flex gap-2">
                        <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
                        <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </>
                  ) : hasUserTapped ? (
                    <>
                      <Volume2 className="w-12 h-12" />
                      <span className="text-xl">✅ Audio Played</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-12 h-12" />
                      <span className="text-xl">🔊 TAP TO PLAY AUDIO</span>
                      <span className="text-lg font-normal">Enable voice features</span>
                    </>
                  )}
                </button>
              </div>
              
              {/* High contrast info box */}
              <div className="bg-gray-100 border-4 border-gray-300 rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">📱</span>
                  </div>
                  <p className="text-gray-900 font-bold text-lg">Mobile Device Detected</p>
                </div>
                
                <p className="text-gray-800 text-lg leading-relaxed mb-4 font-medium">
                  Mobile browsers require user interaction before playing audio. Tap the large button above to enable voice features.
                </p>
                
                <div className="bg-amber-100 border-2 border-amber-300 rounded-xl p-4">
                  <p className="text-amber-900 text-base font-medium">
                    <strong>♿ Accessibility:</strong> This app is designed for visually impaired users with large, high-contrast buttons and voice guidance.
                  </p>
                </div>
              </div>
              
              {/* Secondary option with high contrast */}
              <button
                onClick={handleContinueWithoutAudio}
                className="w-full h-16 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-2xl transition-colors duration-200 font-bold text-lg border-2 border-gray-400 hover:border-gray-500"
              >
                Continue Without Audio (Not Recommended)
              </button>
            </div>
          </div>
        );

      case 'preparing-popup':
        return (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Volume2 className={`w-10 h-10 text-white ${isPlayingAudio ? 'animate-pulse' : ''}`} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Setting Up Microphone</h1>
            <p className="text-gray-600 text-lg mb-6">
              {isPlayingAudio ? 'Please listen to the instructions...' : 'Ready to request microphone access'}
            </p>
            
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 max-w-md mx-auto mb-6">
              <p className="text-green-800 text-sm leading-relaxed mb-4">
                🔊 <strong>Audio Message:</strong><br />
                "A popup for microphone access will appear now. Please tap Allow when prompted."
              </p>
              
              {isPlayingAudio && (
                <div className="flex items-center justify-center gap-1 mb-4">
                  <div className="w-1 h-4 bg-green-600 rounded-full animate-pulse"></div>
                  <div className="w-1 h-6 bg-green-700 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-4 bg-green-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1 h-6 bg-green-700 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  <div className="w-1 h-4 bg-green-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              )}
              
              <button
                onClick={handlePreparePopup}
                disabled={isPlayingAudio}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors duration-200 font-medium disabled:opacity-50"
              >
                {isPlayingAudio ? 'Playing Instructions...' : 'Continue to Microphone Setup'}
              </button>
            </div>
          </div>
        );

      case 'requesting-permission':
        return (
          <div className="text-center">
            <div className="w-20 h-20 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Mic className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Microphone Permission</h1>
            <p className="text-gray-600 text-lg mb-6">Please tap "Allow" when prompted by your browser</p>
            
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 max-w-md mx-auto">
              <p className="text-orange-800 text-sm leading-relaxed mb-4">
                <strong>What to do:</strong>
              </p>
              <ol className="text-orange-700 text-sm text-left space-y-2">
                <li>1. Look for a browser popup asking for microphone access</li>
                <li>2. Click "Allow" or "Yes" to grant permission</li>
                <li>3. If you don't see a popup, check your browser's address bar for a microphone icon</li>
              </ol>
            </div>
            
            <div className="mt-6">
              <div className="flex items-center justify-center gap-2 text-orange-600 text-sm">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span>Waiting for your response...</span>
              </div>
            </div>
          </div>
        );

      case 'completed':
        return (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mic className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Setup Complete!</h1>
            <p className="text-gray-600 text-lg mb-6">Your voice assistant is ready to help with biblical guidance</p>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 max-w-md mx-auto">
              <p className="text-green-800 text-sm">
                ✅ <strong>Success!</strong> You can now use voice commands to get Bible verses, spiritual guidance, and prayer support.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-green-600 text-sm mt-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Redirecting to your Bible companion...</span>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Setup Issue</h1>
            <p className="text-gray-600 text-lg mb-6">We encountered a problem setting up your voice assistant</p>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-md mx-auto mb-6">
                <p className="text-red-800 text-sm leading-relaxed">
                  <strong>Error:</strong><br />
                  {error}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-900 transition-all duration-200 font-medium"
              >
                Try Again
              </button>
              
              <button
                onClick={handleSkipOnboarding}
                className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
              >
                Continue Without Voice (Not Recommended)
              </button>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="text-blue-800 text-xs leading-relaxed">
                <strong>💡 Tip:</strong> This app is designed for visually impaired users and works best with voice interaction enabled.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {renderContent()}
      </div>
    </div>
  );
};