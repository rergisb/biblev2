import React, { useState, useEffect } from 'react';
import { Mic, Volume2, AlertCircle } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { synthesizeSpeech, playAudioBuffer, prepareAudioContext } from '../services/elevenLabsService';

interface OnboardingScreenProps {
  onOnboardingComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onOnboardingComplete }) => {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useLocalStorage('has-completed-onboarding', false);
  const [currentStep, setCurrentStep] = useState<'initial' | 'preparing-popup' | 'requesting-permission' | 'completed' | 'error'>('initial');
  const [error, setError] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [hasUserTapped, setHasUserTapped] = useState(false);
  
  const { requestMicrophonePermission, microphonePermissionStatus, browserSupportsSpeechRecognition } = useSpeechRecognition();

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

    // Start with the initial screen
    setCurrentStep('initial');
  }, [hasCompletedOnboarding, onOnboardingComplete, browserSupportsSpeechRecognition]);

  const handleInitialTap = async () => {
    if (hasUserTapped) return;
    
    setHasUserTapped(true);
    
    try {
      console.log('🚀 User tapped, starting onboarding flow...');
      setError(null);

      // Prepare audio context
      console.log('🔊 Preparing audio context...');
      await prepareAudioContext();

      // Play the first message
      console.log('🎤 Playing first message...');
      setIsPlayingAudio(true);

      const firstMessage = "Welcome to My Guiding Light. To begin, tap anywhere on the screen to enable voice interaction.";
      
      try {
        const audioBuffer = await synthesizeSpeech(firstMessage);
        await playAudioBuffer(audioBuffer);
        console.log('✅ First message played successfully');
      } catch (audioError) {
        console.warn('⚠️ Audio playback failed, continuing with next step:', audioError);
      }

      setIsPlayingAudio(false);

      // Small delay before next step
      await new Promise(resolve => setTimeout(resolve, 500));

      // Move to preparing popup step
      setCurrentStep('preparing-popup');
      
      // Play the second message
      console.log('🎤 Playing second message...');
      setIsPlayingAudio(true);

      const secondMessage = "A pop up for enable microphone will appear now, tap the Allow button";
      
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
      console.error('❌ Onboarding flow error:', error);
      setError('There was an issue setting up the voice assistant. Please refresh the page and try again.');
      setCurrentStep('error');
      setIsPlayingAudio(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setHasUserTapped(false);
    setCurrentStep('initial');
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
            onClick={handleInitialTap}
          >
            <div className="w-full max-w-lg">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mic className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Welcome to My Guiding Light</h1>
              <p className="text-gray-600 text-xl mb-8 leading-relaxed">
                To begin, tap anywhere on the screen to enable voice interaction.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 max-w-md mx-auto mb-8">
                <p className="text-blue-800 text-sm leading-relaxed">
                  <strong>🎤 Voice Message:</strong><br />
                  "Welcome to My Guiding Light. To begin, tap anywhere on the screen to enable voice interaction."
                </p>
              </div>

              <div className="animate-bounce">
                <div className="w-4 h-4 bg-gray-800 rounded-full mx-auto"></div>
              </div>
              <p className="text-gray-500 text-sm mt-4">Tap anywhere to continue</p>
            </div>
          </div>
        );

      case 'preparing-popup':
        return (
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Volume2 className={`w-10 h-10 text-white ${isPlayingAudio ? 'animate-pulse' : ''}`} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Preparing Microphone Setup</h1>
            <p className="text-gray-600 text-lg mb-6">Please listen to the instructions...</p>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 max-w-md mx-auto">
              <p className="text-blue-800 text-sm leading-relaxed">
                🔊 <strong>Audio Message:</strong><br />
                "A pop up for enable microphone will appear now, tap the Allow button"
              </p>
            </div>
            {isPlayingAudio && (
              <div className="flex items-center justify-center gap-1 mt-4">
                <div className="w-1 h-4 bg-blue-600 rounded-full animate-pulse"></div>
                <div className="w-1 h-6 bg-blue-700 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1 h-4 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1 h-6 bg-blue-700 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                <div className="w-1 h-4 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            )}
          </div>
        );

      case 'requesting-permission':
        return (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Mic className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Microphone Permission</h1>
            <p className="text-gray-600 text-lg mb-6">Please tap "Allow" when prompted by your browser</p>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 max-w-md mx-auto">
              <p className="text-green-800 text-sm leading-relaxed mb-4">
                <strong>What to do:</strong>
              </p>
              <ol className="text-green-700 text-sm text-left space-y-2">
                <li>1. Look for a browser popup asking for microphone access</li>
                <li>2. Click "Allow" or "Yes" to grant permission</li>
                <li>3. If you don't see a popup, check your browser's address bar for a microphone icon</li>
              </ol>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
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