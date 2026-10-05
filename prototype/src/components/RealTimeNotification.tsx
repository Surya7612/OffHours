import React, { useState, useEffect } from 'react';
import { User, Heart, Users, Clock, X } from 'lucide-react';
import { NotificationChoice } from '../types';

interface RealTimeNotificationProps {
  notification: NotificationChoice;
  onChoose: (choice: 'solo' | 'pod' | 'skip') => void;
  onClose: () => void;
}

export const RealTimeNotification: React.FC<RealTimeNotificationProps> = ({ 
  notification, 
  onChoose, 
  onClose 
}) => {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes to decide

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onChoose('skip');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onChoose]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const podParticipants = notification.podOption.participants.filter(p => p.status === 'confirmed').length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full transform animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-3xl p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-center">
            <Clock className="w-8 h-8 mx-auto mb-2" />
            <h2 className="text-xl font-bold">It's 6:00 PM ✨</h2>
            <p className="text-emerald-100">Time to reclaim your evening</p>
            <div className="mt-2 text-sm text-emerald-100">
              Choose in {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="p-6 space-y-4">
          {/* Solo Option */}
          <button
            onClick={() => onChoose('solo')}
            className="w-full bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 hover:border-purple-300 rounded-2xl p-4 text-left transition-all duration-200 transform hover:scale-105"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 mb-1">
                  {notification.soloOption.title}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  {notification.soloOption.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-purple-600">
                  <Clock className="w-3 h-3" />
                  <span>{notification.soloOption.duration} minutes</span>
                </div>
              </div>
            </div>
          </button>

          {/* Pod Option */}
          <button
            onClick={() => onChoose('pod')}
            className="w-full bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200 hover:border-emerald-300 rounded-2xl p-4 text-left transition-all duration-200 transform hover:scale-105"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 mb-1">
                  {notification.podOption.title}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  {notification.podOption.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-emerald-600">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{notification.podOption.duration} minutes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{podParticipants} people joining</span>
                  </div>
                </div>
              </div>
            </div>
          </button>

          {/* Skip Option */}
          <button
            onClick={() => onChoose('skip')}
            className="w-full text-center py-3 text-gray-500 hover:text-gray-700 font-medium transition-colors duration-200"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};