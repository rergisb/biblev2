import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Settings, Square, Eye } from 'lucide-react';
import { VoiceVisualizer } from './components/VoiceVisualizer';
import { ApiConfigModal } from './components/ApiConfigModal';
import { ChatHistory } from './components/ChatHistory';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { synthesizeSpeech, playAudioBuffer, stopCurrentAudio, prepareAudioContext } from './services/elevenLabsService';
import { generateGeminiResponse } from './services/geminiService';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  audioBuffer?: ArrayBuffer;
  confidence?: number;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: Date;
}

function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPlayedGreeting, setHasPlayedGreeting] = useState(false);
  const [isPlayingGreeting, setIsPlayingGreeting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [pendingTranscript, setPendingTranscript] = useState<string>('');
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const [audioContextReady, setAudioContextReady] = useState(false);
  
  // Chat history state
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');

  // Add ref to track if we're currently processing to prevent duplicates
  const processingRef = useRef(false);

  const {
    transcript,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    confidence,
    error: speechError
  } = useSpeechRecognition();

  // Detect iOS for special handling
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Sync recording state with speech recognition
  useEffect(() => {
    setIsRecording(isListening);
  }, [isListening]);

  // Handle speech recognition errors
  useEffect(() => {
    if (speechError) {
      setError(speechError);
    }
  }, [speechError]);

  // Create new session when first message is added
  useEffect(() => {
    if (messages.length === 1 && !currentSessionId) {
      const newSessionId = Date.now().toString();
      const firstUserMessage = messages.find(m => m.isUser);
      const sessionTitle = firstUserMessage 
        ? firstUserMessage.text.slice(0, 50) + (firstUserMessage.text.length > 50 ? '...' : '')
        : 'New Conversation';
      
      setCurrentSessionId(newSessionId);
      
      const newSession: ChatSession = {
        id: newSessionId,
        title: sessionTitle,
        messages: [...messages],
        timestamp: new Date()
      };
      
      setChatSessions(prev => [newSession, ...prev]);
    } else if (messages.length > 0 && currentSessionId) {
      // Update existing session
      setChatSessions(prev => 
        prev.map(session => 
          session.id === currentSessionId 
            ? { ...session, messages: [...messages], timestamp: new Date() }
            : session
        )
      );
    }
  }, [messages, currentSessionId]);

  // Prepare audio context on first user interaction
  const handleFirstInteraction = async () => {
    if (!userHasInteracted) {
      console.log('👆 First user interaction detected');
      setUserHasInteracted(true);
      
      try {
        await prepareAudioContext();
        setAudioContextReady(true);
        console.log('✅ Audio context prepared');
      } catch (error) {
        console.error('❌ Failed to prepare audio context:', error);
        setError('Audio initialization failed. Some features may not work properly.');
      }
    }
  };

  // Play welcome greeting only after user interaction and audio context is ready
  useEffect(() => {
    const playWelcomeGreeting = async () => {
      if (hasPlayedGreeting || !browserSupportsSpeechRecognition || !userHasInteracted || !audioContextReady) {
        return;
      }
      
      try {
        setIsPlayingGreeting(true);
        const greetingText = "Hello there! Want to read a verse or get some Bible advice? Tap the button to start.";
        const audioBuffer = await synthesizeSpeech(greetingText);
        
        await playAudioBuffer(audioBuffer);
        setHasPlayedGreeting(true);
      } catch (error) {
        console.error('Error playing welcome greeting:', error);
        // Don't show error for greeting, just mark as played
        setHasPlayedGreeting(true);
      } finally {
        setIsPlayingGreeting(false);
      }
    };

    if (userHasInteracted && audioContextReady) {
      const timer = setTimeout(playWelcomeGreeting, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasPlayedGreeting, browserSupportsSpeechRecognition, userHasInteracted, audioContextReady]);

  // Handle transcript changes - simplified for better reliability
  useEffect(() => {
    if (transcript && transcript.trim()) {
      console.log('📝 Transcript received:', transcript, 'isListening:', isListening);
      
      // For mobile devices, process transcript immediately when we get it
      if (isMobile || !isListening) {
        console.log('📱 Processing transcript immediately');
        handleUserMessage(transcript, confidence);
        resetTranscript();
      } else {
        // For desktop, store as pending while still listening
        setPendingTranscript(transcript);
      }
    }
  }, [transcript, isListening, confidence, isMobile]);

  // Handle when listening stops - process any pending transcript (desktop only)
  useEffect(() => {
    if (!isMobile && !isListening && pendingTranscript && pendingTranscript.trim()) {
      console.log('🖥️ Processing pending transcript:', pendingTranscript);
      handleUserMessage(pendingTranscript, confidence);
      setPendingTranscript('');
      resetTranscript();
    }
  }, [isListening, pendingTranscript, confidence, isMobile]);

  const addMessage = (text: string, isUser: boolean, confidence?: number) => {
    const newMessage: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text,
      isUser,
      timestamp: new Date(),
      confidence
    };
    
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const handleUserMessage = async (userText: string, confidenceScore?: number) => {
    if (!userText.trim() || processingRef.current) {
      console.log('⏭️ Skipping message - empty or already processing');
      return;
    }

    console.log('🔄 Processing user message:', userText);
    
    // Set processing flag to prevent duplicates
    processingRef.current = true;
    setIsProcessing(true);
    setError(null);

    // Stop any currently playing audio
    stopAudio();

    // Add user message to chat
    addMessage(userText, true, confidenceScore);

    try {
      // Add haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 30, 50]);
      }
      
      // Generate AI response using Gemini
      console.log('🤖 Sending to Gemini:', userText);
      const aiText = await generateGeminiResponse(userText);
      console.log('✅ Gemini response:', aiText);
      
      // Add AI response to chat
      addMessage(aiText, false);
      
      // Convert AI response to speech
      console.log('🔊 Converting to speech...');
      const audioBuffer = await synthesizeSpeech(aiText);
      
      // Auto-play response with haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      
      setIsPlayingAudio(true);
      
      try {
        await playAudioBuffer(audioBuffer);
        setIsPlayingAudio(false);
      } catch (audioError) {
        console.error('❌ Audio playback failed:', audioError);
        setIsPlayingAudio(false);
        
        // Show user-friendly error for audio issues
        if (audioError instanceof Error) {
          if (audioError.message.includes('user interaction') || audioError.message.includes('tap the screen')) {
            setError('Please tap the screen first to enable audio on your device.');
          } else if (audioError.message.includes('not supported')) {
            setError('Audio not supported on this device.');
          } else {
            setError('Audio playback failed. Please check your device settings.');
          }
        } else {
          setError('Audio playback failed. Please try again.');
        }
      }
      
    } catch (error) {
      console.error('❌ Error processing message:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Gemini')) {
          setError('Unable to connect to AI service. Please check your internet connection and try again.');
        } else if (error.message.includes('ElevenLabs') || error.message.includes('speech')) {
          setError('Voice synthesis error. Please check your ElevenLabs configuration in settings.');
        } else {
          setError('Something went wrong. Please try again.');
        }
      } else {
        setError('Connection error. Please check your network and try again.');
      }
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  };

  const stopAudio = () => {
    // Stop the global audio
    stopCurrentAudio();
    setIsPlayingAudio(false);
    setIsPlayingGreeting(false);
  };

  const handleVoiceStart = async () => {
    // Handle first interaction
    await handleFirstInteraction();
    
    setError(null);
    setPendingTranscript('');
    
    // Stop any currently playing audio
    stopAudio();
    
    // Haptic feedback on start
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    try {
      console.log('🎙️ Starting voice recognition...');
      await startListening();
    } catch (error) {
      console.error('❌ Error starting voice recognition:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Unable to start voice recognition. Please check your microphone settings.');
      }
    }
  };

  const handleVoiceStop = () => {
    // Haptic feedback on stop
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
    
    console.log('🛑 Stopping voice recording...');
    stopListening();
  };

  const handleStopAudio = () => {
    // Haptic feedback on stop
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 20, 30]);
    }
    
    console.log('🔇 Stopping audio playback...');
    stopAudio();
  };

  const handleButtonClick = async () => {
    // Handle first interaction
    await handleFirstInteraction();
    
    if (isPlayingAudio || isPlayingGreeting) {
      // If audio is playing, stop it
      handleStopAudio();
    } else if (isRecording) {
      // If recording, stop recording
      handleVoiceStop();
    } else {
      // If idle, start recording
      await handleVoiceStart();
    }
  };

  const handleVisualizerClick = async () => {
    // Handle first interaction
    await handleFirstInteraction();
    
    // Only handle clicks when audio is playing
    if (isPlayingAudio || isPlayingGreeting) {
      handleStopAudio();
    }
  };

  // Handle tap anywhere to start conversation
  const handleScreenTap = async (e: React.MouseEvent) => {
    // Handle first interaction
    await handleFirstInteraction();
    
    // Only trigger if not already recording/processing and not clicking the button or visualizer
    if (!isRecording && !isProcessing && !isPlayingAudio && !isPlayingGreeting) {
      const target = e.target as HTMLElement;
      // Don't trigger if clicking the actual button, config button, or visualizer
      if (!target.closest('button') && !target.closest('.voice-visualizer') && !target.closest('header')) {
        await handleVoiceStart();
      }
    }
  };

  const handleLoadSession = (session: ChatSession) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setShowChatHistory(false);
  };

  const handleDeleteSession = (sessionId: string) => {
    setChatSessions(prev => prev.filter(session => session.id !== sessionId));
    
    // If we deleted the current session, clear the current messages
    if (sessionId === currentSessionId) {
      setMessages([]);
      setCurrentSessionId('');
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setCurrentSessionId('');
    setError(null);
    stopAudio();
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="bg-gray-50 border border-gray-200 p-8 rounded-3xl shadow-lg text-center max-w-md">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <MicOff className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Browser Not Supported</h1>
          <p className="text-gray-700 leading-relaxed mb-4">
            Your browser doesn't support speech recognition. Please use Chrome, Safari, or another modern browser to experience the voice assistant.
          </p>
          <p className="text-sm text-gray-600 mb-4">
            On iOS, make sure you're using Safari and have microphone permissions enabled.
          </p>
          {isMobile && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
              <p className="text-amber-800 text-sm">
                📱 <strong>Mobile Tip:</strong> Make sure to allow microphone access when prompted by your browser.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-white text-gray-900 overflow-hidden cursor-pointer"
      onClick={handleScreenTap}
    >
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left - Chat History Button */}
          <button
            onClick={async (e) => {
              e.stopPropagation();
              await handleFirstInteraction();
              setShowChatHistory(true);
            }}
            className="p-3 bg-gray-50 border border-gray-200 rounded-2xl hover:bg-gray-100 transition-all duration-200 group shadow-sm"
            title="View Chat History"
          >
            <Eye className="w-6 h-6 text-gray-600 group-hover:text-gray-900 transition-all duration-300" />
            {messages.length > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-gray-800 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">{messages.length}</span>
              </div>
            )}
          </button>

          {/* Center - Logo */}
          <div className="flex items-center justify-center">
            <img 
              src="https://i.ibb.co/yj8Qp41/guidinglight-upscaled.png" 
              alt="Guiding Light Logo" 
              className="h-12 w-auto object-contain"
            />
          </div>

          {/* Right - Settings Button */}
          <button
            onClick={async (e) => {
              e.stopPropagation();
              await handleFirstInteraction();
              setShowApiConfig(true);
            }}
            className="p-3 bg-gray-50 border border-gray-200 rounded-2xl hover:bg-gray-100 transition-all duration-200 group shadow-sm"
            title="Configure ElevenLabs API"
          >
            <Settings className="w-6 h-6 text-gray-600 group-hover:text-gray-900 group-hover:rotate-90 transition-all duration-300" />
          </button>
        </div>
      </header>

      {/* Subtle Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gray-100 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gray-100 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gray-50 rounded-full blur-3xl opacity-20"></div>
      </div>

      {/* Main Content Container - adjusted for header */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6 pt-24">
        
        {/* Central Visualizer Area */}
        <div className="flex-1 flex items-center justify-center w-full max-w-md">
          <div 
            className={`relative voice-visualizer ${
              (isPlayingAudio || isPlayingGreeting) ? 'cursor-pointer' : ''
            }`}
            onClick={handleVisualizerClick}
          >
            {/* Main Visualizer */}
            <VoiceVisualizer
              isRecording={isRecording}
              isPlaying={isPlayingAudio || isPlayingGreeting}
              audioLevel={isRecording ? 0.8 : isPlayingAudio ? 0.6 : 0.1}
            />
            
            {/* Central Status Indicator */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${
                isRecording 
                  ? 'bg-gray-800/10 shadow-lg shadow-gray-800/20' 
                  : isPlayingAudio || isPlayingGreeting
                  ? 'bg-gray-700/10 shadow-lg shadow-gray-700/20'
                  : 'bg-gray-100/50'
              }`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isRecording 
                    ? 'bg-gray-800/20 animate-pulse' 
                    : isPlayingAudio || isPlayingGreeting
                    ? 'bg-gray-700/20 animate-pulse'
                    : 'bg-gray-200/50'
                }`}>
                  {isPlayingAudio || isPlayingGreeting ? (
                    <Square className={`w-6 h-6 text-gray-700 fill-current pointer-events-auto cursor-pointer`} />
                  ) : (
                    <Mic className={`w-8 h-8 transition-colors duration-300 ${
                      isRecording 
                        ? 'text-gray-800' 
                        : 'text-gray-500'
                    }`} />
                  )}
                </div>
              </div>
            </div>
            
            {/* Click hint overlay for audio playing state - using gray instead of red */}
            {(isPlayingAudio || isPlayingGreeting) && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="absolute inset-0 rounded-full bg-gray-200 animate-pulse"></div>
              </div>
            )}
          </div>
        </div>

        {/* Status Text Area */}
        <div className="w-full max-w-md space-y-4 mb-8">
          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
              <p className="text-red-800 text-sm text-center">{error}</p>
              {error.includes('tap the screen') && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-blue-800 text-xs text-center">
                    💡 <strong>Quick Fix:</strong> Tap anywhere on the screen, then try speaking again.
                  </p>
                </div>
              )}
              {error.includes('permission') && isMobile && (
                <p className="text-red-700 text-xs text-center mt-2">
                  📱 On mobile: Check browser settings → Site permissions → Microphone
                </p>
              )}
            </div>
          )}

          {/* Audio Context Status */}
          {userHasInteracted && !audioContextReady && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl">
              <p className="text-amber-800 text-sm text-center">
                🔊 Preparing audio system...
              </p>
            </div>
          )}

          {/* Status Messages */}
          <div className="text-center min-h-[60px] flex items-center justify-center">
            {isPlayingGreeting ? (
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-2 h-2 bg-gray-700 rounded-full animate-pulse"></div>
                  <p className="text-gray-700 font-medium">Welcome to your Bible companion...</p>
                </div>
                <p className="text-gray-500 text-xs">Tap the center or button to stop</p>
              </div>
            ) : isRecording ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-gray-800 rounded-full animate-pulse"></div>
                  <p className="text-gray-800 font-medium">Listening...</p>
                </div>
                <p className="text-gray-600 text-sm">
                  {isMobile ? 'Speak clearly and wait for processing' : 'Share your heart or ask for guidance'}
                </p>
                {pendingTranscript && (
                  <p className="text-gray-700 text-xs italic">"{pendingTranscript}"</p>
                )}
              </div>
            ) : isProcessing ? (
              <div className="flex items-center justify-center gap-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-700 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-800 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-gray-700 font-medium">Seeking wisdom...</span>
              </div>
            ) : isPlayingAudio ? (
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-2 h-2 bg-gray-700 rounded-full animate-pulse"></div>
                  <span className="text-gray-700 font-medium">🔊 Speaking God's word...</span>
                </div>
                <p className="text-gray-500 text-xs">Tap the center or button to stop and speak</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-800 font-medium mb-2">Ready for Bible guidance</p>
                <p className="text-gray-600 text-sm mb-1">Ask for a verse or spiritual advice</p>
                <p className="text-gray-500 text-xs">
                  {!userHasInteracted ? 
                    'Tap anywhere to start and enable audio' :
                    (isMobile ? 'Tap the button and speak clearly' : 'Tap the button below to speak')
                  }
                </p>
                {isMobile && !userHasInteracted && (
                  <p className="text-gray-400 text-xs mt-1">
                    📱 First tap enables audio and microphone
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Interaction Button */}
        <div className="relative">
          <button
            onClick={handleButtonClick}
            disabled={isProcessing}
            className={`relative w-20 h-20 rounded-full transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
              isPlayingAudio || isPlayingGreeting
                ? 'bg-gray-700 hover:bg-gray-800 shadow-gray-700/30'
                : isRecording
                ? 'bg-gray-700 hover:bg-gray-800 shadow-gray-700/30'
                : 'bg-gray-800 hover:bg-gray-900 shadow-gray-800/30 hover:scale-105'
            }`}
            aria-label={
              isPlayingAudio || isPlayingGreeting 
                ? 'Stop audio' 
                : isRecording 
                ? 'Stop recording' 
                : 'Start recording'
            }
          >
            {/* Glow Effect */}
            <div className={`absolute inset-0 rounded-full transition-all duration-300 ${
              isRecording || isPlayingAudio || isPlayingGreeting
                ? 'bg-gray-700/20 animate-ping'
                : 'bg-gray-800/20'
            }`}></div>
            
            {/* Button Content */}
            <div className="relative z-10 w-full h-full flex items-center justify-center">
              {isPlayingAudio || isPlayingGreeting ? (
                <Square className="w-6 h-6 text-white fill-current" />
              ) : isRecording ? (
                <div className="w-6 h-6 bg-white rounded-sm"></div>
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </div>
          </button>

          {/* Pulse Ring for Active States */}
          {(isRecording || isPlayingAudio || isPlayingGreeting) && (
            <div className={`absolute inset-0 rounded-full animate-ping ${
              isRecording || isPlayingAudio || isPlayingGreeting
                ? 'bg-gray-700/30' 
                : 'bg-gray-700/30'
            }`}></div>
          )}
        </div>

        {/* Bottom Spacing */}
        <div className="h-8"></div>
      </div>

      {/* API Configuration Modal */}
      <ApiConfigModal 
        isOpen={showApiConfig} 
        onClose={() => setShowApiConfig(false)} 
      />

      {/* Chat History Modal */}
      <ChatHistory
        isOpen={showChatHistory}
        onClose={() => setShowChatHistory(false)}
        sessions={chatSessions}
        onLoadSession={handleLoadSession}
        onDeleteSession={handleDeleteSession}
        onNewConversation={handleNewConversation}
      />
    </div>
  );
}

export default App;