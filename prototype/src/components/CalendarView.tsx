import React, { useState } from 'react';
import Calendar from 'react-calendar';
import { format, isSameDay, addDays, startOfWeek } from 'date-fns';
import { Calendar as CalendarIcon, Activity, Users, User, ArrowLeft, Plus, Clock, Play, Pause, Square, Bell } from 'lucide-react';
import { PresenceActivity } from '../types';
import { ActivityTemplate, ACTIVITY_DATABASE, ACTIVITY_CATEGORIES } from '../utils/activityDatabase';
import 'react-calendar/dist/Calendar.css';

interface CalendarViewProps {
  activities: PresenceActivity[];
  onBack: () => void;
}

interface PlannedActivity {
  id: string;
  activity: ActivityTemplate;
  date: Date;
  time: string;
  completed: boolean;
  timerActive: boolean;
  timeRemaining: number; // in seconds
}

export const CalendarView: React.FC<CalendarViewProps> = ({ activities, onBack }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showPlanner, setShowPlanner] = useState(false);
  const [plannedActivities, setPlannedActivities] = useState<PlannedActivity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<ActivityTemplate | null>(null);
  const [selectedTime, setSelectedTime] = useState('18:00');
  const [activeTimers, setActiveTimers] = useState<Map<string, NodeJS.Timeout>>(new Map());

  const getActivitiesForDate = (date: Date) => {
    return activities.filter(activity => 
      isSameDay(new Date(activity.completedAt), date)
    );
  };

  const getPlannedActivitiesForDate = (date: Date) => {
    return plannedActivities.filter(planned => 
      isSameDay(planned.date, date)
    );
  };

  const hasActivityOnDate = (date: Date) => {
    return getActivitiesForDate(date).length > 0 || getPlannedActivitiesForDate(date).length > 0;
  };

  const selectedDateActivities = getActivitiesForDate(selectedDate);
  const selectedDatePlanned = getPlannedActivitiesForDate(selectedDate);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'walk': return '🚶';
      case 'gathering': return '👥';
      case 'mindful': return '🧘';
      case 'creative': return '🎨';
      case 'solo': return '✨';
      default: return '💫';
    }
  };

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'walk': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'gathering': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'mindful': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      case 'creative': return 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300';
      case 'solo': return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const handlePlanActivity = (activity: ActivityTemplate) => {
    const newPlanned: PlannedActivity = {
      id: `planned-${Date.now()}`,
      activity,
      date: selectedDate,
      time: selectedTime,
      completed: false,
      timerActive: false,
      timeRemaining: activity.duration * 60 // Convert minutes to seconds
    };

    setPlannedActivities(prev => [...prev, newPlanned]);
    setShowPlanner(false);
    setSelectedActivity(null);

    // Save to localStorage for persistence
    const updated = [...plannedActivities, newPlanned];
    localStorage.setItem('planned_activities', JSON.stringify(updated));

    // Schedule notification for the planned time
    scheduleActivityNotification(newPlanned);
  };

  const scheduleActivityNotification = (planned: PlannedActivity) => {
    const notificationTime = new Date(planned.date);
    const [hours, minutes] = planned.time.split(':').map(Number);
    notificationTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const timeUntilNotification = notificationTime.getTime() - now.getTime();

    if (timeUntilNotification > 0) {
      setTimeout(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('OffHours Activity Reminder', {
            body: `Time for your planned activity: ${planned.activity.title}`,
            icon: '/favicon.ico',
            tag: planned.id
          });
        }
      }, timeUntilNotification);
    }
  };

  const startActivityTimer = (plannedId: string) => {
    const planned = plannedActivities.find(p => p.id === plannedId);
    if (!planned || planned.timerActive) return;

    // Update timer state
    setPlannedActivities(prev => prev.map(p => 
      p.id === plannedId 
        ? { ...p, timerActive: true }
        : p
    ));

    // Start countdown timer
    const timer = setInterval(() => {
      setPlannedActivities(prev => prev.map(p => {
        if (p.id === plannedId) {
          const newTimeRemaining = p.timeRemaining - 1;
          
          if (newTimeRemaining <= 0) {
            // Timer finished
            clearInterval(timer);
            setActiveTimers(prev => {
              const newMap = new Map(prev);
              newMap.delete(plannedId);
              return newMap;
            });

            // Show completion notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Activity Complete!', {
                body: `Great job completing "${p.activity.title}"! Time to reflect on your experience.`,
                icon: '/favicon.ico',
                tag: `complete-${plannedId}`
              });
            }

            return { ...p, timerActive: false, timeRemaining: 0, completed: true };
          }
          
          return { ...p, timeRemaining: newTimeRemaining };
        }
        return p;
      }));
    }, 1000);

    setActiveTimers(prev => new Map(prev).set(plannedId, timer));
  };

  const pauseActivityTimer = (plannedId: string) => {
    const timer = activeTimers.get(plannedId);
    if (timer) {
      clearInterval(timer);
      setActiveTimers(prev => {
        const newMap = new Map(prev);
        newMap.delete(plannedId);
        return newMap;
      });
    }

    setPlannedActivities(prev => prev.map(p => 
      p.id === plannedId 
        ? { ...p, timerActive: false }
        : p
    ));
  };

  const stopActivityTimer = (plannedId: string) => {
    const timer = activeTimers.get(plannedId);
    if (timer) {
      clearInterval(timer);
      setActiveTimers(prev => {
        const newMap = new Map(prev);
        newMap.delete(plannedId);
        return newMap;
      });
    }

    setPlannedActivities(prev => prev.map(p => 
      p.id === plannedId 
        ? { ...p, timerActive: false, timeRemaining: p.activity.duration * 60, completed: false }
        : p
    ));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const removePlannedActivity = (plannedId: string) => {
    // Stop timer if active
    const timer = activeTimers.get(plannedId);
    if (timer) {
      clearInterval(timer);
      setActiveTimers(prev => {
        const newMap = new Map(prev);
        newMap.delete(plannedId);
        return newMap;
      });
    }

    setPlannedActivities(prev => {
      const updated = prev.filter(p => p.id !== plannedId);
      localStorage.setItem('planned_activities', JSON.stringify(updated));
      return updated;
    });
  };

  // Load planned activities from localStorage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('planned_activities');
    if (saved) {
      try {
        const parsed = JSON.parse(saved).map((p: any) => ({
          ...p,
          date: new Date(p.date),
          timerActive: false // Reset timer state on reload
        }));
        setPlannedActivities(parsed);
      } catch (error) {
        console.error('Error loading planned activities:', error);
      }
    }
  }, []);

  // Request notification permission
  React.useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2 font-display">
            <CalendarIcon className="w-6 h-6" />
            Activity Calendar
          </h1>
          <button
            onClick={() => setShowPlanner(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Plan Week</span>
            <span className="sm:hidden">Plan</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 font-display">
              Your Presence Journey
            </h2>
            
            <div className="calendar-container">
              <Calendar
                onChange={(date) => setSelectedDate(date as Date)}
                value={selectedDate}
                tileClassName={({ date }) => {
                  const hasActivity = hasActivityOnDate(date);
                  const isToday = isSameDay(date, new Date());
                  const isSelected = isSameDay(date, selectedDate);
                  
                  let classes = 'relative ';
                  
                  if (hasActivity) {
                    classes += 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 ';
                  }
                  
                  if (isToday) {
                    classes += 'ring-2 ring-emerald-500 ';
                  }
                  
                  if (isSelected) {
                    classes += 'bg-emerald-500 text-white ';
                  }
                  
                  return classes;
                }}
                tileContent={({ date }) => {
                  const dayActivities = getActivitiesForDate(date);
                  const dayPlanned = getPlannedActivitiesForDate(date);
                  
                  if (dayActivities.length > 0 || dayPlanned.length > 0) {
                    return (
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-1">
                        {dayActivities.length > 0 && (
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        )}
                        {dayPlanned.length > 0 && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
                className="w-full border-none"
              />
            </div>
          </div>

          {/* Selected Date Activities */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 font-display">
              {format(selectedDate, 'MMMM d, yyyy')}
            </h2>
            
            {/* Planned Activities */}
            {selectedDatePlanned.length > 0 && (
              <div className="mb-6">
                <h3 className="text-md font-medium text-blue-600 dark:text-blue-400 mb-3 font-display">
                  Planned Activities
                </h3>
                <div className="space-y-3">
                  {selectedDatePlanned.map(planned => (
                    <div
                      key={planned.id}
                      className={`border rounded-xl p-4 transition-all duration-200 ${
                        planned.completed 
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                          : 'border-blue-200 dark:border-blue-700 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">
                            {getActivityIcon(planned.activity.type)}
                          </div>
                          <div>
                            <div className="font-bold text-gray-800 dark:text-white font-display">
                              {planned.activity.title}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 font-body">
                              Planned for {planned.time}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removePlannedActivity(planned.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>

                      {/* Timer Display */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            <span className="font-mono text-lg font-bold text-gray-800 dark:text-white">
                              {formatTime(planned.timeRemaining)}
                            </span>
                          </div>
                          
                          <div className="flex gap-2">
                            {!planned.timerActive && planned.timeRemaining > 0 && !planned.completed && (
                              <button
                                onClick={() => startActivityTimer(planned.id)}
                                className="flex items-center gap-1 px-3 py-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors duration-200 text-sm"
                              >
                                <Play className="w-3 h-3" />
                                Start
                              </button>
                            )}
                            
                            {planned.timerActive && (
                              <button
                                onClick={() => pauseActivityTimer(planned.id)}
                                className="flex items-center gap-1 px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors duration-200 text-sm"
                              >
                                <Pause className="w-3 h-3" />
                                Pause
                              </button>
                            )}
                            
                            {(planned.timerActive || planned.timeRemaining < planned.activity.duration * 60) && !planned.completed && (
                              <button
                                onClick={() => stopActivityTimer(planned.id)}
                                className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 text-sm"
                              >
                                <Square className="w-3 h-3" />
                                Reset
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {planned.completed && (
                          <div className="mt-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                            ✅ Activity completed! Great job!
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-300 font-body">
                        {planned.activity.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Activities */}
            {selectedDateActivities.length === 0 && selectedDatePlanned.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="font-body">No activities on this day</p>
                <p className="text-sm mt-1 font-body">Plan activities for the week ahead!</p>
              </div>
            ) : selectedDateActivities.length > 0 && (
              <div>
                <h3 className="text-md font-medium text-emerald-600 dark:text-emerald-400 mb-3 font-display">
                  Completed Activities
                </h3>
                <div className="space-y-4">
                  {selectedDateActivities.map(activity => (
                    <div
                      key={activity.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div>
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getActivityTypeColor(activity.type)}`}>
                              {activity.wasWithFriends ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
                              {activity.type}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                            +{activity.points} pts
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {activity.duration} min
                          </div>
                        </div>
                      </div>
                      
                      {activity.location && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 font-body">
                          📍 {activity.location}
                        </div>
                      )}
                      
                      {activity.reflection && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300 font-body">
                          <div className="font-medium mb-1">Reflection:</div>
                          "{activity.reflection}"
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {format(new Date(activity.completedAt), 'h:mm a')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Weekly Planner Modal */}
        {showPlanner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white font-display">
                    Plan Activities for {format(selectedDate, 'MMMM d, yyyy')}
                  </h2>
                  <button
                    onClick={() => setShowPlanner(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-body">
                    Preferred Time
                  </label>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-96">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ACTIVITY_DATABASE.slice(0, 12).map(activity => (
                    <div
                      key={activity.id}
                      onClick={() => handlePlanActivity(activity)}
                      className="p-4 border border-gray-200 dark:border-gray-600 rounded-xl hover:border-emerald-500 dark:hover:border-emerald-400 cursor-pointer transition-all duration-200 hover:shadow-md"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="text-2xl">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800 dark:text-white mb-1 font-display">
                            {activity.title}
                          </h3>
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getActivityTypeColor(activity.type)}`}>
                            {ACTIVITY_CATEGORIES[activity.type as keyof typeof ACTIVITY_CATEGORIES]}
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 font-body">
                        {activity.description}
                      </p>

                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{activity.duration} min</span>
                        </div>
                        <div className="capitalize">
                          {activity.energyLevel} energy
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Monthly Stats */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 font-display">
            This Month's Summary
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {activities.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 font-body">Total Activities</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {plannedActivities.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 font-body">Planned Activities</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {Math.round(activities.reduce((sum, a) => sum + a.duration, 0) / 60)}h
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 font-body">Time Invested</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {activities.filter(a => a.wasWithFriends).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 font-body">Social Activities</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};