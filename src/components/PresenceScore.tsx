import React, { useState, useEffect } from 'react';
import { Heart, Flame, Calendar, Trophy, RotateCcw } from 'lucide-react';
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

interface PresenceScoreProps {
  points: number;
  streak: number;
  weeklyGoal?: number;
  thisWeekActivities: number;
}

export const PresenceScore: React.FC<PresenceScoreProps> = ({ 
  points, 
  streak, 
  weeklyGoal = 5,
  thisWeekActivities 
}) => {
  const [currentWeekActivities, setCurrentWeekActivities] = useState(thisWeekActivities);
  const [lastResetDate, setLastResetDate] = useState<string | null>(null);

  // Check if we need to reset weekly goals
  useEffect(() => {
    const checkWeeklyReset = () => {
      const now = new Date();
      const currentWeekStart = startOfWeek(now);
      const currentWeekKey = currentWeekStart.toISOString().split('T')[0];
      
      const savedResetDate = localStorage.getItem('last_weekly_reset');
      
      if (savedResetDate !== currentWeekKey) {
        // New week started, reset weekly activities
        setCurrentWeekActivities(0);
        localStorage.setItem('last_weekly_reset', currentWeekKey);
        localStorage.setItem('current_week_activities', '0');
        setLastResetDate(currentWeekKey);
      } else {
        // Load current week activities
        const savedActivities = localStorage.getItem('current_week_activities');
        if (savedActivities) {
          setCurrentWeekActivities(parseInt(savedActivities, 10));
        }
        setLastResetDate(savedResetDate);
      }
    };

    checkWeeklyReset();
    
    // Check every hour for week changes
    const interval = setInterval(checkWeeklyReset, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Update weekly activities when thisWeekActivities changes
  useEffect(() => {
    const now = new Date();
    const currentWeekStart = startOfWeek(now);
    const currentWeekEnd = endOfWeek(now);
    
    // Only update if we're in the current week
    if (isWithinInterval(now, { start: currentWeekStart, end: currentWeekEnd })) {
      setCurrentWeekActivities(thisWeekActivities);
      localStorage.setItem('current_week_activities', thisWeekActivities.toString());
    }
  }, [thisWeekActivities]);

  const progress = (currentWeekActivities / weeklyGoal) * 100;

  const handleManualReset = () => {
    if (window.confirm('Are you sure you want to reset your weekly progress? This action cannot be undone.')) {
      setCurrentWeekActivities(0);
      localStorage.setItem('current_week_activities', '0');
      const now = new Date();
      const currentWeekStart = startOfWeek(now);
      const currentWeekKey = currentWeekStart.toISOString().split('T')[0];
      localStorage.setItem('last_weekly_reset', currentWeekKey);
      alert('Weekly progress has been reset!');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Your Presence</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Heart className="w-5 h-5" />
            <span className="font-bold">{points}</span>
          </div>
          <button
            onClick={handleManualReset}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
            title="Reset weekly progress"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl mb-2 mx-auto">
            <Flame className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-gray-800 dark:text-white">{streak}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Day Streak</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl mb-2 mx-auto">
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-gray-800 dark:text-white">{currentWeekActivities}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">This Week</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl mb-2 mx-auto">
            <Trophy className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-gray-800 dark:text-white">{Math.floor(points / 100)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Level</div>
        </div>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
          <span>Weekly Goal</span>
          <span>{currentWeekActivities}/{weeklyGoal}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {progress >= 100 && (
        <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-3 mt-3">
          <p className="text-emerald-800 dark:text-emerald-300 text-sm font-medium text-center">
            🎉 Weekly goal achieved! You're living fully.
          </p>
        </div>
      )}

      {lastResetDate && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          Week resets every Sunday • Last reset: {new Date(lastResetDate).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};