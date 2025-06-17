// Additional Engagement Features for Web App Retention

export class EngagementFeatures {
  
  // Progressive Web App (PWA) Installation
  static async promptInstallApp(): Promise<boolean> {
    // Check if app can be installed
    if ('beforeinstallprompt' in window) {
      const deferredPrompt = (window as any).deferredPrompt;
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        return outcome === 'accepted';
      }
    }
    return false;
  }

  // Offline Support with Smart Caching
  static enableOfflineMode(): void {
    if ('serviceWorker' in navigator) {
      // Cache user's activities and preferences for offline access
      const offlineData = {
        userProfile: localStorage.getItem('offhours_user'),
        recentActivities: localStorage.getItem('recent_activities'),
        offlineActivities: this.getOfflineActivities()
      };
      
      localStorage.setItem('offline_data', JSON.stringify(offlineData));
    }
  }

  private static getOfflineActivities() {
    return [
      {
        title: "Mindful Breathing",
        description: "Take 10 deep breaths and center yourself",
        duration: 10,
        type: "mindful"
      },
      {
        title: "Gratitude Journal",
        description: "Write down 3 things you're grateful for",
        duration: 15,
        type: "reflection"
      },
      {
        title: "Gentle Stretching",
        description: "Move your body with simple stretches",
        duration: 15,
        type: "movement"
      }
    ];
  }

  // Smart Home Screen Widget (PWA)
  static createHomeScreenWidget(): void {
    // When installed as PWA, show today's activity on home screen
    const widgetData = {
      todayActivity: "Sunset Walk",
      streak: 7,
      nextEvent: "Pod Gathering at 6PM"
    };
    
    // This would update the PWA's home screen widget
    if ('setAppBadge' in navigator) {
      (navigator as any).setAppBadge(widgetData.streak);
    }
  }

  // Habit Tracking with Streaks
  static updateHabitStreak(userId: string, activityType: string): number {
    const streaks = JSON.parse(localStorage.getItem('habit_streaks') || '{}');
    const today = new Date().toDateString();
    
    if (!streaks[activityType]) {
      streaks[activityType] = { count: 0, lastDate: null };
    }
    
    const lastDate = streaks[activityType].lastDate;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastDate === today) {
      // Already completed today
      return streaks[activityType].count;
    } else if (lastDate === yesterday.toDateString()) {
      // Continuing streak
      streaks[activityType].count++;
    } else {
      // Starting new streak
      streaks[activityType].count = 1;
    }
    
    streaks[activityType].lastDate = today;
    localStorage.setItem('habit_streaks', JSON.stringify(streaks));
    
    return streaks[activityType].count;
  }

  // Smart Reminders Based on Usage Patterns
  static scheduleSmartReminders(userId: string): void {
    const usagePattern = this.analyzeUsagePattern(userId);
    
    // Schedule reminders at optimal times
    usagePattern.optimalTimes.forEach(time => {
      const reminderTime = new Date();
      const [hours, minutes] = time.split(':');
      reminderTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      if (reminderTime > new Date()) {
        setTimeout(() => {
          this.sendSmartReminder(usagePattern.preferredActivity);
        }, reminderTime.getTime() - Date.now());
      }
    });
  }

  private static analyzeUsagePattern(userId: string) {
    // Analyze when user is most active
    const activities = JSON.parse(localStorage.getItem('user_activities') || '[]');
    
    // Find most common activity times and types
    const timeFrequency: { [key: string]: number } = {};
    const typeFrequency: { [key: string]: number } = {};
    
    activities.forEach((activity: any) => {
      const hour = new Date(activity.completedAt).getHours();
      const timeSlot = `${hour}:00`;
      timeFrequency[timeSlot] = (timeFrequency[timeSlot] || 0) + 1;
      typeFrequency[activity.type] = (typeFrequency[activity.type] || 0) + 1;
    });
    
    return {
      optimalTimes: Object.keys(timeFrequency).sort((a, b) => timeFrequency[b] - timeFrequency[a]).slice(0, 2),
      preferredActivity: Object.keys(typeFrequency).sort((a, b) => typeFrequency[b] - typeFrequency[a])[0]
    };
  }

  private static sendSmartReminder(activityType: string): void {
    const messages = {
      mindful: "Time for a mindful moment? Your brain will thank you 🧘",
      social: "Your pod friends are active! Join them for today's activity 👥",
      nature: "The weather is perfect for a nature walk 🌿",
      creative: "Feeling creative? Time to express yourself 🎨"
    };
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Smart Reminder 🤖', {
        body: messages[activityType as keyof typeof messages] || "Time for your OffHours moment!",
        icon: '/favicon.ico',
        tag: 'smart-reminder'
      });
    }
  }

  // Gamification with Achievements
  static checkAchievements(userId: string, newActivity: any): string[] {
    const achievements = JSON.parse(localStorage.getItem('user_achievements') || '[]');
    const newAchievements: string[] = [];
    
    const achievementRules = [
      {
        id: 'first_week',
        name: 'First Week Warrior',
        condition: (activities: any[]) => activities.length >= 7,
        reward: '50 bonus points'
      },
      {
        id: 'social_butterfly',
        name: 'Social Butterfly',
        condition: (activities: any[]) => activities.filter(a => a.wasWithFriends).length >= 5,
        reward: 'Social Badge'
      },
      {
        id: 'early_bird',
        name: 'Early Bird',
        condition: (activities: any[]) => activities.filter(a => new Date(a.completedAt).getHours() < 9).length >= 3,
        reward: 'Morning Person Badge'
      }
    ];
    
    const userActivities = JSON.parse(localStorage.getItem('user_activities') || '[]');
    userActivities.push(newActivity);
    
    achievementRules.forEach(rule => {
      if (!achievements.includes(rule.id) && rule.condition(userActivities)) {
        achievements.push(rule.id);
        newAchievements.push(rule.name);
        
        // Show achievement notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Achievement Unlocked! 🏆', {
            body: `${rule.name} - ${rule.reward}`,
            icon: '/favicon.ico',
            tag: 'achievement'
          });
        }
      }
    });
    
    localStorage.setItem('user_achievements', JSON.stringify(achievements));
    return newAchievements;
  }

  // Weekly Challenges
  static generateWeeklyChallenge(): any {
    const challenges = [
      {
        id: 'mindful_week',
        title: 'Mindful Week',
        description: 'Complete 5 mindful activities this week',
        target: 5,
        type: 'mindful',
        reward: '100 bonus points + Zen Master badge'
      },
      {
        id: 'social_week',
        title: 'Social Connection Week',
        description: 'Do 3 activities with friends this week',
        target: 3,
        type: 'social',
        reward: '75 bonus points + Community Builder badge'
      },
      {
        id: 'nature_week',
        title: 'Nature Immersion Week',
        description: 'Spend 2 hours in nature this week',
        target: 120, // minutes
        type: 'nature',
        reward: '80 bonus points + Nature Lover badge'
      }
    ];
    
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    const challengeIndex = Math.floor(Math.random() * challenges.length);
    const challenge = {
      ...challenges[challengeIndex],
      weekStart: weekStart.toISOString(),
      progress: 0
    };
    
    localStorage.setItem('weekly_challenge', JSON.stringify(challenge));
    return challenge;
  }
}

// Auto-initialize engagement features
export const initializeEngagementFeatures = (userId: string) => {
  // Enable offline mode
  EngagementFeatures.enableOfflineMode();
  
  // Schedule smart reminders
  EngagementFeatures.scheduleSmartReminders(userId);
  
  // Create home screen widget if PWA
  if (window.matchMedia('(display-mode: standalone)').matches) {
    EngagementFeatures.createHomeScreenWidget();
  }
  
  // Generate weekly challenge if none exists
  if (!localStorage.getItem('weekly_challenge')) {
    EngagementFeatures.generateWeeklyChallenge();
  }
};