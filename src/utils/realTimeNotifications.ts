// Real-time notification system using WebSockets
// This would integrate with Firebase Cloud Messaging or similar service in production

import { User } from '../types';

export class RealTimeNotificationService {
  private static instance: RealTimeNotificationService;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Function[]> = new Map();
  private notificationInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): RealTimeNotificationService {
    if (!RealTimeNotificationService.instance) {
      RealTimeNotificationService.instance = new RealTimeNotificationService();
    }
    return RealTimeNotificationService.instance;
  }

  connect(userId: string) {
    // In production, this would connect to your WebSocket server
    // For now, we'll simulate with a mock connection
    this.simulateConnection(userId);
  }

  private simulateConnection(userId: string) {
    // Simulate WebSocket connection
    console.log(`Connected to real-time notifications for user: ${userId}`);
    
    // Start the enhanced notification system
    this.startEnhancedNotificationSystem(userId);
  }

  private startEnhancedNotificationSystem(userId: string) {
    // Check for scheduled notifications every minute
    this.notificationInterval = setInterval(() => {
      this.checkScheduledNotifications(userId);
    }, 60000); // Check every minute

    // Simulate AI-powered activity suggestions
    this.schedulePersonalizedNotifications(userId);
  }

  private schedulePersonalizedNotifications(userId: string) {
    const user = this.getUserData(userId);
    if (!user) return;

    // Schedule personalized notifications based on user's nudge time
    const [hours, minutes] = user.preferences.nudgeTime.split(':').map(Number);
    
    // Check if it's the user's preferred nudge time
    const now = new Date();
    if (now.getHours() === hours && now.getMinutes() === minutes) {
      this.sendPersonalizedNudgeNotification(userId, user);
    }

    // Send activity reminders 30 minutes before events
    this.checkEventReminders(userId);
  }

  private checkScheduledNotifications(userId: string) {
    const user = this.getUserData(userId);
    if (!user) return;

    const now = new Date();
    const [hours, minutes] = user.preferences.nudgeTime.split(':').map(Number);
    
    if (now.getHours() === hours && now.getMinutes() === minutes) {
      this.sendPersonalizedNudgeNotification(userId, user);
    }
  }

  private sendPersonalizedNudgeNotification(userId: string, user: User) {
    // AI-powered personalized notification
    const personalizedMessages = [
      `Time for your daily presence moment, ${user.firstName}! 🌟`,
      `Your 6PM reset is here - ready to reconnect with real life? ✨`,
      `${user.firstName}, let's make this evening meaningful 🌅`,
      `Time to step away from screens and into the moment 🧘`,
      `Your pod is gathering - join them for today's activity! 👥`
    ];

    const message = personalizedMessages[Math.floor(Math.random() * personalizedMessages.length)];

    const notification = {
      type: 'personalized_nudge',
      title: "OffHours - Your Moment Awaits",
      message,
      timestamp: new Date(),
      userId,
      data: {
        interests: user.preferences.interests,
        energyLevel: user.preferences.energyLevel
      }
    };

    this.emit('notification', notification);
    this.sendPushNotification(userId, notification);
  }

  private checkEventReminders(userId: string) {
    // Check for upcoming events and send reminders
    const userRSVPs = this.getUserRSVPs(userId);
    const now = new Date();

    userRSVPs.forEach(rsvp => {
      const eventTime = new Date(rsvp.eventDate);
      const timeDiff = eventTime.getTime() - now.getTime();
      const minutesUntil = Math.floor(timeDiff / (1000 * 60));

      // Send reminder 30 minutes before event
      if (minutesUntil === 30) {
        const notification = {
          type: 'event_reminder',
          title: "Event Reminder",
          message: `"${rsvp.eventTitle}" starts in 30 minutes! 🎉`,
          timestamp: new Date(),
          userId,
          data: {
            eventId: rsvp.eventId,
            eventType: rsvp.eventType,
            location: rsvp.eventLocation
          }
        };

        this.emit('notification', notification);
        this.sendPushNotification(userId, notification);
      }

      // Send departure reminder (travel time + buffer)
      if (minutesUntil === 45) { // Assuming 15 min travel time
        const notification = {
          type: 'departure_reminder',
          title: "Time to Leave!",
          message: `Time to head to "${rsvp.eventTitle}" 🚶‍♀️`,
          timestamp: new Date(),
          userId,
          data: {
            eventId: rsvp.eventId,
            location: rsvp.eventLocation
          }
        };

        this.emit('notification', notification);
        this.sendPushNotification(userId, notification);
      }
    });
  }

  private getUserData(userId: string): User | null {
    const savedUser = localStorage.getItem('offhours_user');
    if (savedUser) {
      try {
        const encryptedData = savedUser;
        // In production, decrypt the data
        const user = JSON.parse(encryptedData);
        return user.id === userId ? user : null;
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  private getUserRSVPs(userId: string) {
    const savedRSVPs = localStorage.getItem('user_rsvps');
    if (savedRSVPs) {
      try {
        const rsvps = JSON.parse(savedRSVPs);
        return rsvps.filter((rsvp: any) => rsvp.userId === userId && rsvp.status === 'confirmed');
      } catch (error) {
        return [];
      }
    }
    return [];
  }

  private sendPushNotification(userId: string, notification: any) {
    // Enhanced push notification with better targeting
    if ('Notification' in window && Notification.permission === 'granted') {
      const pushNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `offhours-${notification.type}`,
        requireInteraction: notification.type === 'departure_reminder',
        actions: notification.type === 'personalized_nudge' ? [
          { action: 'view', title: 'View Activities' },
          { action: 'dismiss', title: 'Later' }
        ] : undefined
      });

      // Handle notification clicks
      pushNotification.onclick = () => {
        window.focus();
        if (notification.type === 'event_reminder') {
          // Navigate to My Events
          window.dispatchEvent(new CustomEvent('navigate-to-events'));
        }
        pushNotification.close();
      };

      // Auto-close after 10 seconds (except departure reminders)
      if (notification.type !== 'departure_reminder') {
        setTimeout(() => pushNotification.close(), 10000);
      }
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
      this.notificationInterval = null;
    }
  }

  // Request notification permission with better UX
  static async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      // Show a friendly prompt first
      const userWantsNotifications = window.confirm(
        'OffHours can send you gentle reminders for your daily presence moments and upcoming events. Would you like to enable notifications?'
      );
      
      if (userWantsNotifications) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
    }

    return false;
  }
}

// Enhanced Firebase Cloud Messaging integration (for production)
export class FirebaseNotificationService {
  private static instance: FirebaseNotificationService;
  
  private constructor() {}

  static getInstance(): FirebaseNotificationService {
    if (!FirebaseNotificationService.instance) {
      FirebaseNotificationService.instance = new FirebaseNotificationService();
    }
    return FirebaseNotificationService.instance;
  }

  async initialize() {
    // In production, initialize Firebase with enhanced features
    console.log('Enhanced Firebase notifications would be initialized here');
  }

  async getDeviceToken(): Promise<string | null> {
    // In production, get FCM token with better error handling
    return 'enhanced-device-token';
  }

  async subscribeToPersonalizedTopics(userId: string, interests: string[]) {
    // Subscribe to topics based on user interests for better targeting
    console.log(`Subscribed to personalized topics for ${userId}:`, interests);
  }

  async sendPersonalizedNotification(userId: string, notification: any) {
    // Send via FCM with user segmentation and A/B testing
    console.log(`Sending personalized notification to ${userId}:`, notification);
  }
}