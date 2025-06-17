import React, { useState } from 'react';
import { User, MapPin, Clock, Heart, Edit3, Save, X, Settings, LogOut, Crown, CreditCard, Calendar } from 'lucide-react';
import { User as UserType } from '../types';

interface ProfileScreenProps {
  user: UserType;
  onUpdateProfile: (updates: Partial<UserType>) => void;
  onLogout: () => void;
  onBack: () => void;
  subscription: any;
  onManageSubscription: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ 
  user, 
  onUpdateProfile, 
  onLogout, 
  onBack,
  subscription,
  onManageSubscription
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    firstName: user.firstName,
    lastName: user.lastName || '',
    nudgeTime: user.preferences.nudgeTime,
    energyLevel: user.preferences.energyLevel,
    interests: [...user.preferences.interests],
    allowSoloNudges: user.preferences.allowSoloNudges,
    allowPodNudges: user.preferences.allowPodNudges
  });

  const interestOptions = [
    'Walking', 'Cooking', 'Reading', 'Journaling', 'Photography',
    'Gardening', 'Music', 'Art', 'Meditation', 'Coffee', 'Tea',
    'Conversations', 'Nature', 'Community', 'Learning', 'Fitness'
  ];

  const handleSave = () => {
    onUpdateProfile({
      firstName: editData.firstName,
      lastName: editData.lastName,
      preferences: {
        ...user.preferences,
        nudgeTime: editData.nudgeTime,
        energyLevel: editData.energyLevel,
        interests: editData.interests,
        allowSoloNudges: editData.allowSoloNudges,
        allowPodNudges: editData.allowPodNudges
      }
    });
    setIsEditing(false);
  };

  const handleInterestToggle = (interest: string) => {
    setEditData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const getPresenceLevel = (points: number) => {
    if (points >= 1000) return { level: 'Zen Master', color: 'text-purple-600', bg: 'bg-purple-100' };
    if (points >= 500) return { level: 'Present Soul', color: 'text-emerald-600', bg: 'bg-emerald-100' };
    if (points >= 200) return { level: 'Mindful Explorer', color: 'text-blue-600', bg: 'bg-blue-100' };
    return { level: 'New Journey', color: 'text-gray-600', bg: 'bg-gray-100' };
  };

  const presenceLevel = getPresenceLevel(user.presencePoints);

  const getSubscriptionStatus = () => {
    if (subscription.loading) return 'Loading...';
    if (subscription.isTrialActive) return `Free Trial (${subscription.daysRemaining} days left)`;
    if (subscription.hasAccess && subscription.plan) {
      return `OffHours Pro (${subscription.plan.period})`;
    }
    return 'Free Account';
  };

  const getSubscriptionColor = () => {
    if (subscription.isTrialActive && subscription.daysRemaining <= 2) return 'text-orange-600';
    if (subscription.hasAccess) return 'text-emerald-600';
    return 'text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors duration-200"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Profile</h1>
          <button
            onClick={isEditing ? handleSave : () => setIsEditing(true)}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors duration-200"
          >
            {isEditing ? (
              <Save className="w-6 h-6 text-emerald-600" />
            ) : (
              <Edit3 className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 mb-6 border border-white/20 dark:border-gray-700/20">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
              {user.avatar}
            </div>
            
            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editData.firstName}
                  onChange={(e) => setEditData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="text-center text-xl font-bold bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full text-gray-800 dark:text-white"
                  placeholder="First name"
                />
                <input
                  type="text"
                  value={editData.lastName}
                  onChange={(e) => setEditData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="text-center text-lg text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full"
                  placeholder="Last name"
                />
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
              </>
            )}

            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mt-3 ${presenceLevel.bg} ${presenceLevel.color} dark:bg-opacity-30`}>
              <Heart className="w-4 h-4" />
              {presenceLevel.level}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{user.presencePoints}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Presence Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{user.streak}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Day Streak</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{user.friends.length}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Friends</div>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-4">
            <MapPin className="w-4 h-4" />
            <span>{user.location.neighborhood}, {user.location.city}</span>
          </div>
        </div>

        {/* Subscription Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 mb-6 border border-white/20 dark:border-gray-700/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <Crown className="w-5 h-5" />
              Subscription
            </h3>
            <button
              onClick={onManageSubscription}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium transition-colors duration-200"
            >
              Manage
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className={`font-medium ${getSubscriptionColor()} dark:text-opacity-90`}>
                {getSubscriptionStatus()}
              </div>
              {subscription.isTrialActive && subscription.daysRemaining <= 2 && (
                <div className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                  Trial expires soon - upgrade to continue
                </div>
              )}
              {subscription.hasAccess && subscription.plan && (
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  ${subscription.plan.price.toFixed(2)} per {subscription.plan.period.replace('ly', '')}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {subscription.hasAccess ? (
                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
                  <Crown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              ) : (
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 mb-6 border border-white/20 dark:border-gray-700/20">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Preferences</h3>
          
          <div className="space-y-4">
            {/* Nudge Time */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Clock className="w-4 h-4" />
                Daily Nudge Time
              </label>
              {isEditing ? (
                <select
                  value={editData.nudgeTime}
                  onChange={(e) => setEditData(prev => ({ ...prev, nudgeTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                >
                  <option value="17:00">5:00 PM</option>
                  <option value="17:30">5:30 PM</option>
                  <option value="18:00">6:00 PM</option>
                  <option value="18:30">6:30 PM</option>
                  <option value="19:00">7:00 PM</option>
                </select>
              ) : (
                <div className="text-gray-600 dark:text-gray-300">
                  {new Date(`2000-01-01T${user.preferences.nudgeTime}`).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </div>
              )}
            </div>

            {/* Energy Level */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Energy Level
              </label>
              {isEditing ? (
                <div className="flex gap-2">
                  {['low', 'medium', 'high'].map(level => (
                    <button
                      key={level}
                      onClick={() => setEditData(prev => ({ ...prev, energyLevel: level as any }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        editData.energyLevel === level
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-gray-600 dark:text-gray-300 capitalize">{user.preferences.energyLevel}</div>
              )}
            </div>

            {/* Nudge Types */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Nudge Types
              </label>
              {isEditing ? (
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editData.allowSoloNudges}
                      onChange={(e) => setEditData(prev => ({ ...prev, allowSoloNudges: e.target.checked }))}
                      className="rounded border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Solo activities</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editData.allowPodNudges}
                      onChange={(e) => setEditData(prev => ({ ...prev, allowPodNudges: e.target.checked }))}
                      className="rounded border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Pod activities</span>
                  </label>
                </div>
              ) : (
                <div className="text-gray-600 dark:text-gray-300">
                  {user.preferences.allowSoloNudges && user.preferences.allowPodNudges ? 'Solo & Pod activities' :
                   user.preferences.allowSoloNudges ? 'Solo activities only' :
                   user.preferences.allowPodNudges ? 'Pod activities only' : 'No activities'}
                </div>
              )}
            </div>

            {/* Interests */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Interests
              </label>
              {isEditing ? (
                <div className="flex flex-wrap gap-2">
                  {interestOptions.map(interest => (
                    <button
                      key={interest}
                      onClick={() => handleInterestToggle(interest)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                        editData.interests.includes(interest)
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {user.preferences.interests.map(interest => (
                    <span
                      key={interest}
                      className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full text-sm"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-500 text-white font-semibold py-3 px-6 rounded-xl hover:bg-red-600 transition-colors duration-200"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};