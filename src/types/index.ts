export interface User {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  avatar: string;
  location: {
    lat: number;
    lng: number;
    neighborhood: string;
    city: string;
  };
  preferences: {
    nudgeTime: string; // e.g., "18:00"
    energyLevel: 'low' | 'medium' | 'high';
    interests: string[];
    allowSoloNudges: boolean;
    allowPodNudges: boolean;
    proximityRadius: number; // in km
  };
  presencePoints: number;
  streak: number;
  joinedAt: Date;
  friends: string[]; // User IDs
  isAdmin?: boolean;
  profileComplete: boolean;
}

export interface Pod {
  id: string;
  name: string;
  location: {
    center: { lat: number; lng: number };
    radius: number; // in km
  };
  members: User[];
  weeklyActivity?: WeeklyActivity;
  chatEnabled: boolean;
  createdAt: Date;
}

export interface UnifiedNudge {
  id: string;
  title: string;
  description: string;
  location: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
  scheduledTime: Date;
  duration: number; // in minutes
  type: 'walk' | 'gathering' | 'mindful' | 'creative' | 'social';
  maxParticipants?: number;
  participants: {
    userId: string;
    status: 'interested' | 'confirmed' | 'completed';
    joinedAt: Date;
  }[];
  podId: string;
  weather?: {
    condition: string;
    temperature: number;
  };
  chatRoomId?: string; // For planned events with RSVP
}

export interface SoloNudge {
  id: string;
  title: string;
  description: string;
  type: 'mindful' | 'creative' | 'nature' | 'reflection' | 'movement';
  duration: number; // in minutes
  location?: string; // Optional location suggestion
  scheduledTime: Date;
}

export interface WeeklyActivity {
  id: string;
  title: string;
  description: string;
  scheduledDate: Date;
  votes: {
    userId: string;
    vote: 'yes' | 'no';
  }[];
  status: 'voting' | 'confirmed' | 'completed';
  chatRoomId?: string;
  rsvpList: string[]; // User IDs who RSVP'd
}

export interface ChatRoom {
  id: string;
  type: 'pod' | 'event' | 'direct';
  participants: string[]; // User IDs
  eventId?: string; // For event-specific chats
  messages: ChatMessage[];
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'system';
}

export interface PresenceActivity {
  id: string;
  userId: string;
  type: 'walk' | 'call' | 'gathering' | 'mindful' | 'creative' | 'solo';
  duration: number;
  location?: string;
  reflection?: string;
  points: number;
  completedAt: Date;
  nudgeId?: string;
  wasWithFriends?: boolean;
}

export interface LumaEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location: {
    name: string;
    address: string;
    lat?: number;
    lng?: number;
  };
  url: string;
  tags: string[];
  attendeeCount: number;
  maxAttendees?: number;
  price?: number;
  organizer: {
    name: string;
    avatar?: string;
  };
}

export interface NotificationChoice {
  id: string;
  userId: string;
  scheduledTime: Date;
  soloOption: SoloNudge;
  podOption: UnifiedNudge;
  userChoice?: 'solo' | 'pod' | 'skip';
  chosenAt?: Date;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalPods: number;
  totalActivities: number;
  averagePresencePoints: number;
}

// New interfaces for My Events feature
export interface UserEventRSVP {
  id: string;
  userId: string;
  eventId: string;
  eventType: 'pod' | 'luma';
  eventTitle: string;
  eventDescription: string;
  eventDate: Date;
  eventLocation: string;
  status: 'confirmed' | 'cancelled';
  rsvpDate: Date;
  reminderSent?: boolean;
  eventData?: any; // Store full event data
}

export interface EventReminder {
  id: string;
  userId: string;
  eventId: string;
  eventType: 'pod' | 'luma';
  reminderType: 'departure' | 'start' | 'follow_up';
  scheduledTime: Date;
  message: string;
  sent: boolean;
}

// Real-time notification system types
export interface RealTimeNotification {
  id: string;
  userId: string;
  type: 'nudge' | 'friend_request' | 'pod_activity' | 'system' | 'event_reminder';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  read: boolean;
}

// Database schema interfaces for future implementation
export interface DatabaseUser extends Omit<User, 'joinedAt'> {
  joinedAt: string; // ISO string for database storage
  passwordHash: string;
  emailVerified: boolean;
  lastActive: string;
  deviceTokens: string[]; // For push notifications
}

export interface DatabaseActivity extends Omit<PresenceActivity, 'completedAt'> {
  completedAt: string; // ISO string for database storage
}

export interface DatabasePod extends Omit<Pod, 'createdAt' | 'members'> {
  createdAt: string;
  memberIds: string[]; // Store member IDs instead of full objects
}

// WebSocket message types for real-time features
export interface WebSocketMessage {
  type: 'notification' | 'chat_message' | 'nudge_update' | 'user_status';
  payload: any;
  timestamp: Date;
  userId?: string;
  roomId?: string;
}