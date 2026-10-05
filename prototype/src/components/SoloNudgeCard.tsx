import React from 'react';
import { User, Clock, MapPin, Heart, Play, CheckCircle } from 'lucide-react';
import { SoloNudge } from '../types';

interface SoloNudgeCardProps {
  nudge: SoloNudge;
  onStart: (nudgeId: string) => void;
  onComplete: (nudgeId: string) => void;
  onSkip: () => void;
  isActive?: boolean;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'mindful': return '🧘';
    case 'creative': return '🎨';
    case 'nature': return '🌿';
    case 'reflection': return '💭';
    case 'movement': return '🚶';
    default: return '✨';
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'mindful': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    case 'creative': return 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300';
    case 'nature': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'reflection': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'movement': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
};

export const SoloNudgeCard: React.FC<SoloNudgeCardProps> = ({ 
  nudge, 
  onStart, 
  onComplete, 
  onSkip, 
  isActive = false 
}) => {
  return (
    <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 transform transition-all duration-300 hover:scale-105 border border-white/20 dark:border-gray-700/20 ${
      isActive ? 'ring-2 ring-purple-500 shadow-purple-500/20' : ''
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(nudge.type)}`}>
          <span>{getTypeIcon(nudge.type)}</span>
          <span className="capitalize">{nudge.type}</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          <User className="w-4 h-4" />
          <span>Solo time</span>
        </div>
      </div>
      
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-3">
        {nudge.title}
      </h2>
      
      <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed mb-4">
        {nudge.description}
      </p>

      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>{nudge.duration} minutes</span>
        </div>
        {nudge.location && (
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>{nudge.location}</span>
          </div>
        )}
      </div>
      
      <div className="flex gap-3">
        {isActive ? (
          <div className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl text-center flex items-center justify-center gap-2">
            <Play className="w-5 h-5" />
            Activity Active
          </div>
        ) : (
          <>
            <button
              onClick={() => onStart(nudge.id)}
              className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start Solo Time ✨
            </button>
            <button
              onClick={onSkip}
              className="px-6 py-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium transition-colors duration-200"
            >
              Skip
            </button>
          </>
        )}
      </div>
    </div>
  );
};