import React, { useState } from 'react';
import { Users, Activity, MapPin, TrendingUp, Settings, BarChart3, UserCheck, MessageSquare } from 'lucide-react';
import { User, Pod, AdminStats } from '../types';

interface AdminDashboardProps {
  user: User;
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'pods' | 'activities'>('overview');

  // Mock admin data
  const stats: AdminStats = {
    totalUsers: 1247,
    activeUsers: 892,
    totalPods: 156,
    totalActivities: 3421,
    averagePresencePoints: 387
  };

  const recentUsers: User[] = [
    {
      id: 'user-new-1',
      firstName: 'Emma',
      lastName: 'Chen',
      email: 'emma@example.com',
      avatar: '🌸',
      location: { lat: 40.7178, lng: -74.0431, neighborhood: 'Downtown JC', city: 'Jersey City' },
      preferences: { nudgeTime: '18:00', energyLevel: 'medium', interests: ['walking', 'art'], allowSoloNudges: true, allowPodNudges: true },
      presencePoints: 45,
      streak: 3,
      joinedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      friends: [],
      profileComplete: true
    },
    {
      id: 'user-new-2',
      firstName: 'Marcus',
      lastName: 'Johnson',
      email: 'marcus@example.com',
      avatar: '🎯',
      location: { lat: 40.7178, lng: -74.0431, neighborhood: 'Newport', city: 'Jersey City' },
      preferences: { nudgeTime: '17:30', energyLevel: 'high', interests: ['fitness', 'community'], allowSoloNudges: true, allowPodNudges: true },
      presencePoints: 120,
      streak: 7,
      joinedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      friends: [],
      profileComplete: true
    }
  ];

  const topPods: Pod[] = [
    {
      id: 'pod-top-1',
      name: 'Downtown JC Connectors',
      location: { center: { lat: 40.7178, lng: -74.0431 }, radius: 2 },
      members: Array(12).fill(null).map((_, i) => ({ id: `member-${i}` } as User)),
      chatEnabled: true,
      createdAt: new Date()
    },
    {
      id: 'pod-top-2',
      name: 'Newport Mindful Walkers',
      location: { center: { lat: 40.7282, lng: -74.0342 }, radius: 1.5 },
      members: Array(8).fill(null).map((_, i) => ({ id: `member-${i}` } as User)),
      chatEnabled: true,
      createdAt: new Date()
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
          >
            ← Back to App
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Settings className="w-4 h-4" />
            Admin: {user.firstName}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white rounded-2xl shadow-lg p-1 mb-6 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'pods', label: 'Pods', icon: MapPin },
            { id: 'activities', label: 'Activities', icon: Activity }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 text-blue-500" />
                  <span className="text-sm text-gray-500">Total</span>
                </div>
                <div className="text-2xl font-bold text-gray-800">{stats.totalUsers.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Registered Users</div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <UserCheck className="w-8 h-8 text-green-500" />
                  <span className="text-sm text-gray-500">Active</span>
                </div>
                <div className="text-2xl font-bold text-gray-800">{stats.activeUsers.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Active This Week</div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <MapPin className="w-8 h-8 text-purple-500" />
                  <span className="text-sm text-gray-500">Pods</span>
                </div>
                <div className="text-2xl font-bold text-gray-800">{stats.totalPods}</div>
                <div className="text-sm text-gray-600">Active Pods</div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-8 h-8 text-orange-500" />
                  <span className="text-sm text-gray-500">Activities</span>
                </div>
                <div className="text-2xl font-bold text-gray-800">{stats.totalActivities.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Users */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Users</h3>
                <div className="space-y-3">
                  {recentUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white">
                          {user.avatar}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{user.firstName} {user.lastName}</div>
                          <div className="text-sm text-gray-500">{user.location.neighborhood}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-emerald-600">{user.presencePoints} pts</div>
                        <div className="text-xs text-gray-500">{user.streak} day streak</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Pods */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Most Active Pods</h3>
                <div className="space-y-3">
                  {topPods.map(pod => (
                    <div key={pod.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{pod.name}</div>
                          <div className="text-sm text-gray-500">{pod.members.length} members</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Active</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">User Management</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <TrendingUp className="w-4 h-4" />
                {stats.activeUsers} active this week
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">User</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Location</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Points</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Streak</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map(user => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white text-sm">
                            {user.avatar}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">{user.firstName} {user.lastName}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{user.location.neighborhood}</td>
                      <td className="py-3 px-4 text-emerald-600 font-medium">{user.presencePoints}</td>
                      <td className="py-3 px-4 text-orange-600 font-medium">{user.streak}</td>
                      <td className="py-3 px-4 text-gray-600">
                        {user.joinedAt.toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pods Tab */}
        {activeTab === 'pods' && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Pod Management</h3>
              <div className="text-sm text-gray-600">{stats.totalPods} total pods</div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topPods.map(pod => (
                <div key={pod.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-800">{pod.name}</h4>
                    <span className="text-sm text-gray-500">{pod.members.length} members</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    Radius: {pod.location.radius}km
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {pod.members.slice(0, 5).map((_, index) => (
                        <div
                          key={index}
                          className="w-6 h-6 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full border-2 border-white"
                        />
                      ))}
                    </div>
                    {pod.members.length > 5 && (
                      <span className="text-xs text-gray-500">+{pod.members.length - 5} more</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activities Tab */}
        {activeTab === 'activities' && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Activity Analytics</h3>
              <div className="text-sm text-gray-600">{stats.totalActivities} total activities</div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-emerald-50 rounded-xl p-4">
                <div className="text-2xl font-bold text-emerald-600">1,247</div>
                <div className="text-sm text-emerald-700">Solo Activities</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="text-2xl font-bold text-blue-600">892</div>
                <div className="text-sm text-blue-700">Pod Activities</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-4">
                <div className="text-2xl font-bold text-purple-600">1,282</div>
                <div className="text-sm text-purple-700">Reflections</div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-800">Popular Activity Types</h4>
              {[
                { type: 'Walking', count: 1247, color: 'bg-green-500' },
                { type: 'Mindful Moments', count: 892, color: 'bg-purple-500' },
                { type: 'Social Gatherings', count: 634, color: 'bg-blue-500' },
                { type: 'Creative Time', count: 421, color: 'bg-pink-500' },
                { type: 'Nature Connection', count: 227, color: 'bg-emerald-500' }
              ].map(activity => (
                <div key={activity.type} className="flex items-center gap-4">
                  <div className="w-32 text-sm text-gray-700">{activity.type}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${activity.color}`}
                      style={{ width: `${(activity.count / 1247) * 100}%` }}
                    />
                  </div>
                  <div className="w-16 text-sm text-gray-600 text-right">{activity.count}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};