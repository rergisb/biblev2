import React, { useState } from 'react';
import { Mic, MicOff, RefreshCw, AlertCircle, Settings, ExternalLink } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface MicrophoneSetupProps {
  onPermissionGranted: () => void;
}

export const MicrophoneSetup: React.FC<MicrophoneSetupProps> = ({ onPermissionGranted }) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const { requestMicrophonePermission, microphonePermissionStatus, error } = useSpeechRecognition();

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestMicrophonePermission();
      if (granted) {
        onPermissionGranted();
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const getStatusIcon = () => {
    switch (microphonePermissionStatus) {
      case 'granted':
        return <Mic className="w-8 h-8 text-green-600" />;
      case 'denied':
        return <MicOff className="w-8 h-8 text-red-600" />;
      default:
        return <Mic className="w-8 h-8 text-gray-600" />;
    }
  };

  const getStatusMessage = () => {
    switch (microphonePermissionStatus) {
      case 'granted':
        return {
          title: 'Microphone Access Granted',
          message: 'Your voice assistant is ready to help with biblical guidance.',
          color: 'green'
        };
      case 'denied':
        return {
          title: 'Microphone Access Denied',
          message: 'Voice interaction is required for the best experience with this Bible companion.',
          color: 'red'
        };
      case 'prompt':
        return {
          title: 'Microphone Permission Needed',
          message: 'This voice-activated Bible companion needs microphone access to provide spiritual guidance.',
          color: 'blue'
        };
      default:
        return {
          title: 'Setting Up Voice Access',
          message: 'We need to check your microphone permissions to get started.',
          color: 'gray'
        };
    }
  };

  const status = getStatusMessage();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center">
          {/* Status Icon */}
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
            status.color === 'green' ? 'bg-green-100' :
            status.color === 'red' ? 'bg-red-100' :
            status.color === 'blue' ? 'bg-blue-100' :
            'bg-gray-100'
          }`}>
            {getStatusIcon()}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{status.title}</h1>
          
          {/* Message */}
          <p className="text-gray-600 text-lg mb-6 leading-relaxed">{status.message}</p>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-800 text-sm leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-4">
            {microphonePermissionStatus !== 'granted' && (
              <button
                onClick={handleRequestPermission}
                disabled={isRequesting}
                className="w-full px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-900 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isRequesting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Requesting Access...
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" />
                    Allow Microphone Access
                  </>
                )}
              </button>
            )}

            {microphonePermissionStatus === 'granted' && (
              <button
                onClick={onPermissionGranted}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 font-medium flex items-center justify-center gap-2"
              >
                <Mic className="w-5 h-5" />
                Continue to Bible Companion
              </button>
            )}
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <Settings className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <h3 className="text-blue-900 font-semibold mb-2">Need Help?</h3>
                <div className="text-blue-800 text-sm space-y-2">
                  <p>If you're having trouble with microphone access:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Check your browser's address bar for a microphone icon</li>
                    <li>Look for permission popups that might be blocked</li>
                    <li>Ensure no other apps are using your microphone</li>
                    <li>Try refreshing the page and allowing access when prompted</li>
                  </ul>
                </div>
              </div>
            </div>

            {microphonePermissionStatus === 'denied' && (
              <div className="border-t border-blue-200 pt-4">
                <p className="text-blue-800 text-sm mb-3">
                  <strong>To manually enable microphone access:</strong>
                </p>
                <div className="text-blue-700 text-xs space-y-1">
                  <p>• <strong>Chrome:</strong> Click the lock icon → Site settings → Microphone → Allow</p>
                  <p>• <strong>Safari:</strong> Safari menu → Settings → Websites → Microphone → Allow</p>
                  <p>• <strong>Firefox:</strong> Click the shield icon → Permissions → Microphone → Allow</p>
                </div>
              </div>
            )}
          </div>

          {/* Accessibility Note */}
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <p className="text-gray-700 text-sm leading-relaxed">
              <strong>♿ Accessibility:</strong> This Bible companion is designed to be fully accessible through voice interaction, making it perfect for users with visual impairments or those who prefer hands-free operation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};