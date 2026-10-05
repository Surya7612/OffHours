import { UserEventRSVP, EventReminder } from '../types';
import { differenceInMinutes, addMinutes, format } from 'date-fns';

export class EventNotificationService {
  private static instance: EventNotificationService;
  private reminders: Map<string, EventReminder[]> = new Map();
  private notificationInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startNotificationService();
  }

  static getInstance(): EventNotificationService {
    if (!EventNotificationService.instance) {
      EventNotificationService.instance = new EventNotificationService();
    }
    return EventNotificationService.instance;
  }

  // Calculate travel time using Google Maps API or Apple Maps
  private async calculateTravelTime(
    userLat: number,
    userLng: number,
    eventLat: number,
    eventLng: number
  ): Promise<number> {
    // In production, use Google Maps Distance Matrix API or Apple Maps
    // For now, return estimated time based on distance
    const distance = this.calculateDistance(userLat, userLng, eventLat, eventLng);
    
    // Estimate: 5 km/h walking speed + buffer time
    const walkingTimeMinutes = Math.ceil((distance / 5) * 60);
    const bufferTime = 10; // 10 minutes buffer
    
    return walkingTimeMinutes + bufferTime;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async scheduleEventReminders(
    rsvp: UserEventRSVP,
    userLocation: { lat: number; lng: number }
  ): Promise<void> {
    const reminders: EventReminder[] = [];
    const eventDate = rsvp.eventDate;
    
    // Calculate travel time if event has location coordinates
    let travelTimeMinutes = 15; // Default 15 minutes
    if (rsvp.eventData?.lat && rsvp.eventData?.lng) {
      try {
        travelTimeMinutes = await this.calculateTravelTime(
          userLocation.lat,
          userLocation.lng,
          rsvp.eventData.lat,
          rsvp.eventData.lng
        );
      } catch (error) {
        console.error('Error calculating travel time:', error);
      }
    }

    // Departure reminder (travel time + 5 minutes before event)
    const departureTime = addMinutes(eventDate, -(travelTimeMinutes + 5));
    reminders.push({
      id: `departure-${rsvp.id}`,
      userId: rsvp.userId,
      eventId: rsvp.eventId,
      eventType: rsvp.eventType,
      reminderType: 'departure',
      scheduledTime: departureTime,
      message: `Time to leave for "${rsvp.eventTitle}"! 🚶‍♀️ Estimated travel time: ${travelTimeMinutes} minutes`,
      sent: false
    });

    // Event start reminder (5 minutes before)
    const startReminder = addMinutes(eventDate, -5);
    reminders.push({
      id: `start-${rsvp.id}`,
      userId: rsvp.userId,
      eventId: rsvp.eventId,
      eventType: rsvp.eventType,
      reminderType: 'start',
      scheduledTime: startReminder,
      message: `"${rsvp.eventTitle}" is starting in 5 minutes! 🎉`,
      sent: false
    });

    // Follow-up reminder (30 minutes after event ends)
    const followUpTime = addMinutes(eventDate, 90); // Assuming 60 min event + 30 min buffer
    reminders.push({
      id: `followup-${rsvp.id}`,
      userId: rsvp.userId,
      eventId: rsvp.eventId,
      eventType: rsvp.eventType,
      reminderType: 'follow_up',
      scheduledTime: followUpTime,
      message: `How was "${rsvp.eventTitle}"? Share your experience! ✨`,
      sent: false
    });

    this.reminders.set(rsvp.id, reminders);
  }

  private startNotificationService(): void {
    // Check for pending notifications every minute
    this.notificationInterval = setInterval(() => {
      this.checkAndSendNotifications();
    }, 60000);
  }

  private checkAndSendNotifications(): void {
    const now = new Date();
    
    this.reminders.forEach((eventReminders, rsvpId) => {
      eventReminders.forEach(reminder => {
        if (!reminder.sent && reminder.scheduledTime <= now) {
          this.sendNotification(reminder);
          reminder.sent = true;
        }
      });
    });
  }

  private sendNotification(reminder: EventReminder): void {
    // Send browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('OffHours Event Reminder', {
        body: reminder.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: reminder.id,
        requireInteraction: reminder.reminderType === 'departure'
      });

      // Auto-close after 10 seconds (except departure reminders)
      if (reminder.reminderType !== 'departure') {
        setTimeout(() => notification.close(), 10000);
      }
    }

    // Also trigger in-app notification
    this.triggerInAppNotification(reminder);
  }

  private triggerInAppNotification(reminder: EventReminder): void {
    // Dispatch custom event for in-app notifications
    const event = new CustomEvent('offhours-notification', {
      detail: {
        type: 'event_reminder',
        reminder
      }
    });
    window.dispatchEvent(event);
  }

  cancelEventReminders(rsvpId: string): void {
    this.reminders.delete(rsvpId);
  }

  // Get directions using preferred map service
  static openDirections(
    eventLat?: number,
    eventLng?: number,
    eventAddress?: string
  ): void {
    if (eventLat && eventLng) {
      // Use Apple Maps on iOS, Google Maps otherwise
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (isIOS) {
        window.open(`maps://maps.google.com/maps?daddr=${eventLat},${eventLng}&amp;ll=`);
      } else {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${eventLat},${eventLng}`);
      }
    } else if (eventAddress) {
      // Fallback to address search
      const query = encodeURIComponent(eventAddress);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`);
    }
  }

  // Request notification permission
  static async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  destroy(): void {
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
      this.notificationInterval = null;
    }
    this.reminders.clear();
  }
}

// Initialize the service
export const eventNotificationService = EventNotificationService.getInstance();

// Request notification permission on app load
EventNotificationService.requestNotificationPermission().then(granted => {
  if (granted) {
    console.log('Event notifications enabled');
  } else {
    console.log('Event notifications disabled');
  }
});