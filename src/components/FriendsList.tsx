import React, { useState } from 'react';
import { MessageCircle, UserPlus, Users, Search } from 'lucide-react';
import { User } from '../types';

interface FriendsListProps {
  user: User;
  friends: User[];
  onStartChat: (friendId: string) => void;
  onAddFriend: (userId: string) => void;
}

export const FriendsList: React.FC<FriendsListProps> = ({ 
  user, 
  friends, 
  onStartChat, 
  onAddFriend 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFriends, setShowAddFriends] = useState(false);

  // Mock nearby users for friend suggestions
  const nearbyUsers: User[] = [
    {
      id: 'user-6',
      firstName: 'Maya',
      avatar: '🌸',
      location: user.location,
      preferences: { nudgeTime: '18:00', energyLevel: 'medium', interests: ['walking', 'art'], allowSoloNudges: true, allowPodNudges: true },
      presencePoints: 420,
      streak: 8,
      joinedAt: new Date(),
      friends: []
    },
    {
      id: 'user-7',
      firstName: 'River',
      avatar: '🌊',
      location: user.location,
      preferences: { nudgeTime: '18:30', energyLevel: 'high', interests: ['nature', 'meditation'], allowSoloNudges: true, allowPodNudges: true },
      presencePoints: 380,
      streak: 6,
      joinedAt: new Date(),
      friends: []
    }
  ];

  const filteredFriends = friends.filter(friend => 
    friend.firstName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Users className="w-6 h-6" />
          Your Circle
        </h2>
        <button
          onClick={() => setShowAddFriends(!showAddFriends)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors duration-200"
        >
          <UserPlus className="w-4 h-4" />
          Add Friends
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search friends..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {/* Friends List */}
      <div className="space-y-3 mb-6">
        {filteredFriends.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No friends yet. Start connecting!</p>
          </div>
        ) : (
          filteredFriends.map(friend => (
            <div key={friend.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-medium">
                  {friend.avatar}
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">{friend.firstName}</h3>
                  <p className="text-sm text-gray-500">{friend.presencePoints} presence points</p>
                </div>
              </div>
              <button
                onClick={() => onStartChat(friend.id)}
                className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors duration-200"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Friends Section */}
      {showAddFriends && (
        <div className="border-t border-gray-200 pt-4">
          <h3 className="font-medium text-gray-800 mb-3">People Nearby</h3>
          <div className="space-y-2">
            {nearbyUsers.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm">
                    {user.avatar}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">{user.firstName}</h4>
                    <p className="text-xs text-gray-500">
                      {user.interests.slice(0, 2).join(', ')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onAddFriend(user.id)}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors duration-200"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};