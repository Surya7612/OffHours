import React, { useState } from 'react';
import { Users, MapPin, Vote, Calendar, CheckCircle, Clock, X } from 'lucide-react';
import { Pod } from '../types';

interface PodOverviewProps {
  pod: Pod;
  onVoteActivity: (activityId: string, vote: 'yes' | 'no') => void;
}

export const PodOverview: React.FC<PodOverviewProps> = ({ pod, onVoteActivity }) => {
  const [userVote, setUserVote] = useState<'yes' | 'no' | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  
  const activeMembers = pod.members.length;
  const weeklyActivity = pod.weeklyActivity;

  const handleVote = async (activityId: string, vote: 'yes' | 'no') => {
    if (isVoting) return; // Prevent double voting
    
    setIsVoting(true);
    setUserVote(vote);
    
    try {
      // Update the activity status and call parent handler
      onVoteActivity(activityId, vote);
      
      // Show feedback to user
      if (vote === 'yes') {
        // Show success notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Vote Recorded! 🎉', {
            body: 'Great! You\'re in for this week\'s activity. We\'ll send you details soon.',
            icon: '/favicon.ico',
            tag: 'vote-success'
          });
        }
      } else {
        // Show alternative notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Vote Recorded', {
            body: 'No worries! We\'ll suggest something different next time.',
            icon: '/favicon.ico',
            tag: 'vote-pass'
          });
        }
      }
      
      // Save vote to localStorage for persistence
      localStorage.setItem(`vote_${activityId}`, vote);
      
    } catch (error) {
      console.error('Error voting:', error);
      setUserVote(null); // Reset on error
    } finally {
      setIsVoting(false);
    }
  };

  const handleCancelVote = (activityId: string) => {
    if (isVoting) return;
    
    setIsVoting(true);
    
    try {
      // Remove vote from localStorage
      localStorage.removeItem(`vote_${activityId}`);
      setUserVote(null);
      
      // Show cancellation notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Vote Cancelled', {
          body: 'Your vote has been cancelled. You can vote again anytime.',
          icon: '/favicon.ico',
          tag: 'vote-cancelled'
        });
      }
      
    } catch (error) {
      console.error('Error cancelling vote:', error);
    } finally {
      setIsVoting(false);
    }
  };

  // Check for existing vote on mount
  React.useEffect(() => {
    if (weeklyActivity) {
      const savedVote = localStorage.getItem(`vote_${weeklyActivity.id}`);
      if (savedVote === 'yes' || savedVote === 'no') {
        setUserVote(savedVote as 'yes' | 'no');
      }
    }
  }, [weeklyActivity]);

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 mb-6 border border-white/20 dark:border-gray-700/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{pod.name}</h2>
            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <MapPin className="w-4 h-4" />
              <span>{activeMembers} members nearby</span>
            </div>
          </div>
        </div>
      </div>

      {weeklyActivity && weeklyActivity.status === 'voting' && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl p-4 mb-4 border border-indigo-200 dark:border-indigo-700">
          <div className="flex items-center gap-2 mb-3">
            <Vote className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span className="font-medium text-indigo-800 dark:text-indigo-300">Weekly Activity Vote</span>
            {userVote && (
              <div className="ml-auto flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">
                  <CheckCircle className="w-3 h-3" />
                  Voted
                </div>
                <button
                  onClick={() => handleCancelVote(weeklyActivity.id)}
                  disabled={isVoting}
                  className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-full text-xs font-medium hover:bg-red-200 dark:hover:bg-red-800 transition-colors duration-200 disabled:opacity-50"
                  title="Cancel your vote"
                >
                  <X className="w-3 h-3" />
                  Cancel
                </button>
              </div>
            )}
          </div>
          
          <h3 className="font-semibold text-gray-800 dark:text-white mb-2">{weeklyActivity.title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{weeklyActivity.description}</p>
          
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {weeklyActivity.scheduledDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </span>
          </div>
          
          {userVote ? (
            <div className={`p-4 rounded-xl text-center font-medium ${
              userVote === 'yes' 
                ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}>
              {userVote === 'yes' ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  You're in! We'll send you details soon. 🎉
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Clock className="w-5 h-5" />
                  You passed on this one. We'll suggest something else next time.
                </div>
              )}
              <p className="text-xs mt-2 opacity-75">
                Changed your mind? Click "Cancel" above to vote again.
              </p>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => handleVote(weeklyActivity.id, 'yes')}
                disabled={isVoting}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 px-4 rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 font-semibold transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isVoting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Voting...
                  </>
                ) : (
                  <>
                    👍 I'm in!
                  </>
                )}
              </button>
              <button
                onClick={() => handleVote(weeklyActivity.id, 'no')}
                disabled={isVoting}
                className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-500 transition-all duration-200 font-semibold transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isVoting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                    Voting...
                  </>
                ) : (
                  <>
                    👎 Pass
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {weeklyActivity && weeklyActivity.status === 'confirmed' && (
        <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium text-emerald-800 dark:text-emerald-300">This Week's Activity</span>
          </div>
          <h3 className="font-semibold text-gray-800 dark:text-white mb-1">{weeklyActivity.title}</h3>
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            {weeklyActivity.scheduledDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'short', 
              day: 'numeric' 
            })}
          </p>
        </div>
      )}

      <div className="flex -space-x-2 mt-4">
        {pod.members.slice(0, 6).map((member, index) => (
          <div
            key={member.id}
            className="w-8 h-8 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-white text-sm font-medium"
            title={member.firstName}
          >
            {member.firstName.charAt(0)}
          </div>
        ))}
        {pod.members.length > 6 && (
          <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs font-medium">
            +{pod.members.length - 6}
          </div>
        )}
      </div>
    </div>
  );
};