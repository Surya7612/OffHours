import React, { useState, useMemo } from 'react';
import { Search, Filter, Clock, Users, MapPin, Heart } from 'lucide-react';
import { ACTIVITY_DATABASE, ACTIVITY_CATEGORIES, ENERGY_LEVELS, filterActivitiesByContext, ActivityTemplate } from '../utils/activityDatabase';
import { User } from '../types';

interface ActivityBrowserProps {
  user: User;
  onSelectActivity: (activity: ActivityTemplate) => void;
  onBack: () => void;
}

export const ActivityBrowser: React.FC<ActivityBrowserProps> = ({ user, onSelectActivity, onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEnergyLevel, setSelectedEnergyLevel] = useState<string>('all');
  const [selectedDuration, setSelectedDuration] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredActivities = useMemo(() => {
    let activities = ACTIVITY_DATABASE;

    // Apply search filter
    if (searchQuery) {
      activities = activities.filter(activity =>
        activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      activities = activities.filter(activity => activity.type === selectedCategory);
    }

    // Apply energy level filter
    if (selectedEnergyLevel !== 'all') {
      activities = activities.filter(activity => activity.energyLevel === selectedEnergyLevel);
    }

    // Apply duration filter
    if (selectedDuration !== 'all') {
      const maxDuration = parseInt(selectedDuration);
      activities = activities.filter(activity => activity.duration <= maxDuration);
    }

    return activities;
  }, [searchQuery, selectedCategory, selectedEnergyLevel, selectedDuration]);

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

  const getEnergyColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-blue-600 dark:text-blue-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'high': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Activity Browser</h1>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activities..."
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-800 dark:text-white"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white"
                >
                  <option value="all">All Categories</option>
                  {Object.entries(ACTIVITY_CATEGORIES).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Energy Level Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Energy Level
                </label>
                <select
                  value={selectedEnergyLevel}
                  onChange={(e) => setSelectedEnergyLevel(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white"
                >
                  <option value="all">All Energy Levels</option>
                  {Object.entries(ENERGY_LEVELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Duration Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Duration
                </label>
                <select
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white"
                >
                  <option value="all">Any Duration</option>
                  <option value="15">15 minutes or less</option>
                  <option value="30">30 minutes or less</option>
                  <option value="60">1 hour or less</option>
                  <option value="120">2 hours or less</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          {filteredActivities.length} activities found
        </div>

        {/* Activities Grid */}
        {filteredActivities.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No activities match your filters</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredActivities.map(activity => (
              <div
                key={activity.id}
                onClick={() => onSelectActivity(activity)}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                        {activity.title}
                      </h3>
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(activity.type)}`}>
                        {ACTIVITY_CATEGORIES[activity.type as keyof typeof ACTIVITY_CATEGORIES]}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm leading-relaxed">
                  {activity.description}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{activity.duration} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span className="capitalize">{activity.groupSize}</span>
                  </div>
                  <div className={`font-medium ${getEnergyColor(activity.energyLevel)}`}>
                    {activity.energyLevel} energy
                  </div>
                </div>

                {activity.proximityRequired > 0 && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <MapPin className="w-3 h-3" />
                    <span>Within {activity.proximityRequired}km</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-1">
                  {activity.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                  {activity.tags.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs">
                      +{activity.tags.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};