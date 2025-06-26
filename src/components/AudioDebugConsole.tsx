import React, { useState, useRef } from 'react';
import { Play, Square, Volume2, Settings, TestTube, Mic, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { enhancedAudio, speakText } from '../services/enhancedAudioService';
import { synthesizeSpeech, testApiConnection } from '../services/elevenLabsService';
import { safariTTS } from '../services/safariTTSService';

interface AudioDebugConsoleProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioDebugConsole: React.FC<AudioDebugConsoleProps> = ({ isOpen, onClose }) => {
  const [testText, setTestText] = useState('Hello! This is a test of the ElevenLabs audio system.');
  const [isTestingElevenLabs, setIsTestingElevenLabs] = useState(false);
  const [isTestingSafari, setIsTestingSafari] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [audioStatus, setAudioStatus] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);

  // Add log entry
  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    setLogs(prev => [...prev.slice(-19), logEntry]); // Keep last 20 logs
    
    // Auto-scroll to bottom
    setTimeout(() => {
      if (logsRef.current) {
        logsRef.current.scrollTop = logsRef.current.scrollHeight;
      }
    }, 100);
  };

  // Update audio status
  const updateAudioStatus = () => {
    const status = enhancedAudio.getStatus();
    setAudioStatus(status);
    addLog(`Audio status updated: ElevenLabs=${status.elevenLabsAvailable}, Safari=${status.safariTTSAvailable}`);
  };

  // Test ElevenLabs API connection
  const testElevenLabsConnection = async () => {
    setIsTestingConnection(true);
    addLog('Testing ElevenLabs API connection...');
    
    try {
      const isConnected = await testApiConnection();
      if (isConnected) {
        addLog('ElevenLabs API connection successful!', 'success');
      } else {
        addLog('ElevenLabs API connection failed', 'error');
      }
      return isConnected;
    } catch (error) {
      addLog(`ElevenLabs API connection error: ${error}`, 'error');
      return false;
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Test ElevenLabs audio synthesis and playback
  const testElevenLabsAudio = async () => {
    setIsTestingElevenLabs(true);
    addLog('Testing ElevenLabs audio synthesis...');
    
    try {
      // First test API connection
      const connectionOk = await testElevenLabsConnection();
      if (!connectionOk) {
        throw new Error('API connection failed');
      }

      addLog('Synthesizing speech with ElevenLabs...');
      const audioBuffer = await synthesizeSpeech(testText);
      addLog(`Audio buffer created: ${audioBuffer.byteLength} bytes`, 'success');

      addLog('Playing ElevenLabs audio...');
      setIsPlaying(true);
      
      await speakText(testText, {
        preferElevenLabs: true,
        onStart: () => {
          addLog('ElevenLabs playback started', 'success');
        },
        onEnd: () => {
          addLog('ElevenLabs playback completed', 'success');
          setIsPlaying(false);
        },
        onError: (error) => {
          addLog(`ElevenLabs playback error: ${error.message}`, 'error');
          setIsPlaying(false);
        }
      });

    } catch (error) {
      addLog(`ElevenLabs test failed: ${error}`, 'error');
      setIsPlaying(false);
    } finally {
      setIsTestingElevenLabs(false);
    }
  };

  // Test Safari TTS
  const testSafariTTS = async () => {
    setIsTestingSafari(true);
    addLog('Testing Safari TTS...');
    
    try {
      await speakText(testText, {
        preferElevenLabs: false,
        onStart: () => {
          addLog('Safari TTS playback started', 'success');
          setIsPlaying(true);
        },
        onEnd: () => {
          addLog('Safari TTS playback completed', 'success');
          setIsPlaying(false);
        },
        onError: (error) => {
          addLog(`Safari TTS error: ${error.message}`, 'error');
          setIsPlaying(false);
        }
      });
    } catch (error) {
      addLog(`Safari TTS test failed: ${error}`, 'error');
      setIsPlaying(false);
    } finally {
      setIsTestingSafari(false);
    }
  };

  // Run comprehensive audio test
  const runComprehensiveTest = async () => {
    addLog('Starting comprehensive audio test...', 'info');
    setTestResults(null);
    
    try {
      const results = await enhancedAudio.testAudio();
      setTestResults(results);
      addLog(`Test completed: ElevenLabs=${results.elevenLabsWorks}, Safari=${results.safariTTSWorks}, Recommended=${results.recommendedMethod}`, 'success');
    } catch (error) {
      addLog(`Comprehensive test failed: ${error}`, 'error');
    }
  };

  // Stop current playback
  const stopPlayback = () => {
    enhancedAudio.stop();
    setIsPlaying(false);
    addLog('Playback stopped', 'info');
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    addLog('Debug console cleared');
  };

  // Initialize when opening
  React.useEffect(() => {
    if (isOpen) {
      updateAudioStatus();
      addLog('Audio debug console opened');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-2xl flex items-center justify-center">
              <TestTube className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Audio Debug Console</h2>
              <p className="text-sm text-gray-600">Test ElevenLabs and Safari TTS functionality</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Controls */}
          <div className="w-1/2 p-6 border-r border-gray-200 overflow-y-auto">
            {/* Audio Status */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Audio Status
              </h3>
              <button
                onClick={updateAudioStatus}
                className="mb-3 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors"
              >
                Refresh Status
              </button>
              
              {audioStatus && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    {audioStatus.elevenLabsAvailable ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span>ElevenLabs Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {audioStatus.safariTTSAvailable ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span>Safari TTS Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {audioStatus.isPlaying ? (
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-gray-400" />
                    )}
                    <span>Currently Playing: {audioStatus.isPlaying ? 'Yes' : 'No'}</span>
                  </div>
                  {audioStatus.currentMethod && (
                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      Current Method: {audioStatus.currentMethod}
                    </div>
                  )}
                  {audioStatus.browserInfo && (
                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      Browser: {audioStatus.browserInfo.isSafari ? 'Safari' : 'Other'} 
                      {audioStatus.browserInfo.isIOS ? ' (iOS)' : ''}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Test Text Input */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Test Text</h3>
              <textarea
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl text-sm resize-none"
                rows={3}
                placeholder="Enter text to test audio synthesis..."
              />
            </div>

            {/* Test Controls */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Audio Tests</h3>
              
              {/* ElevenLabs Test */}
              <button
                onClick={testElevenLabsAudio}
                disabled={isTestingElevenLabs || isPlaying}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isTestingElevenLabs ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Testing ElevenLabs...
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    Test ElevenLabs Audio
                  </>
                )}
              </button>

              {/* Safari TTS Test */}
              <button
                onClick={testSafariTTS}
                disabled={isTestingSafari || isPlaying}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isTestingSafari ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Testing Safari TTS...
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    Test Safari TTS
                  </>
                )}
              </button>

              {/* API Connection Test */}
              <button
                onClick={testElevenLabsConnection}
                disabled={isTestingConnection}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isTestingConnection ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <TestTube className="w-4 h-4" />
                    Test API Connection
                  </>
                )}
              </button>

              {/* Comprehensive Test */}
              <button
                onClick={runComprehensiveTest}
                disabled={isPlaying}
                className="w-full px-4 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <TestTube className="w-4 h-4" />
                Run All Tests
              </button>

              {/* Stop Playback */}
              {isPlaying && (
                <button
                  onClick={stopPlayback}
                  className="w-full px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  Stop Playback
                </button>
              )}
            </div>

            {/* Test Results */}
            {testResults && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Test Results</h3>
                <div className="bg-gray-50 p-4 rounded-xl space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    {testResults.elevenLabsWorks ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span>ElevenLabs: {testResults.elevenLabsWorks ? 'Working' : 'Failed'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {testResults.safariTTSWorks ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span>Safari TTS: {testResults.safariTTSWorks ? 'Working' : 'Failed'}</span>
                  </div>
                  <div className="mt-3 p-2 bg-blue-50 rounded">
                    <strong>Recommended:</strong> {testResults.recommendedMethod}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Logs */}
          <div className="w-1/2 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Debug Logs</h3>
              <button
                onClick={clearLogs}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
              >
                Clear
              </button>
            </div>
            
            <div 
              ref={logsRef}
              className="flex-1 bg-gray-900 text-green-400 p-4 rounded-xl font-mono text-xs overflow-y-auto"
              style={{ minHeight: '400px' }}
            >
              {logs.length === 0 ? (
                <div className="text-gray-500">No logs yet. Run a test to see debug information.</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className={`mb-1 ${
                    log.includes('ERROR') ? 'text-red-400' :
                    log.includes('SUCCESS') ? 'text-green-400' :
                    log.includes('WARNING') ? 'text-yellow-400' :
                    'text-gray-300'
                  }`}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};