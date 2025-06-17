import React, { useState } from 'react';
import { Calendar, Plus, X, Clock, MapPin, Users, Save, RotateCcw } from 'lucide-react';
import { ActivityTemplate, ACTIVITY_DATABASE, ACTIVITY_CATEGORIES } from '../utils/activityDatabase';
import { User } from '../types';
import { format, addDays, startOfWeek } from 'date-fns';

interface ScheduledActivity {
  id: string;
  activity: ActivityTemplate;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  timeSlot: string; // e.g., "09:00", "14:30"
  notes?: string;
}

interface WeeklySchedulerProps {
  user: User;
  onBack: () => void;
}

export const WeeklyScheduler: React.FC<WeeklySchedulerProps> = ({ user, onBack }) => {
  const [scheduledActivities, setScheduledActivities] = useState<ScheduledActivity[]>([]);
  const [showActivityPicker, setShowActivityPicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const daysOfWeek = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  const timeSlots = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00'
  ];

  const getWeekDates = () => {
    const today = new Date();
    const weekStart = startOfWeek(today);
    return daysOfWeek.map((_, index) => addDays(weekStart, index));
  };

  const weekDates = getWeekDates();

  const filteredActivities = ACTIVITY_DATABASE.filter(activity => {
    const matchesSearch = !searchQuery || 
      activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || activity.type === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleAddActivity = (dayOfWeek: number, timeSlot: string) => {
    setSelectedDay(dayOfWeek);
    setSelectedTime(timeSlot);
    setShowActivityPicker(true);
  };

  const handleSelectActivity = (activity: ActivityTemplate) => {
    if (selectedDay === null || !selectedTime) return;

    const newScheduledActivity: ScheduledActivity = {
      id: `scheduled-${Date.now()}`,
      activity,
      dayOfWeek: selectedDay,
      timeSlot: selectedTime,
      notes: ''
    };

    setScheduledActivities(prev => [...prev, newScheduledActivity]);
    setShowActivityPicker(false);
    setSelectedDay(null);
    setSelectedTime('');
  };

  const handleRemoveActivity = (id: string) => {
    setScheduledActivities(prev => prev.filter(sa => sa.id !== id));
  };

  const getActivitiesForDayAndTime = (dayOfWeek: number, timeSlot: string) => {
    return scheduledActivities.filter(sa => sa.dayOfWeek === dayOfWeek && sa.timeSlot === timeSlot);
  };

  const handleSaveSchedule = () => {
    // In production, save to backend
    localStorage.setItem('weekly_schedule', JSON.stringify(scheduledActivities));
    alert('Weekly schedule saved! You\'ll receive reminders for your planned activities.');
  };

  const handleClearSchedule = () => {
    if (window.confirm('Are you sure you want to clear your entire schedule?')) {
      setScheduledActivities([]);
      localStorage.removeItem('weekly_schedule');
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'solo': return '✨';
      case 'social': return '👥';
      case 'nature': return '🌿';
      case 'mindful': return '🧘';
      case 'creative': return '🎨';
      case 'movement': return '🏃';
      case 'community': return '🤝';
      default: return '💫';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'solo': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      case 'social': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'nature': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'mindful': return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
      case 'creative': return 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300';
      case 'movement': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
      case 'community': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Weekly Activity Scheduler
          </h1>
          <div className="flex gap-2">
            <button
              onClick={handleClearSchedule}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
            >
              <RotateCcw className="w-4 h-4" />
              Clear
            </button>
            <button
              onClick={handleSaveSchedule}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors duration-200"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>

        {/* Schedule Grid */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="grid grid-cols-8 gap-0">
            {/* Time column header */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 border-r border-gray-200 dark:border-gray-600">
              <div className="font-semibold text-gray-800 dark:text-white">Time</div>
            </div>
            
            {/* Day headers */}
            {daysOfWeek.map((day, index) => (
              <div key={day} className="bg-gray-50 dark:bg-gray-700 p-4 border-r border-gray-200 dark:border-gray-600 last:border-r-0">
                <div className="font-semibold text-gray-800 dark:text-white text-center">
                  {day}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                  {format(weekDates[index], 'MMM d')}
                </div>
              </div>
            ))}

            {/* Time slots and activities */}
            {timeSlots.map(timeSlot => (
              <React.Fragment key={timeSlot}>
                {/* Time label */}
                <div className="p-4 border-r border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {timeSlot}
                  </div>
                </div>
                
                {/* Day cells */}
                {daysOfWeek.map((_, dayIndex) => {
                  const activities = getActivitiesForDayAndTime(dayIndex, timeSlot);
                  
                  return (
                    <div
                      key={`${dayIndex}-${timeSlot}`}
                      className="p-2 border-r border-b border-gray-200 dark:border-gray-600 last:border-r-0 min-h-[80px] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      {activities.length === 0 ? (
                        <button
                          onClick={() => handleAddActivity(dayIndex, timeSlot)}
                          className="w-full h-full flex items-center justify-center text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      ) : (
                        <div className="space-y-1">
                          {activities.map(scheduledActivity => (
                            <div
                              key={scheduledActivity.id}
                              className={`relative p-2 rounded-lg text-xs ${getTypeColor(scheduledActivity.activity.type)} group`}
                            >
                              <button
                                onClick={() => handleRemoveActivity(scheduledActivity.id)}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              >
                                <X className="w-2 h-2" />
                              </button>
                              
                              <div className="font-medium truncate">
                                {getActivityIcon(scheduledActivity.activity.type)} {scheduledActivity.activity.title}
                              </div>
                              
                              <div className="flex items-center gap-1 mt-1 text-xs opacity-75">
                                <Clock className="w-3 h-3" />
                                <span>{scheduledActivity.activity.duration}m</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Activity Picker Modal */}
        {showActivityPicker && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                    Choose Activity for {daysOfWeek[selectedDay!]} at {selectedTime}
                  </h2>
                  <button
                    onClick={() => setShowActivityPicker(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Search and Filter */}
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search activities..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                  />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                  >
                    <option value="all">All Categories</option>
                    {Object.entries(ACTIVITY_CATEGORIES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-96">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredActivities.map(activity => (
                    <div
                      key={activity.id}
                      onClick={() => handleSelectActivity(activity)}
                      className="p-4 border border-gray-200 dark:border-gray-600 rounded-xl hover:border-emerald-500 dark:hover:border-emerald-400 cursor-pointer transition-all duration-200 hover:shadow-md"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="text-2xl">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800 dark:text-white mb-1">
                            {activity.title}
                          </h3>
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(activity.type)}`}>
                            {ACTIVITY_CATEGORIES[activity.type as keyof typeof ACTIVITY_CATEGORIES]}
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        {activity.description}
                      </p>

                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{activity.duration} min</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span className="capitalize">{activity.groupSize}</span>
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

        {/* Schedule Summary */}
        {scheduledActivities.length > 0 && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              This Week's Schedule Summary
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {scheduledActivities.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Planned Activities</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {Math.round(scheduledActivities.reduce((sum, sa) => sum + sa.activity.duration, 0) / 60)}h
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {new Set(scheduledActivities.map(sa => sa.activity.type)).size}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Activity Types</div>
              </div>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              💡 <strong>Tip:</strong> You'll receive gentle reminders 15 minutes before each scheduled activity. 
              You can always skip or reschedule if plans change!
            </div>
          </div>
        )}
      </div>
    </div>
  );
};