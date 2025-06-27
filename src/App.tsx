import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Square, MessageCircle } from 'lucide-react';
import { VoiceVisualizer } from './components/VoiceVisualizer';
import { ChatHistory } from './components/ChatHistory';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { synthesizeSpeech, playAudioBuffer, stopCurrentAudio, prepareAudioContext } from './services/elevenLabsService';
import { generateGeminiResponse } from './services/geminiService';
import { playPulseSound } from './utils/audioUtils';

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
  
  // Add ref to prevent multiple greeting attempts
  const greetingAttemptedRef = useRef(false);

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

  // Play pulse sound when processing starts
  useEffect(() => {
    if (isProcessing) {
      playPulseSound().catch(error => {
        console.log('Pulse sound failed:', error);
      });
    }
  }, [isProcessing]);

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

  // Single greeting effect - consolidated and simplified
  useEffect(() => {
    const playGreeting = async () => {
      // Prevent multiple attempts
      if (greetingAttemptedRef.current || hasPlayedGreeting || !browserSupportsSpeechRecognition) {
        return;
      }
      
      greetingAttemptedRef.current = true;
      console.log('🎵 Attempting to play greeting...');
      
      try {
        setIsPlayingGreeting(true);
        
        // Try to prepare audio context
        await prepareAudioContext();
        setAudioContextReady(true);
        setUserHasInteracted(true);
        console.log('✅ Audio context prepared for greeting');
        
        // Play greeting with updated text
        const greetingText = "Hello there! Want to read a verse or get some Bible advice? Enable microphone to start.";
        const audioBuffer = await synthesizeSpeech(greetingText);
        
        await playAudioBuffer(audioBuffer);
        setHasPlayedGreeting(true);
        console.log('✅ Greeting played successfully');
        
      } catch (error) {
        console.error('❌ Greeting failed:', error);
        // Reset flag so user interaction can trigger it later
        greetingAttemptedRef.current = false;
        setHasPlayedGreeting(false);
        setUserHasInteracted(false);
        setAudioContextReady(false);
        
        // Show helpful message for audio issues
        if (error instanceof Error && error.message.includes('user interaction')) {
          setError('Audio requires user interaction. Please tap anywhere to enable voice features.');
        }
      } finally {
        setIsPlayingGreeting(false);
      }
    };

    // Start greeting after a short delay to ensure page is fully loaded
    const timer = setTimeout(playGreeting, 1000);
    return () => clearTimeout(timer);
  }, [hasPlayedGreeting, browserSupportsSpeechRecognition]);

  // Prepare audio context on first user interaction (fallback)
  const handleFirstInteraction = async () => {
    if (!userHasInteracted) {
      console.log('👆 First user interaction detected');
      setUserHasInteracted(true);
      
      try {
        await prepareAudioContext();
        setAudioContextReady(true);
        console.log('✅ Audio context prepared');
        setError(null); // Clear any previous audio errors
        
        // If greeting hasn't played yet, try to play it now
        if (!hasPlayedGreeting && !greetingAttemptedRef.current) {
          greetingAttemptedRef.current = true;
          setIsPlayingGreeting(true);
          
          try {
            const greetingText = "Hello there! Want to read a verse or get some Bible advice? Enable microphone to start.";
            const audioBuffer = await synthesizeSpeech(greetingText);
            
            await playAudioBuffer(audioBuffer);
            setHasPlayedGreeting(true);
            console.log('✅ Manual greeting played successfully');
          } catch (greetingError) {
            console.error('❌ Manual greeting failed:', greetingError);
            greetingAttemptedRef.current = false;
          } finally {
            setIsPlayingGreeting(false);
          }
        }
        
      } catch (error) {
        console.error('❌ Failed to prepare audio context:', error);
        setError('Audio initialization failed. Some features may not work properly.');
      }
    }
  };

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
    
    // Use the same logic as the main button
    await handleButtonClick();
  };

  // Handle tap anywhere to start conversation - simplified to use handleButtonClick
  const handleScreenTap = async (e: React.MouseEvent) => {
    // Don't trigger if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('.voice-visualizer') || target.closest('header')) {
      return;
    }
    
    // Use the same logic as the main button
    await handleButtonClick();
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
            <MessageCircle className="w-6 h-6 text-gray-600 group-hover:text-gray-900 transition-all duration-300" />
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

          {/* Right - Empty space to maintain center alignment */}
          <div className="w-[60px]"></div>
        </div>
      </header>

      {/* Tap anywhere text - closer to navigation bar */}
      <div className="fixed top-20 left-0 right-0 z-20 flex justify-center pt-4">
        <p className="text-lg font-medium text-gray-600 text-center px-6">
          Tap anywhere on screen to start or stop
        </p>
      </div>

      {/* Subtle Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gray-100 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gray-100 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gray-50 rounded-full blur-3xl opacity-20"></div>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6" style={{ paddingTop: '120px' }}>
        
        {/* Central Visualizer Area */}
        <div className="flex-1 flex items-center justify-center w-full max-w-md">
          <div className="relative voice-visualizer">
            {/* Main Visualizer */}
            <VoiceVisualizer
              isRecording={isRecording}
              isPlaying={isPlayingAudio || isPlayingGreeting}
              isProcessing={isProcessing}
              audioLevel={isRecording ? 0.8 : isPlayingAudio ? 0.6 : 0.1}
              onClick={handleVisualizerClick}
            />
          </div>
        </div>

        {/* Ask for Bible verse text - below the overlay */}
        <div className="w-full max-w-md text-center mb-8">
          <p className="text-2xl font-semibold text-gray-800 px-6">
            Ask for Bible verse or spiritual advice
          </p>
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
                <p className="text-gray-500 text-xs">Tap anywhere on the screen to stop</p>
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
                <p className="text-gray-500 text-xs">Tap anywhere on the screen to stop</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-800 font-medium mb-2">Ready for Bible guidance</p>
                <p className="text-gray-500 text-xs">
                  {!userHasInteracted ? 
                    'Audio will start automatically' :
                    'Tap anywhere on the screen to speak'
                  }
                </p>
                {isMobile && !userHasInteracted && (
                  <p className="text-gray-400 text-xs mt-1">
                    📱 Voice greeting will play automatically
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Spacing */}
        <div className="h-8"></div>
      </div>

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