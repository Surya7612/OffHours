import React, { useState } from 'react';
import { Target, Calendar, Users, Trophy, Star, CheckCircle, Clock, Award } from 'lucide-react';
import { User, PresenceActivity } from '../types';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'individual' | 'community';
  category: 'consistency' | 'social' | 'exploration' | 'mindfulness';
  target: number;
  unit: string;
  progress: number;
  reward: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  deadline: Date;
  completed: boolean;
  participants?: number;
}

interface MonthlyChallengesProps {
  user: User;
  activities: PresenceActivity[];
  onBack: () => void;
}

export const MonthlyChallenges: React.FC<MonthlyChallengesProps> = ({ user, activities, onBack }) => {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  const calculateChallenges = (): Challenge[] => {
    const currentMonth = new Date();
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    const monthlyActivities = activities.filter(activity =>
      isWithinInterval(activity.completedAt, { start: monthStart, end: monthEnd })
    );
    
    const socialActivities = monthlyActivities.filter(a => a.wasWithFriends).length;
    const uniqueTypes = new Set(monthlyActivities.map(a => a.type)).size;
    const totalDuration = monthlyActivities.reduce((sum, a) => sum + a.duration, 0);
    const mindfulActivities = monthlyActivities.filter(a => a.type === 'mindful').length;

    return [
      {
        id: 'consistency-champion',
        title: 'Consistency Champion',
        description: 'Complete 20 activities this month',
        type: 'individual',
        category: 'consistency',
        target: 20,
        unit: 'activities',
        progress: monthlyActivities.length,
        reward: '100 bonus points + Consistency Badge',
        icon: <Target className="w-6 h-6" />,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100 dark:bg-emerald-900',
        deadline: monthEnd,
        completed: monthlyActivities.length >= 20
      },
      {
        id: 'social-connector',
        title: 'Social Connector',
        description: 'Complete 8 activities with friends',
        type: 'individual',
        category: 'social',
        target: 8,
        unit: 'social activities',
        progress: socialActivities,
        reward: '75 bonus points + Social Butterfly Badge',
        icon: <Users className="w-6 h-6" />,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100 dark:bg-blue-900',
        deadline: monthEnd,
        completed: socialActivities >= 8
      },
      {
        id: 'explorer-spirit',
        title: 'Explorer Spirit',
        description: 'Try 6 different activity types',
        type: 'individual',
        category: 'exploration',
        target: 6,
        unit: 'activity types',
        progress: uniqueTypes,
        reward: '60 bonus points + Explorer Badge',
        icon: <Star className="w-6 h-6" />,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100 dark:bg-purple-900',
        deadline: monthEnd,
        completed: uniqueTypes >= 6
      },
      {
        id: 'mindful-master',
        title: 'Mindful Master',
        description: 'Complete 10 mindful activities',
        type: 'individual',
        category: 'mindfulness',
        target: 10,
        unit: 'mindful activities',
        progress: mindfulActivities,
        reward: '80 bonus points + Zen Master Badge',
        icon: <Award className="w-6 h-6" />,
        color: 'text-amber-600',
        bgColor: 'bg-amber-100 dark:bg-amber-900',
        deadline: monthEnd,
        completed: mindfulActivities >= 10
      },
      {
        id: 'time-investor',
        title: 'Time Investor',
        description: 'Spend 10 hours in presence activities',
        type: 'individual',
        category: 'consistency',
        target: 600, // 10 hours in minutes
        unit: 'minutes',
        progress: totalDuration,
        reward: '120 bonus points + Time Master Badge',
        icon: <Clock className="w-6 h-6" />,
        color: 'text-teal-600',
        bgColor: 'bg-teal-100 dark:bg-teal-900',
        deadline: monthEnd,
        completed: totalDuration >= 600
      },
      {
        id: 'community-builder',
        title: 'Community Builder',
        description: 'Help the community reach 1000 total activities',
        type: 'community',
        category: 'social',
        target: 1000,
        unit: 'community activities',
        progress: 847, // Mock community progress
        reward: 'Special Community Badge for all participants',
        icon: <Trophy className="w-6 h-6" />,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100 dark:bg-indigo-900',
        deadline: monthEnd,
        completed: false,
        participants: 156
      }
    ];
  };

  const challenges = calculateChallenges();
  const activeChallenges = challenges.filter(c => !c.completed);
  const completedChallenges = challenges.filter(c => c.completed);

  const challengesToShow = activeTab === 'active' ? activeChallenges : completedChallenges;

  const getProgressPercentage = (challenge: Challenge) => {
    return Math.min((challenge.progress / challenge.target) * 100, 100);
  };

  const getDaysRemaining = (deadline: Date) => {
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const formatProgress = (challenge: Challenge) => {
    if (challenge.unit === 'minutes') {
      const hours = Math.floor(challenge.progress / 60);
      const minutes = challenge.progress % 60;
      const targetHours = Math.floor(challenge.target / 60);
      return `${hours}h ${minutes}m / ${targetHours}h`;
    }
    return `${challenge.progress} / ${challenge.target} ${challenge.unit}`;
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
            <Calendar className="w-6 h-6" />
            {format(new Date(), 'MMMM')} Challenges
          </h1>
          <div className="w-20"></div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-1 mb-6">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
              activeTab === 'active'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
            }`}
          >
            Active ({activeChallenges.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
              activeTab === 'completed'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
            }`}
          >
            Completed ({completedChallenges.length})
          </button>
        </div>

        {/* Challenge Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {completedChallenges.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {activeChallenges.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {getDaysRemaining(endOfMonth(new Date()))}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Days Left</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {Math.round((completedChallenges.length / challenges.length) * 100)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Complete</div>
            </div>
          </div>
        </div>

        {/* Challenges List */}
        {challengesToShow.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {activeTab === 'active' ? 'All challenges completed!' : 'No completed challenges yet'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              {activeTab === 'active' 
                ? 'Amazing work! Check back next month for new challenges.'
                : 'Start completing challenges to see them here.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {challengesToShow.map(challenge => (
              <div
                key={challenge.id}
                className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 ${
                  challenge.completed ? 'border-2 border-emerald-500' : ''
                }`}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`p-3 rounded-xl ${challenge.bgColor} ${challenge.color}`}>
                    {challenge.icon}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                        {challenge.title}
                      </h3>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        challenge.type === 'community' 
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {challenge.type === 'community' ? '👥 Community' : '👤 Individual'}
                      </div>
                      {challenge.completed && (
                        <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-300 mb-3">
                      {challenge.description}
                    </p>
                    
                    <div className="mb-3">
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{formatProgress(challenge)}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all duration-500 ${
                            challenge.completed 
                              ? 'bg-emerald-500' 
                              : 'bg-gradient-to-r from-emerald-400 to-teal-500'
                          }`}
                          style={{ width: `${getProgressPercentage(challenge)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {!challenge.completed && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        {getDaysRemaining(challenge.deadline)} days left
                      </div>
                    )}
                    {challenge.participants && (
                      <div className="text-sm text-purple-600 dark:text-purple-400">
                        {challenge.participants} participants
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    <span className="font-medium text-gray-800 dark:text-white">Reward</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {challenge.reward}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};