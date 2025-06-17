import React from 'react';
import { Trophy, Star, Heart, Users, Calendar, Flame, Target, Crown } from 'lucide-react';
import { User, PresenceActivity } from '../types';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'presence' | 'social' | 'consistency' | 'exploration' | 'community';
  requirement: number;
  color: string;
  bgColor: string;
  unlocked: boolean;
  progress: number;
  unlockedAt?: Date;
}

interface AchievementBadgesProps {
  user: User;
  activities: PresenceActivity[];
  onBack: () => void;
}

export const AchievementBadges: React.FC<AchievementBadgesProps> = ({ user, activities, onBack }) => {
  const calculateAchievements = (): Achievement[] => {
    const totalActivities = activities.length;
    const socialActivities = activities.filter(a => a.wasWithFriends).length;
    const currentStreak = user.streak;
    const presencePoints = user.presencePoints;
    const uniqueTypes = new Set(activities.map(a => a.type)).size;
    
    return [
      // Presence Achievements
      {
        id: 'first-step',
        title: 'First Step',
        description: 'Complete your first presence activity',
        icon: <Star className="w-6 h-6" />,
        category: 'presence',
        requirement: 1,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900',
        unlocked: totalActivities >= 1,
        progress: Math.min(totalActivities, 1),
        unlockedAt: totalActivities >= 1 ? activities[0]?.completedAt : undefined
      },
      {
        id: 'presence-pioneer',
        title: 'Presence Pioneer',
        description: 'Earn 100 presence points',
        icon: <Heart className="w-6 h-6" />,
        category: 'presence',
        requirement: 100,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100 dark:bg-emerald-900',
        unlocked: presencePoints >= 100,
        progress: Math.min(presencePoints, 100)
      },
      {
        id: 'mindful-master',
        title: 'Mindful Master',
        description: 'Earn 500 presence points',
        icon: <Crown className="w-6 h-6" />,
        category: 'presence',
        requirement: 500,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100 dark:bg-purple-900',
        unlocked: presencePoints >= 500,
        progress: Math.min(presencePoints, 500)
      },
      
      // Social Achievements
      {
        id: 'social-butterfly',
        title: 'Social Butterfly',
        description: 'Complete 5 activities with friends',
        icon: <Users className="w-6 h-6" />,
        category: 'social',
        requirement: 5,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100 dark:bg-blue-900',
        unlocked: socialActivities >= 5,
        progress: Math.min(socialActivities, 5)
      },
      {
        id: 'community-builder',
        title: 'Community Builder',
        description: 'Complete 15 activities with friends',
        icon: <Users className="w-6 h-6" />,
        category: 'social',
        requirement: 15,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100 dark:bg-indigo-900',
        unlocked: socialActivities >= 15,
        progress: Math.min(socialActivities, 15)
      },
      
      // Consistency Achievements
      {
        id: 'streak-starter',
        title: 'Streak Starter',
        description: 'Maintain a 3-day streak',
        icon: <Flame className="w-6 h-6" />,
        category: 'consistency',
        requirement: 3,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100 dark:bg-orange-900',
        unlocked: currentStreak >= 3,
        progress: Math.min(currentStreak, 3)
      },
      {
        id: 'week-warrior',
        title: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        icon: <Calendar className="w-6 h-6" />,
        category: 'consistency',
        requirement: 7,
        color: 'text-red-600',
        bgColor: 'bg-red-100 dark:bg-red-900',
        unlocked: currentStreak >= 7,
        progress: Math.min(currentStreak, 7)
      },
      {
        id: 'month-master',
        title: 'Month Master',
        description: 'Maintain a 30-day streak',
        icon: <Trophy className="w-6 h-6" />,
        category: 'consistency',
        requirement: 30,
        color: 'text-gold-600',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900',
        unlocked: currentStreak >= 30,
        progress: Math.min(currentStreak, 30)
      },
      
      // Exploration Achievements
      {
        id: 'explorer',
        title: 'Explorer',
        description: 'Try 3 different activity types',
        icon: <Target className="w-6 h-6" />,
        category: 'exploration',
        requirement: 3,
        color: 'text-teal-600',
        bgColor: 'bg-teal-100 dark:bg-teal-900',
        unlocked: uniqueTypes >= 3,
        progress: Math.min(uniqueTypes, 3)
      },
      {
        id: 'adventurer',
        title: 'Adventurer',
        description: 'Try 5 different activity types',
        icon: <Star className="w-6 h-6" />,
        category: 'exploration',
        requirement: 5,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-100 dark:bg-cyan-900',
        unlocked: uniqueTypes >= 5,
        progress: Math.min(uniqueTypes, 5)
      }
    ];
  };

  const achievements = calculateAchievements();
  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const lockedAchievements = achievements.filter(a => !a.unlocked);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'presence': return 'border-emerald-500';
      case 'social': return 'border-blue-500';
      case 'consistency': return 'border-orange-500';
      case 'exploration': return 'border-teal-500';
      case 'community': return 'border-purple-500';
      default: return 'border-gray-500';
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
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            Achievements
          </h1>
          <div className="w-20"></div>
        </div>

        {/* Stats Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {unlockedAchievements.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Unlocked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {achievements.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {Math.round((unlockedAchievements.length / achievements.length) * 100)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Complete</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {user.presencePoints}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Points</div>
            </div>
          </div>
        </div>

        {/* Unlocked Achievements */}
        {unlockedAchievements.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
              Unlocked Achievements
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unlockedAchievements.map(achievement => (
                <div
                  key={achievement.id}
                  className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-l-4 ${getCategoryColor(achievement.category)} transform hover:scale-105 transition-all duration-200`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${achievement.bgColor} ${achievement.color}`}>
                      {achievement.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 dark:text-white mb-1">
                        {achievement.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {achievement.description}
                      </p>
                      {achievement.unlockedAt && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          Unlocked {achievement.unlockedAt.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="text-emerald-600 dark:text-emerald-400">
                      ✓
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locked Achievements */}
        {lockedAchievements.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
              In Progress
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lockedAchievements.map(achievement => (
                <div
                  key={achievement.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 opacity-75"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-400">
                      {achievement.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 dark:text-white mb-1">
                        {achievement.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {achievement.description}
                      </p>
                      
                      {/* Progress Bar */}
                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                          <span>Progress</span>
                          <span>{achievement.progress}/{achievement.requirement}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(achievement.progress / achievement.requirement) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};