import React, { useState } from 'react';
import { MapPin, Clock, Users, Heart, MessageCircle, CheckCircle, UserCheck, Play } from 'lucide-react';
import { UnifiedNudge } from '../types';
import { formatDistanceToNow } from 'date-fns';

interface UnifiedNudgeCardProps {
  nudge: UnifiedNudge;
  onJoin: (nudgeId: string) => void;
  onComplete: (nudgeId: string) => void;
  userStatus?: 'interested' | 'confirmed' | 'completed';
  isActive?: boolean;
}

export const UnifiedNudgeCard: React.FC<UnifiedNudgeCardProps> = ({ 
  nudge, 
  onJoin, 
  onComplete, 
  userStatus,
  isActive = false
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [localUserStatus, setLocalUserStatus] = useState(userStatus);
  
  const confirmedCount = nudge.participants.filter(p => p.status === 'confirmed').length;
  const completedCount = nudge.participants.filter(p => p.status === 'completed').length;
  
  const timeUntil = formatDistanceToNow(nudge.scheduledTime, { addSuffix: true });
  const isUpcoming = nudge.scheduledTime > new Date();
  const isHappening = Math.abs(nudge.scheduledTime.getTime() - new Date().getTime()) < 30 * 60 * 1000; // within 30 mins

  const getStatusColor = () => {
    if (localUserStatus === 'completed') return 'from-green-500 to-emerald-600';
    if (localUserStatus === 'confirmed' || isActive) return 'from-blue-500 to-indigo-600';
    if (isHappening) return 'from-orange-500 to-red-600';
    return 'from-emerald-500 to-teal-600';
  };

  const getStatusText = () => {
    if (localUserStatus === 'completed') return 'Completed ✨';
    if (isActive) return 'Activity Active';
    if (localUserStatus === 'confirmed') return 'You\'re in!';
    if (isHappening) return 'Happening now';
    return 'Join';
  };

  const handleButtonClick = () => {
    if (localUserStatus === 'confirmed' && !isActive) {
      onComplete(nudge.id);
      setLocalUserStatus('completed');
      
      // Show success message
      setTimeout(() => {
        alert('Great job completing the activity! 🎉');
      }, 100);
    } else if (!localUserStatus || localUserStatus === 'interested') {
      onJoin(nudge.id);
      setLocalUserStatus('confirmed');
      
      // Show confirmation message
      setTimeout(() => {
        alert('You\'re now confirmed for this activity! See you there! 👋');
      }, 100);
    }
  };

  return (
    <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 mb-4 transform transition-all duration-300 hover:scale-105 border border-white/20 dark:border-gray-700/20 ${
      localUserStatus === 'completed' ? 'ring-2 ring-emerald-500 shadow-emerald-500/20' : ''
    } ${
      isActive ? 'ring-2 ring-blue-500 shadow-blue-500/20' : ''
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">{nudge.title}</h3>
            {localUserStatus === 'confirmed' && !isActive && (
              <UserCheck className="w-5 h-5 text-blue-500" />
            )}
            {localUserStatus === 'completed' && (
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            )}
            {isActive && (
              <Play className="w-5 h-5 text-blue-500" />
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-3">{nudge.description}</p>
          
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{nudge.location.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{timeUntil}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{confirmedCount} joined</span>
            </div>
          </div>

          {completedCount > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex -space-x-2">
                {Array.from({ length: Math.min(completedCount, 3) }).map((_, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center"
                  >
                    <Heart className="w-3 h-3 text-white" />
                  </div>
                ))}
              </div>
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                {completedCount} completed this moment
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        {localUserStatus !== 'completed' && (
          <button
            onClick={handleButtonClick}
            disabled={isActive}
            className={`flex-1 bg-gradient-to-r ${getStatusColor()} text-white font-semibold py-3 px-6 rounded-xl hover:opacity-90 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2`}
          >
            {isActive && <Play className="w-4 h-4" />}
            {getStatusText()}
          </button>
        )}
        
        {localUserStatus === 'completed' && (
          <div className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-3 px-6 rounded-xl text-center flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Activity Completed!
          </div>
        )}
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="px-4 py-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p><strong>Location:</strong> {nudge.location.address}</p>
            <p><strong>Duration:</strong> {nudge.duration} minutes</p>
            {nudge.weather && (
              <p><strong>Weather:</strong> {nudge.weather.condition}, {nudge.weather.temperature}°F</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};