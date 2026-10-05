import React from 'react';
import { X, Settings, User, CalendarCheck, Users, Compass, Calendar, Trophy, Award, Target, Shield, CreditCard } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { User as UserType } from '../types';

interface MobileMenuProps {
  user: UserType;
  isAdmin: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ 
  user, 
  isAdmin, 
  onClose, 
  onNavigate 
}) => {
  const handleNavigation = (tab: string) => {
    onNavigate(tab);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 animate-fadeIn">
      <div className="absolute right-0 top-0 h-full w-3/4 max-w-xs bg-white dark:bg-gray-900 shadow-2xl animate-slideUp p-6 overflow-y-auto">
        <div className="flex justify-end mb-6">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white">
              {user.avatar}
            </div>
            <div>
              <div className="font-bold text-gray-800 dark:text-white font-display">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-sm text-emerald-600 dark:text-emerald-400 font-body">
                {user.presencePoints} points
              </div>
            </div>
          </div>
          
          <button
            onClick={() => handleNavigation('profile')}
            className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-gray-800 dark:text-white font-display">Profile Settings</span>
          </button>
          
          <button
            onClick={() => handleNavigation('subscription-management')}
            className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-gray-800 dark:text-white font-display">Manage Subscription</span>
          </button>
          
          <button
            onClick={() => handleNavigation('dashboard')}
            className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-gray-800 dark:text-white font-display">Home</span>
          </button>
          
          <button
            onClick={() => handleNavigation('my-events')}
            className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <CalendarCheck className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-gray-800 dark:text-white font-display">Events</span>
          </button>
          
          <button
            onClick={() => handleNavigation('friends')}
            className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-gray-800 dark:text-white font-display">Friends</span>
          </button>
          
          <button
            onClick={() => handleNavigation('browse')}
            className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <Compass className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-gray-800 dark:text-white font-display">Browse</span>
          </button>
          
          <button
            onClick={() => handleNavigation('calendar')}
            className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-gray-800 dark:text-white font-display">Calendar</span>
          </button>
          
          <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
          
          <button
            onClick={() => handleNavigation('achievements')}
            className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <Trophy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-gray-800 dark:text-white font-display">Achievements</span>
          </button>
          
          <button
            onClick={() => handleNavigation('leaderboard')}
            className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <Award className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-gray-800 dark:text-white font-display">Leaderboard</span>
          </button>
          
          <button
            onClick={() => handleNavigation('challenges')}
            className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <Target className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-gray-800 dark:text-white font-display">Challenges</span>
          </button>
          
          {isAdmin && (
            <button
              onClick={() => handleNavigation('admin')}
              className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="font-medium text-gray-800 dark:text-white font-display">Admin</span>
            </button>
          )}
          
          <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
          
          <div className="flex items-center justify-between p-3">
            <span className="text-sm text-gray-600 dark:text-gray-400 font-body">Dark Mode</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
};