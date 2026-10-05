import React from 'react';
import { ActivitySuggestion } from '../types';
import { Heart, Users, User, Leaf, Brain } from 'lucide-react';

interface ActivityCardProps {
  activity: ActivitySuggestion;
  onAccept: () => void;
  onSkip: () => void;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'social': return <Users className="w-5 h-5" />;
    case 'solo': return <User className="w-5 h-5" />;
    case 'nature': return <Leaf className="w-5 h-5" />;
    case 'mindful': return <Brain className="w-5 h-5" />;
    case 'group': return <Users className="w-5 h-5" />;
    default: return <Heart className="w-5 h-5" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'social': return 'bg-blue-100 text-blue-700';
    case 'solo': return 'bg-purple-100 text-purple-700';
    case 'nature': return 'bg-green-100 text-green-700';
    case 'mindful': return 'bg-amber-100 text-amber-700';
    case 'group': return 'bg-indigo-100 text-indigo-700';
    default: return 'bg-rose-100 text-rose-700';
  }
};

export const ActivityCard: React.FC<ActivityCardProps> = ({ activity, onAccept, onSkip }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto transform transition-all duration-300 hover:scale-105">
      <div className="flex items-center justify-between mb-6">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(activity.type)}`}>
          {getTypeIcon(activity.type)}
          {activity.type}
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-gray-800 mb-4 leading-tight">
        {activity.title}
      </h2>
      
      <p className="text-gray-600 text-lg leading-relaxed mb-8">
        {activity.nudge}
      </p>
      
      <div className="flex gap-3">
        <button
          onClick={onAccept}
          className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
        >
          I'm in! 🌟
        </button>
        <button
          onClick={onSkip}
          className="px-6 py-3 text-gray-500 hover:text-gray-700 font-medium transition-colors duration-200"
        >
          Skip
        </button>
      </div>
    </div>
  );
};