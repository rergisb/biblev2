import React from 'react';
import { ChatMessage } from './ChatMessage';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  audioBuffer?: ArrayBuffer;
  confidence?: number;
}

interface ChatDisplayProps {
  messages: Message[];
  onPlayMessageAudio: (messageId: string) => Promise<void>;
  playingMessageId: string | null;
}

export const ChatDisplay: React.FC<ChatDisplayProps> = ({
  messages,
  onPlayMessageAudio,
  playingMessageId
}) => {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-6 pb-6">
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-3xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-900 text-center">Conversation</h3>
          <p className="text-sm text-gray-600 text-center">{messages.length} messages</p>
        </div>
        
        <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          <div className="p-4 space-y-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message.text}
                isUser={message.isUser}
                timestamp={message.timestamp}
                confidence={message.confidence}
                onPlayAudio={!message.isUser ? () => onPlayMessageAudio(message.id) : undefined}
                isPlaying={playingMessageId === message.id}
                hasAudioCache={!message.isUser && !!message.audioBuffer}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};