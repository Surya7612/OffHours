import React, { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft, Users } from 'lucide-react';
import { ChatRoom, ChatMessage, User } from '../types';

interface ChatInterfaceProps {
  chatRoom: ChatRoom;
  currentUser: User;
  participants: User[];
  onSendMessage: (content: string) => void;
  onBack: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  chatRoom,
  currentUser,
  participants,
  onSendMessage,
  onBack
}) => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatRoom.messages]);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getChatTitle = () => {
    if (chatRoom.type === 'direct') {
      const otherUser = participants.find(p => p.id !== currentUser.id);
      return otherUser?.firstName || 'Chat';
    }
    if (chatRoom.type === 'event') {
      return 'Event Chat';
    }
    return 'Pod Chat';
  };

  const getUserById = (userId: string) => {
    return participants.find(p => p.id === userId) || currentUser;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg h-96 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-800">{getChatTitle()}</h3>
        </div>
        <div className="ml-auto text-sm text-gray-500">
          {participants.length} members
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chatRoom.messages.map(msg => {
          const sender = getUserById(msg.senderId);
          const isCurrentUser = msg.senderId === currentUser.id;
          
          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="text-center">
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {msg.content}
                </span>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                isCurrentUser 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {!isCurrentUser && (
                  <div className="text-xs font-medium mb-1 opacity-70">
                    {sender.firstName}
                  </div>
                )}
                <div className="text-sm">{msg.content}</div>
                <div className={`text-xs mt-1 ${isCurrentUser ? 'text-emerald-100' : 'text-gray-500'}`}>
                  {msg.timestamp.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};