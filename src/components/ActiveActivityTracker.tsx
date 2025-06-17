import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, CheckCircle, Clock, Target, X, Minimize, Maximize } from 'lucide-react';

interface ActiveActivity {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  startTime: Date;
  timeRemaining: number; // in seconds
  isActive: boolean;
  type: 'solo' | 'pod';
  originalNudgeId: string;
}

interface ActiveActivityTrackerProps {
  activity: ActiveActivity;
  onComplete: () => void;
  onStop: () => void;
}

export const ActiveActivityTracker: React.FC<ActiveActivityTrackerProps> = ({
  activity,
  onComplete,
  onStop
}) => {
  const [timeRemaining, setTimeRemaining] = useState(activity.timeRemaining);
  const [isRunning, setIsRunning] = useState(true);
  const [showCompleteButton, setShowCompleteButton] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          
          // Update localStorage
          const updatedActivity = {
            ...activity,
            timeRemaining: newTime
          };
          localStorage.setItem('active_activity', JSON.stringify(updatedActivity));
          
          // Show complete button when 80% done or 5 minutes remaining
          const totalDuration = activity.duration * 60;
          const elapsed = totalDuration - newTime;
          const percentComplete = (elapsed / totalDuration) * 100;
          
          if (percentComplete >= 80 || newTime <= 300) { // 80% or 5 minutes left
            setShowCompleteButton(true);
          }
          
          // Auto-complete when timer reaches zero
          if (newTime <= 0) {
            setIsRunning(false);
            
            // Send completion notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Activity Complete! 🎉', {
                body: `Great job completing "${activity.title}"! Time to reflect on your experience.`,
                icon: '/favicon.ico',
                tag: 'activity-complete',
                requireInteraction: true
              });
            }
            
            // Auto-complete after 3 seconds
            setTimeout(() => {
              onComplete();
            }, 3000);
            
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeRemaining, activity, onComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    const totalDuration = activity.duration * 60;
    const elapsed = totalDuration - timeRemaining;
    return Math.min((elapsed / totalDuration) * 100, 100);
  };

  const handlePause = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRunning(false);
  };

  const handleResume = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRunning(true);
  };

  const handleStop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to stop this activity? Your progress will be lost.')) {
      onStop();
    }
  };

  const handleComplete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onComplete();
  };

  const toggleMinimize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMinimized(!isMinimized);
  };

  if (isMinimized) {
    return (
      <div 
        onClick={toggleMinimize}
        className="fixed bottom-4 right-4 z-30 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full shadow-xl p-3 text-white cursor-pointer animate-pulse"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          <span className="font-bold">{formatTime(timeRemaining)}</span>
          <Maximize className="w-4 h-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-2xl shadow-xl p-6 mb-6 text-white relative overflow-hidden animate-scaleIn">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 translate-y-12"></div>
      </div>
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              {activity.type === 'pod' ? '👥' : '✨'}
            </div>
            <div>
              <h3 className="text-lg font-bold font-display">Activity in Progress</h3>
              <p className="text-emerald-100 text-sm font-body">{activity.type === 'pod' ? 'Pod Activity' : 'Solo Time'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMinimize}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200"
              aria-label="Minimize"
            >
              <Minimize className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Activity Title */}
        <h2 className="text-xl font-bold mb-2 font-display">{activity.title}</h2>
        <p className="text-emerald-100 text-sm mb-4 line-clamp-2 font-body">{activity.description}</p>

        {/* Timer Display */}
        <div className="bg-white/10 rounded-xl p-4 mb-4 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-200" />
              <span className="text-sm font-medium">Time Remaining</span>
            </div>
            <div className="text-2xl font-bold font-mono">
              {formatTime(timeRemaining)}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-white/20 rounded-full h-3 mb-2">
            <div 
              className="bg-white h-3 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-emerald-200">
            <span>Started {new Date(activity.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
            <span>{Math.round(getProgressPercentage())}% complete</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          {timeRemaining > 0 ? (
            <>
              {isRunning ? (
                <button
                  onClick={handlePause}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-200 backdrop-blur-sm transform hover:scale-105"
                >
                  <Pause className="w-4 h-4" />
                  <span className="font-medium">Pause</span>
                </button>
              ) : (
                <button
                  onClick={handleResume}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-200 backdrop-blur-sm transform hover:scale-105"
                >
                  <Play className="w-4 h-4" />
                  <span className="font-medium">Resume</span>
                </button>
              )}
              
              {showCompleteButton && (
                <button
                  onClick={handleComplete}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all duration-200 font-medium transform hover:scale-105 shadow-lg"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Complete Now</span>
                </button>
              )}
              
              <button
                onClick={handleStop}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-xl transition-all duration-200 backdrop-blur-sm ml-auto transform hover:scale-105"
              >
                <Square className="w-4 h-4" />
                <span className="font-medium">Stop</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleComplete}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all duration-200 font-bold transform hover:scale-105 shadow-lg"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Activity Complete! 🎉</span>
            </button>
          )}
        </div>

        {/* Motivational Message */}
        {timeRemaining > 0 && (
          <div className="mt-4 text-center">
            <p className="text-emerald-100 text-sm font-body">
              {getProgressPercentage() < 25 ? "You're off to a great start! 🌟" :
               getProgressPercentage() < 50 ? "Keep going, you're doing amazing! 💪" :
               getProgressPercentage() < 75 ? "More than halfway there! 🚀" :
               showCompleteButton ? "Almost done! Feel free to complete anytime 🎯" :
               "Final stretch! You've got this! 🏁"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};