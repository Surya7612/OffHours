import React, { useState } from 'react';
import { Crown, Clock, Zap, X } from 'lucide-react';

interface SubscriptionBannerProps {
  daysRemaining: number;
  isTrialActive: boolean;
  onUpgrade: () => void;
  onDismiss: () => void;
}

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({
  daysRemaining,
  isTrialActive,
  onUpgrade,
  onDismiss
}) => {
  if (!isTrialActive || daysRemaining <= 0) return null;

  const getUrgencyColor = () => {
    if (daysRemaining <= 1) return 'from-red-500 to-orange-500';
    if (daysRemaining <= 2) return 'from-orange-500 to-yellow-500';
    return 'from-emerald-500 to-teal-600';
  };

  const getUrgencyText = () => {
    if (daysRemaining <= 1) return 'Trial expires today!';
    if (daysRemaining <= 2) return 'Trial expires soon!';
    return 'Free trial active';
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDismiss();
  };

  const handleUpgrade = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onUpgrade();
  };

  return (
    <div className={`bg-gradient-to-r ${getUrgencyColor()} rounded-2xl shadow-lg p-4 mb-4 text-white relative overflow-hidden animate-slideDown`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12"></div>
      </div>
      
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
            <Crown className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="font-semibold text-sm sm:text-base truncate">{getUrgencyText()}</span>
            </div>
            <p className="text-white/90 text-xs sm:text-sm leading-tight">
              <span className="hidden sm:inline">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining • Upgrade to continue unlimited access</span>
              <span className="sm:hidden">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left • Upgrade now</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <button
            onClick={handleUpgrade}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-200 backdrop-blur-sm font-medium transform hover:scale-105 text-sm"
          >
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Upgrade Now</span>
            <span className="sm:hidden">Upgrade</span>
          </button>
          
          <button
            onClick={handleDismiss}
            className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 transform hover:scale-110"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};