import React from 'react';
import { User, MessageCircle, Volume2, Zap } from 'lucide-react';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp: Date;
  confidence?: number;
  onPlayAudio?: () => void;
  isPlaying?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isUser,
  timestamp,
  confidence,
  onPlayAudio,
  isPlaying
}) => {
  return (
    <div className={`flex gap-4 p-6 rounded-3xl border transition-all duration-500 hover:scale-[1.02] ${
      isUser 
        ? 'bg-gray-50 border-gray-200 ml-16' 
        : 'bg-white border-gray-300 mr-16 shadow-sm'
    }`}>
      <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
        isUser 
          ? 'bg-gray-300' 
          : 'bg-gray-800'
      }`}>
        {isUser ? (
          <User className="w-6 h-6 text-gray-700" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm font-semibold text-gray-900">
            {isUser ? 'You' : 'Bible Companion'}
          </span>
          <span className="text-xs text-gray-500">
            {timestamp.toLocaleTimeString()}
          </span>
          {confidence && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Zap className="w-3 h-3" />
              <span>{Math.round(confidence * 100)}%</span>
            </div>
          )}
          {!isUser && onPlayAudio && (
            <button
              onClick={onPlayAudio}
              disabled={isPlaying}
              className={`p-2 rounded-xl transition-all duration-300 hover:scale-110 ${
                isPlaying 
                  ? 'bg-gray-200 text-gray-700 animate-pulse' 
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
              title="Play audio"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-800 leading-relaxed text-base whitespace-pre-wrap">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};