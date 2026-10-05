// Enhanced Web Notifications for OffHours
// Web apps can send notifications just like native apps!

export class WebNotificationService {
  private static instance: WebNotificationService;
  private serviceWorker: ServiceWorkerRegistration | null = null;

  static getInstance(): WebNotificationService {
    if (!WebNotificationService.instance) {
      WebNotificationService.instance = new WebNotificationService();
    }
    return WebNotificationService.instance;
  }

  async initialize(): Promise<boolean> {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    // Register service worker for background notifications
    if ('serviceWorker' in navigator) {
      try {
        // Check if we're in a supported environment (not StackBlitz)
        if (window.location.hostname === 'localhost' && window.location.port === '5173') {
          console.log('Service Worker registration skipped in development environment');
        } else {
          this.serviceWorker = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered successfully');
        }
      } catch (error) {
        console.log('Service Worker registration failed, continuing without background notifications:', error);
        // Don't throw the error, just log it and continue
      }
    }

    return await this.requestPermission();
  }

  async requestPermission(): Promise<boolean> {
    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      // Show friendly prompt
      const userWants = window.confirm(
        '🌟 OffHours can send you gentle reminders for your daily presence moments!\n\n' +
        '• 6PM nudges for your evening reset\n' +
        '• Event reminders 30 minutes before\n' +
        '• Friend activity notifications\n\n' +
        'Enable notifications to stay connected?'
      );

      if (userWants) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
    }

    return false;
  }

  // Send immediate notification
  sendNotification(title: string, options: {
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    requireInteraction?: boolean;
    actions?: { action: string; title: string; icon?: string }[];
    data?: any;
  }): void {
    if (Notification.permission !== 'granted') return;

    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options
    });

    // Handle clicks
    notification.onclick = () => {
      window.focus();
      notification.close();
      
      // Handle specific actions
      if (options.data?.action) {
        this.handleNotificationAction(options.data.action, options.data);
      }
    };

    // Auto-close after 8 seconds (except important ones)
    if (!options.requireInteraction) {
      setTimeout(() => notification.close(), 8000);
    }
  }

  // Schedule notification for later (using service worker)
  async scheduleNotification(
    title: string,
    body: string,
    scheduledTime: Date,
    data?: any
  ): Promise<void> {
    // Only use service worker if available
    if (!this.serviceWorker) {
      console.log('Service Worker not available, using fallback scheduling');
    }

    // Store scheduled notification
    const notification = {
      id: `scheduled-${Date.now()}`,
      title,
      body,
      scheduledTime: scheduledTime.getTime(),
      data
    };

    // In production, this would use the service worker's background sync
    localStorage.setItem(
      'scheduled_notifications',
      JSON.stringify([
        ...this.getScheduledNotifications(),
        notification
      ])
    );

    // Set up timer for immediate scheduling
    const timeUntil = scheduledTime.getTime() - Date.now();
    if (timeUntil > 0 && timeUntil < 24 * 60 * 60 * 1000) { // Within 24 hours
      setTimeout(() => {
        this.sendNotification(title, { body, data });
      }, timeUntil);
    }
  }

  private getScheduledNotifications(): any[] {
    try {
      return JSON.parse(localStorage.getItem('scheduled_notifications') || '[]');
    } catch {
      return [];
    }
  }

  private handleNotificationAction(action: string, data: any): void {
    switch (action) {
      case 'view_activity':
        // Navigate to activities
        window.dispatchEvent(new CustomEvent('navigate-to-activities'));
        break;
      case 'join_pod':
        // Navigate to pod
        window.dispatchEvent(new CustomEvent('navigate-to-pod', { detail: data }));
        break;
      case 'view_events':
        // Navigate to events
        window.dispatchEvent(new CustomEvent('navigate-to-events'));
        break;
    }
  }

  // Send 6PM nudge notification
  sendDailyNudge(userName: string, activitySuggestion: string): void {
    this.sendNotification('Time for your OffHours moment! 🌟', {
      body: `${userName}, ready to disconnect and reconnect? ${activitySuggestion}`,
      tag: 'daily-nudge',
      requireInteraction: true,
      actions: [
        { action: 'view_activity', title: 'View Activities' },
        { action: 'dismiss', title: 'Later' }
      ],
      data: { action: 'view_activity' }
    });
  }

  // Send event reminder
  sendEventReminder(eventTitle: string, minutesUntil: number): void {
    this.sendNotification('Event Reminder 📅', {
      body: `"${eventTitle}" starts in ${minutesUntil} minutes!`,
      tag: 'event-reminder',
      requireInteraction: true,
      actions: [
        { action: 'view_events', title: 'View Details' },
        { action: 'dismiss', title: 'Got it' }
      ],
      data: { action: 'view_events' }
    });
  }

  // Send friend activity notification
  sendFriendActivity(friendName: string, activity: string): void {
    this.sendNotification('Friend Activity 👋', {
      body: `${friendName} just completed: ${activity}`,
      tag: 'friend-activity',
      actions: [
        { action: 'view_activity', title: 'Join Them' },
        { action: 'dismiss', title: 'Nice!' }
      ]
    });
  }

  // Send pod invitation
  sendPodInvitation(podName: string, activity: string): void {
    this.sendNotification('Pod Activity Starting! 👥', {
      body: `${podName} is gathering for: ${activity}`,
      tag: 'pod-invitation',
      requireInteraction: true,
      actions: [
        { action: 'join_pod', title: 'Join Now' },
        { action: 'dismiss', title: 'Maybe Later' }
      ],
      data: { action: 'join_pod' }
    });
  }
}

// Initialize on app load
export const webNotifications = WebNotificationService.getInstance();