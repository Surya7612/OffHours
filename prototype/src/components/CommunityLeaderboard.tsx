import React, { useState } from 'react';
import { Trophy, Medal, Award, Users, TrendingUp, Calendar, Crown } from 'lucide-react';
import { User } from '../types';

interface LeaderboardEntry {
  user: User;
  rank: number;
  weeklyPoints: number;
  monthlyPoints: number;
  totalActivities: number;
  streak: number;
}

interface CommunityLeaderboardProps {
  user: User;
  onBack: () => void;
}

export const CommunityLeaderboard: React.FC<CommunityLeaderboardProps> = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'alltime'>('weekly');

  // Mock leaderboard data
  const mockLeaderboard: LeaderboardEntry[] = [
    {
      user: {
        id: 'user-leader-1',
        firstName: 'Maya',
        lastName: 'Chen',
        email: 'maya@example.com',
        avatar: '🌸',
        location: user.location,
        preferences: user.preferences,
        presencePoints: 1250,
        streak: 21,
        joinedAt: new Date(),
        friends: [],
        profileComplete: true
      },
      rank: 1,
      weeklyPoints: 180,
      monthlyPoints: 720,
      totalActivities: 45,
      streak: 21
    },
    {
      user: {
        id: 'user-leader-2',
        firstName: 'Alex',
        lastName: 'Rivera',
        email: 'alex@example.com',
        avatar: '🌟',
        location: user.location,
        preferences: user.preferences,
        presencePoints: 1100,
        streak: 15,
        joinedAt: new Date(),
        friends: [],
        profileComplete: true
      },
      rank: 2,
      weeklyPoints: 165,
      monthlyPoints: 680,
      totalActivities: 38,
      streak: 15
    },
    {
      user: {
        id: 'user-leader-3',
        firstName: 'Jordan',
        lastName: 'Kim',
        email: 'jordan@example.com',
        avatar: '🎯',
        location: user.location,
        preferences: user.preferences,
        presencePoints: 950,
        streak: 12,
        joinedAt: new Date(),
        friends: [],
        profileComplete: true
      },
      rank: 3,
      weeklyPoints: 145,
      monthlyPoints: 580,
      totalActivities: 32,
      streak: 12
    },
    {
      user: user,
      rank: 8,
      weeklyPoints: 85,
      monthlyPoints: 340,
      totalActivities: 18,
      streak: user.streak
    },
    {
      user: {
        id: 'user-leader-4',
        firstName: 'Sam',
        lastName: 'Taylor',
        email: 'sam@example.com',
        avatar: '🌊',
        location: user.location,
        preferences: user.preferences,
        presencePoints: 780,
        streak: 8,
        joinedAt: new Date(),
        friends: [],
        profileComplete: true
      },
      rank: 12,
      weeklyPoints: 65,
      monthlyPoints: 280,
      totalActivities: 15,
      streak: 8
    }
  ];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Award className="w-6 h-6 text-amber-600" />;
      default: return <span className="w-6 h-6 flex items-center justify-center text-gray-600 font-bold">#{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 2: return 'bg-gradient-to-r from-gray-300 to-gray-500';
      case 3: return 'bg-gradient-to-r from-amber-400 to-amber-600';
      default: return 'bg-gradient-to-r from-emerald-400 to-teal-500';
    }
  };

  const getPointsForTab = (entry: LeaderboardEntry) => {
    switch (activeTab) {
      case 'weekly': return entry.weeklyPoints;
      case 'monthly': return entry.monthlyPoints;
      case 'alltime': return entry.user.presencePoints;
      default: return entry.weeklyPoints;
    }
  };

  const sortedLeaderboard = [...mockLeaderboard].sort((a, b) => {
    const aPoints = getPointsForTab(a);
    const bPoints = getPointsForTab(b);
    return bPoints - aPoints;
  }).map((entry, index) => ({ ...entry, rank: index + 1 }));

  const userEntry = sortedLeaderboard.find(entry => entry.user.id === user.id);

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
            Community Leaderboard
          </h1>
          <div className="w-20"></div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-1 mb-6">
          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
              activeTab === 'weekly'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
              activeTab === 'monthly'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setActiveTab('alltime')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
              activeTab === 'alltime'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
            }`}
          >
            All Time
          </button>
        </div>

        {/* Your Rank Card */}
        {userEntry && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6 border-2 border-emerald-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Your Rank</h2>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-5 h-5" />
                <span className="font-medium">#{userEntry.rank}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${getRankColor(userEntry.rank)}`}>
                {user.avatar}
              </div>
              <div className="flex-1">
                <div className="font-bold text-gray-800 dark:text-white">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {getPointsForTab(userEntry)} points • {userEntry.streak} day streak
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {getPointsForTab(userEntry)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">points</div>
              </div>
            </div>
          </div>
        )}

        {/* Top 3 Podium */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-6 text-center">
            Top Performers
          </h2>
          
          <div className="flex items-end justify-center gap-4 mb-6">
            {/* 2nd Place */}
            {sortedLeaderboard[1] && (
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-gray-300 to-gray-500 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2">
                  {sortedLeaderboard[1].user.avatar}
                </div>
                <div className="bg-gray-300 h-16 w-20 rounded-t-lg flex items-center justify-center">
                  <span className="text-white font-bold">2</span>
                </div>
                <div className="mt-2">
                  <div className="font-medium text-gray-800 dark:text-white text-sm">
                    {sortedLeaderboard[1].user.firstName}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {getPointsForTab(sortedLeaderboard[1])} pts
                  </div>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {sortedLeaderboard[0] && (
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-2">
                  {sortedLeaderboard[0].user.avatar}
                </div>
                <div className="bg-yellow-500 h-24 w-24 rounded-t-lg flex items-center justify-center">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <div className="mt-2">
                  <div className="font-bold text-gray-800 dark:text-white">
                    {sortedLeaderboard[0].user.firstName}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {getPointsForTab(sortedLeaderboard[0])} pts
                  </div>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {sortedLeaderboard[2] && (
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2">
                  {sortedLeaderboard[2].user.avatar}
                </div>
                <div className="bg-amber-500 h-12 w-20 rounded-t-lg flex items-center justify-center">
                  <span className="text-white font-bold">3</span>
                </div>
                <div className="mt-2">
                  <div className="font-medium text-gray-800 dark:text-white text-sm">
                    {sortedLeaderboard[2].user.firstName}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {getPointsForTab(sortedLeaderboard[2])} pts
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Full Leaderboard */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Full Rankings
          </h2>
          
          <div className="space-y-3">
            {sortedLeaderboard.map((entry, index) => (
              <div
                key={entry.user.id}
                className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 ${
                  entry.user.id === user.id
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700'
                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center justify-center w-8">
                  {getRankIcon(entry.rank)}
                </div>
                
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${getRankColor(entry.rank)}`}>
                  {entry.user.avatar}
                </div>
                
                <div className="flex-1">
                  <div className="font-medium text-gray-800 dark:text-white">
                    {entry.user.firstName} {entry.user.lastName}
                    {entry.user.id === user.id && (
                      <span className="ml-2 text-sm text-emerald-600 dark:text-emerald-400">(You)</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {entry.streak} day streak • {entry.totalActivities} activities
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-bold text-gray-800 dark:text-white">
                    {getPointsForTab(entry)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">points</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Community Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Community Stats
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {sortedLeaderboard.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Active Members</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {sortedLeaderboard.reduce((sum, entry) => sum + getPointsForTab(entry), 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {Math.round(sortedLeaderboard.reduce((sum, entry) => sum + getPointsForTab(entry), 0) / sortedLeaderboard.length)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {Math.max(...sortedLeaderboard.map(entry => entry.streak))}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Longest Streak</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};