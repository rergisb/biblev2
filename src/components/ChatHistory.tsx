import React from 'react';
import { X, History, MessageCircle, Trash2, Calendar, Plus, User, Bot } from 'lucide-react';

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

interface ChatHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  onLoadSession: (session: ChatSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewConversation: () => void;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  isOpen,
  onClose,
  sessions,
  onLoadSession,
  onDeleteSession,
  onNewConversation
}) => {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getSessionPreview = (messages: Message[]) => {
    const firstUserMessage = messages.find(m => m.isUser);
    return firstUserMessage ? firstUserMessage.text.slice(0, 80) + (firstUserMessage.text.length > 80 ? '...' : '') : 'New conversation';
  };

  const handleNewConversation = () => {
    onNewConversation();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-4xl max-h-[85vh] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-800 rounded-2xl flex items-center justify-center">
              <History className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Conversation History</h2>
              <p className="text-sm text-gray-600">{sessions.length} conversations saved</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleNewConversation}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors duration-200"
              title="Start new conversation"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">New Chat</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {sessions.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center py-12">
                <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-700 text-lg mb-2">No conversations yet</p>
                <p className="text-sm text-gray-500 mb-6">Start chatting to see your history here</p>
                <button
                  onClick={handleNewConversation}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-900 transition-all duration-200 mx-auto"
                >
                  <Plus className="w-5 h-5" />
                  Start Your First Conversation
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6 overflow-y-auto max-h-full">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-gray-50 border border-gray-200 rounded-2xl p-5 hover:bg-gray-100 transition-all duration-200 group cursor-pointer flex flex-col h-fit"
                  onClick={() => onLoadSession(session)}
                >
                  {/* Session Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm text-gray-500">
                          {formatDate(session.timestamp)}
                        </span>
                        <span className="text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded-full">
                          {session.messages.length} messages
                        </span>
                      </div>
                      <h3 className="text-gray-900 font-medium mb-2 line-clamp-2 leading-tight">
                        {session.title}
                      </h3>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="p-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-colors duration-200 opacity-0 group-hover:opacity-100 flex-shrink-0 ml-3"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Message Preview */}
                  <div className="space-y-3 flex-1">
                    {session.messages.slice(0, 3).map((message, index) => (
                      <div key={message.id} className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          message.isUser 
                            ? 'bg-gray-300' 
                            : 'bg-gray-800'
                        }`}>
                          {message.isUser ? (
                            <User className="w-3 h-3 text-gray-600" />
                          ) : (
                            <Bot className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs leading-relaxed line-clamp-2 ${
                            message.isUser ? 'text-gray-700' : 'text-gray-800'
                          }`}>
                            {message.text}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {session.messages.length > 3 && (
                      <div className="text-center">
                        <span className="text-xs text-gray-500 bg-gray-200 px-3 py-1 rounded-full">
                          +{session.messages.length - 3} more messages
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Load Button */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-center text-sm text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                      <span>Click to continue this conversation</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};