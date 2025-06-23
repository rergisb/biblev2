import React from 'react';
import { User, MessageCircle, Volume2, Zap, Download } from 'lucide-react';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp: Date;
  confidence?: number;
  onPlayAudio?: () => void;
  isPlaying?: boolean;
  hasAudioCache?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isUser,
  timestamp,
  confidence,
  onPlayAudio,
  isPlaying,
  hasAudioCache = false
}) => {
  return (
    <div className={`flex gap-3 p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.01] ${
      isUser 
        ? 'bg-gray-50 border-gray-200 ml-8' 
        : 'bg-white border-gray-300 mr-8 shadow-sm'
    }`}>
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
        isUser 
          ? 'bg-gray-300' 
          : 'bg-gray-800'
      }`}>
        {isUser ? (
          <User className="w-5 h-5 text-gray-700" />
        ) : (
          <MessageCircle className="w-5 h-5 text-white" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-gray-900">
            {isUser ? 'You' : 'Bible Companion'}
          </span>
          <span className="text-xs text-gray-500">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {confidence && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Zap className="w-3 h-3" />
              <span>{Math.round(confidence * 100)}%</span>
            </div>
          )}
          {!isUser && onPlayAudio && (
            <div className="flex items-center gap-1">
              <button
                onClick={onPlayAudio}
                disabled={isPlaying}
                className={`p-1.5 rounded-lg transition-all duration-300 hover:scale-110 ${
                  isPlaying 
                    ? 'bg-gray-200 text-gray-700 animate-pulse' 
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                }`}
                title={hasAudioCache ? "Play cached audio" : "Generate and play audio"}
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
              {hasAudioCache && (
                <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <Download className="w-3 h-3" />
                  <span>Cached</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-800 leading-relaxed text-sm whitespace-pre-wrap">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};