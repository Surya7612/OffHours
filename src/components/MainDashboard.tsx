import React, { useState, useEffect } from 'react';
import { UnifiedNudgeCard } from './UnifiedNudgeCard';
import { SoloNudgeCard } from './SoloNudgeCard';
import { PresenceScore } from './PresenceScore';
import { PodOverview } from './PodOverview';
import { ReflectionPrompt } from './ReflectionPrompt';
import { RealTimeNotification } from './RealTimeNotification';
import { FriendsList } from './FriendsList';
import { ChatInterface } from './ChatInterface';
import { CalendarView } from './CalendarView';
import { LumaEventsView } from './LumaEventsView';
import { ActivityBrowser } from './ActivityBrowser';
import { MyEventsView } from './MyEventsView';
import { AchievementBadges } from './AchievementBadges';
import { CommunityLeaderboard } from './CommunityLeaderboard';
import { MonthlyChallenges } from './MonthlyChallenges';
import { WeeklyScheduler } from './WeeklyScheduler';
import { CommunityEventCreator } from './CommunityEventCreator';
import { ActiveActivityTracker } from './ActiveActivityTracker';
import { ThemeToggle } from './ThemeToggle';
import { SubscriptionBanner } from './SubscriptionBanner';
import { MobileMenu } from './MobileMenu';
import { ProfileScreen } from './ProfileScreen';
import { AdminDashboard } from './AdminDashboard';
import { SubscriptionManagement } from './SubscriptionManagement';
import { UnifiedNudge, Pod, User, SoloNudge, NotificationChoice, ChatRoom, ChatMessage, PresenceActivity, LumaEvent, UserEventRSVP } from '../types';
import { generateEnhancedUnifiedNudge, generateEnhancedSoloNudge } from '../utils/enhancedNudgeGenerator';
import { ActivityTemplate } from '../utils/activityDatabase';
import { useGeolocation } from '../hooks/useGeolocation';
import { MessageCircle, Users, User as UserIcon, Calendar, ExternalLink, MapPin, Compass, CalendarCheck, Trophy, Target, Award, Plus, Play, Pause, Square, CheckCircle, Settings, Shield, Menu, X } from 'lucide-react';

interface MainDashboardProps {
  user: User;
  pod: Pod;
  subscription: {
    loading: boolean;
    hasAccess: boolean;
    isTrialActive: boolean;
    daysRemaining: number;
    purchaseSubscription: (planId: string, couponCode?: string) => Promise<{ success: boolean; error?: string }>;
    cancelSubscription?: () => Promise<{ success: boolean; error?: string }>;
  };
  setShowPaymentWall: (show: boolean) => void;
}

interface ActiveActivity {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  startTime: Date;
  timeRemaining: number; // in seconds
  isActive: boolean;
  type: 'solo' | 'pod';
  originalNudgeId: string;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({ user, pod, subscription, setShowPaymentWall }) => {
  const [todaysNudge, setTodaysNudge] = useState<UnifiedNudge | null>(null);
  const [soloNudge, setSoloNudge] = useState<SoloNudge | null>(null);
  const [userNudgeStatus, setUserNudgeStatus] = useState<'interested' | 'confirmed' | 'completed' | undefined>();
  const [showReflection, setShowReflection] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationChoice, setNotificationChoice] = useState<NotificationChoice | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'friends' | 'chat' | 'calendar' | 'events' | 'browse' | 'my-events' | 'achievements' | 'leaderboard' | 'challenges' | 'scheduler' | 'community-events' | 'profile' | 'admin' | 'subscription-management'>('dashboard');
  const [activeChatRoom, setActiveChatRoom] = useState<ChatRoom | null>(null);
  const [friends, setFriends] = useState<User[]>([]);
  const [activities, setActivities] = useState<PresenceActivity[]>([]);
  const [userRSVPs, setUserRSVPs] = useState<UserEventRSVP[]>([]);
  const [activeActivity, setActiveActivity] = useState<ActiveActivity | null>(null);
  const [completedNudges, setCompletedNudges] = useState<Set<string>>(new Set());
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const { latitude, longitude, error: locationError } = useGeolocation();

  // Mock chat rooms
  const [chatRooms] = useState<ChatRoom[]>([
    {
      id: 'pod-chat-1',
      type: 'pod',
      participants: pod.members.map(m => m.id),
      messages: [
        {
          id: '1',
          senderId: 'user-2',
          content: 'Hey everyone! Who\'s joining the sunset walk today?',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          type: 'text'
        },
        {
          id: '2',
          senderId: 'user-3',
          content: 'I\'m in! See you at Liberty Park at 6:30',
          timestamp: new Date(Date.now() - 25 * 60 * 1000),
          type: 'text'
        }
      ],
      createdAt: new Date()
    }
  ]);

  // Load completed nudges from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('completed_nudges');
    if (saved) {
      try {
        setCompletedNudges(new Set(JSON.parse(saved)));
      } catch (error) {
        console.error('Error loading completed nudges:', error);
      }
    }
  }, []);

  // Load active activity from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('active_activity');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const activity = {
          ...parsed,
          startTime: new Date(parsed.startTime)
        };
        
        // Check if activity is still valid (not expired)
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - activity.startTime.getTime()) / 1000);
        const totalDuration = activity.duration * 60;
        
        if (elapsed < totalDuration && activity.isActive) {
          setActiveActivity({
            ...activity,
            timeRemaining: Math.max(0, totalDuration - elapsed)
          });
        } else {
          localStorage.removeItem('active_activity');
        }
      } catch (error) {
        console.error('Error loading active activity:', error);
      }
    }
  }, []);

  // Mock activities for calendar
  useEffect(() => {
    const mockActivities: PresenceActivity[] = [
      {
        id: 'activity-1',
        userId: user.id,
        type: 'walk',
        duration: 30,
        location: 'Liberty State Park',
        reflection: 'Felt so peaceful watching the sunset. Really needed this break from screens.',
        points: 50,
        completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        wasWithFriends: false
      },
      {
        id: 'activity-2',
        userId: user.id,
        type: 'gathering',
        duration: 45,
        location: 'Hamilton Park',
        reflection: 'Great conversation with the pod. We talked about mindfulness and presence.',
        points: 75,
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        wasWithFriends: true
      },
      {
        id: 'activity-3',
        userId: user.id,
        type: 'mindful',
        duration: 15,
        reflection: 'Short meditation session helped me reset after a busy day.',
        points: 30,
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        wasWithFriends: false
      }
    ];
    setActivities(mockActivities);
  }, [user.id]);

  // Load user RSVPs
  useEffect(() => {
    const mockRSVPs: UserEventRSVP[] = [
      {
        id: 'rsvp-1',
        userId: user.id,
        eventId: 'luma-1',
        eventType: 'luma',
        eventTitle: 'Walk with Founders - NYC',
        eventDescription: 'Join fellow entrepreneurs for a morning walk and networking session in Central Park.',
        eventDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        eventLocation: 'Central Park, New York, NY',
        status: 'confirmed',
        rsvpDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        eventData: {
          url: 'https://lu.ma/walk-with-founders-nyc',
          organizer: 'Startup Community NYC',
          price: null,
          lat: 40.7829,
          lng: -73.9654
        }
      },
      {
        id: 'rsvp-2',
        userId: user.id,
        eventId: 'pod-activity-1',
        eventType: 'pod',
        eventTitle: 'Sunday Morning Coffee Circle',
        eventDescription: 'Meet at Hamilton Park for coffee and conversation. Bring your favorite mug and an open heart.',
        eventDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        eventLocation: 'Hamilton Park, Jersey City, NJ',
        status: 'confirmed',
        rsvpDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        eventData: {
          podName: 'Downtown JC Connectors',
          attendees: 5
        }
      }
    ];
    setUserRSVPs(mockRSVPs);
  }, [user.id]);

  useEffect(() => {
    // Generate today's unified nudge for the pod
    const nudge = generateEnhancedUnifiedNudge(pod, user);
    if (!completedNudges.has(nudge.id)) {
      setTodaysNudge(nudge);
    }
    
    // Generate solo nudge
    const solo = generateEnhancedSoloNudge(user);
    if (!completedNudges.has(solo.id)) {
      setSoloNudge(solo);
    }
    
    // Check if user has already interacted with today's nudge
    const userParticipation = nudge.participants.find(p => p.userId === user.id);
    setUserNudgeStatus(userParticipation?.status);

    // Simulate real-time notification at user's preferred time
    const checkNotificationTime = () => {
      const now = new Date();
      const [hours, minutes] = user.preferences.nudgeTime.split(':').map(Number);
      
      if (now.getHours() === hours && now.getMinutes() === minutes && !showNotification) {
        const choice: NotificationChoice = {
          id: `notification-${Date.now()}`,
          userId: user.id,
          scheduledTime: now,
          soloOption: solo,
          podOption: nudge
        };
        setNotificationChoice(choice);
        setShowNotification(true);
      }
    };

    // Check every minute for notification time
    const interval = setInterval(checkNotificationTime, 60000);
    return () => clearInterval(interval);
  }, [pod, user, showNotification, completedNudges]);

  const handleNotificationChoice = (choice: 'solo' | 'pod' | 'skip') => {
    setShowNotification(false);
    
    if (choice === 'pod') {
      setUserNudgeStatus('confirmed');
    } else if (choice === 'solo') {
      // Show solo nudge in dashboard
    }
    // In real app: API call to record choice
  };

  const startActivity = (nudgeId: string, title: string, description: string, duration: number, type: 'solo' | 'pod') => {
    const newActivity: ActiveActivity = {
      id: `active-${Date.now()}`,
      title,
      description,
      duration,
      startTime: new Date(),
      timeRemaining: duration * 60, // Convert to seconds
      isActive: true,
      type,
      originalNudgeId: nudgeId
    };

    setActiveActivity(newActivity);
    localStorage.setItem('active_activity', JSON.stringify(newActivity));

    // Send browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Activity Started! 🎉', {
        body: `"${title}" is now active. Timer set for ${duration} minutes.`,
        icon: '/favicon.ico',
        tag: 'activity-start'
      });
    }
  };

  const handleJoinNudge = (nudgeId: string) => {
    if (todaysNudge && todaysNudge.id === nudgeId) {
      setUserNudgeStatus('confirmed');
      startActivity(nudgeId, todaysNudge.title, todaysNudge.description, todaysNudge.duration, 'pod');
    }
  };

  const handleCompleteNudge = (nudgeId: string) => {
    setUserNudgeStatus('completed');
    
    // Mark as completed and remove from home page
    const newCompleted = new Set(completedNudges);
    newCompleted.add(nudgeId);
    setCompletedNudges(newCompleted);
    localStorage.setItem('completed_nudges', JSON.stringify([...newCompleted]));
    
    // Remove from home page
    if (todaysNudge?.id === nudgeId) {
      setTodaysNudge(null);
    }
    
    setShowReflection(true);
    
    // Add to activities for calendar
    const newActivity: PresenceActivity = {
      id: `activity-${Date.now()}`,
      userId: user.id,
      type: 'gathering',
      duration: 30,
      location: 'Liberty State Park',
      points: 75,
      completedAt: new Date(),
      nudgeId,
      wasWithFriends: true
    };
    setActivities(prev => [newActivity, ...prev]);

    // Clear active activity
    setActiveActivity(null);
    localStorage.removeItem('active_activity');
  };

  const handleCompleteSolo = (nudgeId: string) => {
    // Mark as completed and remove from home page
    const newCompleted = new Set(completedNudges);
    newCompleted.add(nudgeId);
    setCompletedNudges(newCompleted);
    localStorage.setItem('completed_nudges', JSON.stringify([...newCompleted]));
    
    // Remove from home page
    if (soloNudge?.id === nudgeId) {
      setSoloNudge(null);
    }
    
    setShowReflection(true);
    
    // Add to activities for calendar
    const newActivity: PresenceActivity = {
      id: `activity-${Date.now()}`,
      userId: user.id,
      type: 'solo',
      duration: 15,
      points: 30,
      completedAt: new Date(),
      nudgeId,
      wasWithFriends: false
    };
    setActivities(prev => [newActivity, ...prev]);

    // Clear active activity
    setActiveActivity(null);
    localStorage.removeItem('active_activity');
  };

  const handleStartSolo = (nudgeId: string) => {
    if (soloNudge && soloNudge.id === nudgeId) {
      startActivity(nudgeId, soloNudge.title, soloNudge.description, soloNudge.duration, 'solo');
    }
  };

  const handleVoteActivity = (activityId: string, vote: 'yes' | 'no') => {
    // In real app: API call to vote on weekly activity
    console.log(`Voted ${vote} on activity ${activityId}`);
  };

  const handleReflectionSubmit = (reflection: string) => {
    setShowReflection(false);
    
    // Update the latest activity with reflection
    setActivities(prev => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[0] = { ...updated[0], reflection };
      }
      return updated;
    });
  };

  const handleStartChat = (friendId: string) => {
    // Create or find existing chat room
    const existingChat = chatRooms.find(room => 
      room.type === 'direct' && room.participants.includes(friendId)
    );
    
    if (existingChat) {
      setActiveChatRoom(existingChat);
    } else {
      // Create new chat room
      const newChatRoom: ChatRoom = {
        id: `chat-${Date.now()}`,
        type: 'direct',
        participants: [user.id, friendId],
        messages: [],
        createdAt: new Date()
      };
      setActiveChatRoom(newChatRoom);
    }
    setActiveTab('chat');
  };

  const handleAddFriend = (userId: string) => {
    // In real app: API call to send friend request
    console.log(`Friend request sent to ${userId}`);
  };

  const handleSendMessage = (content: string) => {
    if (!activeChatRoom) return;
    
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: user.id,
      content,
      timestamp: new Date(),
      type: 'text'
    };
    
    // In real app: Send message via API
    console.log('Message sent:', newMessage);
  };

  const handleSelectActivity = (activity: ActivityTemplate) => {
    // Convert ActivityTemplate to SoloNudge and show it
    const customNudge: SoloNudge = {
      id: `custom-${Date.now()}`,
      title: activity.title,
      description: activity.description,
      type: activity.type as any,
      duration: activity.duration,
      location: activity.location === 'outdoor' ? 'Nearby outdoor space' : undefined,
      scheduledTime: new Date()
    };
    
    setSoloNudge(customNudge);
    setActiveTab('dashboard');
  };

  const handleLumaRSVP = (event: LumaEvent) => {
    // Add to user RSVPs
    const newRSVP: UserEventRSVP = {
      id: `rsvp-${Date.now()}`,
      userId: user.id,
      eventId: event.id,
      eventType: 'luma',
      eventTitle: event.title,
      eventDescription: event.description,
      eventDate: event.startTime,
      eventLocation: event.location.address,
      status: 'confirmed',
      rsvpDate: new Date(),
      eventData: {
        url: event.url,
        organizer: event.organizer.name,
        price: event.price,
        lat: event.location.lat,
        lng: event.location.lng
      }
    };
    
    setUserRSVPs(prev => [newRSVP, ...prev]);
  };

  const toggleMobileMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMobileMenu(!showMobileMenu);
  };

  const handleNavigate = (tab: string) => {
    setActiveTab(tab as any);
    setShowMobileMenu(false);
  };

  if (activeChatRoom && activeTab === 'chat') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 py-6 max-w-md">
          <ChatInterface
            chatRoom={activeChatRoom}
            currentUser={user}
            participants={pod.members}
            onSendMessage={handleSendMessage}
            onBack={() => {
              setActiveChatRoom(null);
              setActiveTab('friends');
            }}
          />
        </div>
      </div>
    );
  }

  if (activeTab === 'calendar') {
    return (
      <CalendarView
        activities={activities}
        onBack={() => setActiveTab('dashboard')}
      />
    );
  }

  if (activeTab === 'events') {
    return (
      <LumaEventsView
        onBack={() => setActiveTab('dashboard')}
        onRSVP={handleLumaRSVP}
      />
    );
  }

  if (activeTab === 'browse') {
    return (
      <ActivityBrowser
        user={user}
        onSelectActivity={handleSelectActivity}
        onBack={() => setActiveTab('dashboard')}
      />
    );
  }

  if (activeTab === 'my-events') {
    return (
      <MyEventsView
        user={user}
        onBack={() => setActiveTab('dashboard')}
      />
    );
  }

  if (activeTab === 'achievements') {
    return (
      <AchievementBadges
        user={user}
        activities={activities}
        onBack={() => setActiveTab('dashboard')}
      />
    );
  }

  if (activeTab === 'leaderboard') {
    return (
      <CommunityLeaderboard
        user={user}
        onBack={() => setActiveTab('dashboard')}
      />
    );
  }

  if (activeTab === 'challenges') {
    return (
      <MonthlyChallenges
        user={user}
        activities={activities}
        onBack={() => setActiveTab('dashboard')}
      />
    );
  }

  if (activeTab === 'scheduler') {
    return (
      <WeeklyScheduler
        user={user}
        onBack={() => setActiveTab('dashboard')}
      />
    );
  }

  if (activeTab === 'community-events') {
    return (
      <CommunityEventCreator
        user={user}
        onBack={() => setActiveTab('dashboard')}
      />
    );
  }

  if (activeTab === 'profile') {
    return (
      <ProfileScreen
        user={user}
        onUpdateProfile={() => {}}
        onLogout={() => {}}
        onBack={() => setActiveTab('dashboard')}
        subscription={subscription}
        onManageSubscription={() => setActiveTab('subscription-management')}
      />
    );
  }

  if (activeTab === 'subscription-management') {
    return (
      <SubscriptionManagement
        user={user}
        subscription={subscription}
        onUpgrade={() => setShowPaymentWall(true)}
        onBack={() => setActiveTab('profile')}
      />
    );
  }

  if (activeTab === 'admin' && user.isAdmin) {
    return (
      <AdminDashboard
        user={user}
        onBack={() => setActiveTab('dashboard')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Real-time Notification */}
      {showNotification && notificationChoice && (
        <RealTimeNotification
          notification={notificationChoice}
          onChoose={handleNotificationChoice}
          onClose={() => setShowNotification(false)}
        />
      )}

      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Header */}
        <div className="text-center mb-6 animate-slideUp">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-1 font-display">
            Welcome back, {user.firstName}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 font-body">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          {latitude && longitude && (
            <div className="flex items-center justify-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 mt-1">
              <MapPin className="w-3 h-3" />
              <span>Location enabled</span>
            </div>
          )}
          {locationError && (
            <div className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              Location access needed for better suggestions
            </div>
          )}
        </div>

        {/* Mobile Menu Button - Only on home page */}
        {activeTab === 'dashboard' && (
          <div className="fixed top-4 right-4 z-50 md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="p-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 transform hover:scale-110"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        )}

        {/* Mobile Menu */}
        {showMobileMenu && (
          <MobileMenu 
            user={user}
            isAdmin={!!user.isAdmin}
            onClose={() => setShowMobileMenu(false)}
            onNavigate={handleNavigate}
          />
        )}

        {/* Header with Theme Toggle, Profile & Admin buttons - Desktop only */}
        <div className="absolute top-4 right-4 z-10 hidden md:flex gap-2">
          <ThemeToggle />
          <button
            onClick={() => setActiveTab('profile')}
            className="p-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 transform hover:scale-110"
            aria-label="Profile settings"
          >
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          {user.isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className="p-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 transform hover:scale-110"
              aria-label="Admin dashboard"
            >
              <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </button>
          )}
        </div>
        
        {/* Subscription Banner - Only show if no active activity and banner not dismissed */}
        {subscription.isTrialActive && subscription.daysRemaining > 0 && !activeActivity && showBanner && (
          <SubscriptionBanner
            daysRemaining={subscription.daysRemaining}
            isTrialActive={subscription.isTrialActive}
            onUpgrade={() => setShowPaymentWall(true)}
            onDismiss={() => setShowBanner(false)}
          />
        )}
        
        {/* Active Activity Tracker */}
        {activeActivity && (
          <div className="mb-6 animate-scaleIn">
            <ActiveActivityTracker
              activity={activeActivity}
              onComplete={() => {
                if (activeActivity.type === 'pod') {
                  handleCompleteNudge(activeActivity.originalNudgeId);
                } else {
                  handleCompleteSolo(activeActivity.originalNudgeId);
                }
              }}
              onStop={() => {
                setActiveActivity(null);
                localStorage.removeItem('active_activity');
              }}
            />
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-1 mb-6 overflow-x-auto border border-white/20 dark:border-gray-700/20 animate-slideUp delay-100">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-medium transition-all duration-300 whitespace-nowrap text-sm ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg transform scale-105'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </button>
          <button
            onClick={() => setActiveTab('my-events')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-medium transition-all duration-300 whitespace-nowrap text-sm ${
              activeTab === 'my-events'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg transform scale-105'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Events</span>
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-medium transition-all duration-300 whitespace-nowrap text-sm ${
              activeTab === 'friends'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg transform scale-105'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Friends</span>
          </button>
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-medium transition-all duration-300 whitespace-nowrap text-sm ${
              activeTab === 'browse'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg transform scale-105'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span className="hidden sm:inline">Browse</span>
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-medium transition-all duration-300 whitespace-nowrap text-sm ${
              activeTab === 'calendar'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg transform scale-105'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Calendar</span>
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
            <div className="animate-slideUp delay-200">
              <PresenceScore 
                points={user.presencePoints}
                streak={user.streak}
                thisWeekActivities={activities.length}
              />
            </div>

            <div className="animate-slideUp delay-300">
              <PodOverview 
                pod={pod}
                onVoteActivity={handleVoteActivity}
              />
            </div>

            {/* Today's Nudges - Only show if not completed */}
            {(soloNudge || todaysNudge) && (
              <div className="mb-6 animate-slideUp delay-400">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 font-display">
                  Today's Moments
                </h2>
                
                {/* Solo Nudge */}
                {soloNudge && (
                  <div className="mb-4">
                    <SoloNudgeCard
                      nudge={soloNudge}
                      onStart={handleStartSolo}
                      onComplete={handleCompleteSolo}
                      onSkip={() => setSoloNudge(null)}
                      isActive={activeActivity?.type === 'solo' && activeActivity?.originalNudgeId === soloNudge.id}
                    />
                  </div>
                )}

                {/* Pod Nudge */}
                {todaysNudge && (
                  <UnifiedNudgeCard
                    nudge={todaysNudge}
                    onJoin={handleJoinNudge}
                    onComplete={handleCompleteNudge}
                    userStatus={userNudgeStatus}
                    isActive={activeActivity?.type === 'pod' && activeActivity?.originalNudgeId === todaysNudge.id}
                  />
                )}
              </div>
            )}

            {/* No activities message */}
            {!soloNudge && !todaysNudge && (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-8 mb-6 text-center border border-white/20 dark:border-gray-700/20 animate-slideUp delay-400">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 font-display">
                  All caught up! ✨
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 font-body">
                  You've completed today's activities. Check your calendar or browse for more.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveTab('browse')}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    Browse Activities
                  </button>
                  <button
                    onClick={() => setActiveTab('calendar')}
                    className="flex-1 bg-white/80 dark:bg-gray-700/80 text-gray-800 dark:text-white font-semibold py-3 px-6 rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-all duration-200 border border-gray-200 dark:border-gray-600"
                  >
                    View Calendar
                  </button>
                </div>
              </div>
            )}

            {/* My Events Summary */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 mb-6 border border-white/20 dark:border-gray-700/20 animate-slideUp delay-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white font-display">
                  Upcoming Events
                </h3>
                <button
                  onClick={() => setActiveTab('my-events')}
                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium transition-colors duration-200"
                >
                  View All
                </button>
              </div>
              
              {userRSVPs.filter(rsvp => rsvp.eventDate > new Date() && rsvp.status === 'confirmed').length === 0 ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  <CalendarCheck className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm font-body">No upcoming events</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userRSVPs
                    .filter(rsvp => rsvp.eventDate > new Date() && rsvp.status === 'confirmed')
                    .slice(0, 2)
                    .map(rsvp => (
                      <div key={rsvp.id} className="flex items-center justify-between p-3 bg-gray-50/80 dark:bg-gray-700/80 rounded-xl backdrop-blur-sm">
                        <div className="flex-1">
                          <div className="font-medium text-gray-800 dark:text-white text-sm">
                            {rsvp.eventTitle}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {rsvp.eventDate.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          rsvp.eventType === 'luma' 
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                        }`}>
                          {rsvp.eventType === 'luma' ? 'Luma' : 'Pod'}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Gamification Quick Access */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 mb-6 border border-white/20 dark:border-gray-700/20 animate-slideUp delay-600">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 font-display">
                Your Journey
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveTab('achievements')}
                  className="flex items-center gap-3 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-xl hover:shadow-md transition-all duration-200 transform hover:scale-105"
                >
                  <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  <div className="text-left">
                    <div className="font-medium text-gray-800 dark:text-white text-sm font-display">Achievements</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-body">View badges</div>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('leaderboard')}
                  className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-xl hover:shadow-md transition-all duration-200 transform hover:scale-105"
                >
                  <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  <div className="text-left">
                    <div className="font-medium text-gray-800 dark:text-white text-sm font-display">Leaderboard</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-body">Rank #8</div>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('challenges')}
                  className="flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl hover:shadow-md transition-all duration-200 transform hover:scale-105"
                >
                  <Target className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  <div className="text-left">
                    <div className="font-medium text-gray-800 dark:text-white text-sm font-display">Challenges</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-body">2 active</div>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('scheduler')}
                  className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-xl hover:shadow-md transition-all duration-200 transform hover:scale-105"
                >
                  <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <div className="text-left">
                    <div className="font-medium text-gray-800 dark:text-white text-sm font-display">Scheduler</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-body">Plan week</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Community Events */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 mb-6 border border-white/20 dark:border-gray-700/20 animate-slideUp delay-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white font-display">
                  Community Events
                </h3>
                <button
                  onClick={() => setActiveTab('community-events')}
                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium transition-colors duration-200"
                >
                  Create Event
                </button>
              </div>
              
              <button
                onClick={() => setActiveTab('community-events')}
                className="w-full flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-emerald-500 dark:hover:border-emerald-400 transition-colors duration-200"
              >
                <Plus className="w-6 h-6 text-gray-400" />
                <div className="text-left">
                  <div className="font-medium text-gray-800 dark:text-white font-display">Create Community Event</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-body">Organize activities for your local community</div>
                </div>
              </button>
            </div>

            {/* Neighborhood Pulse */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 mb-6 border border-white/20 dark:border-gray-700/20 animate-slideUp delay-800">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 font-display">
                Neighborhood Pulse
              </h3>
              <div className="space-y-3 font-body">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Most active time</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">6:45 PM</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">People unplugged today</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">47 nearby</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">This week's vibe</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">🚶‍♀️ Walking</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <FriendsList
            user={user}
            friends={friends}
            onStartChat={handleStartChat}
            onAddFriend={handleAddFriend}
          />
        )}

        {/* Reflection Modal */}
        {showReflection && (
          <ReflectionPrompt
            onSubmit={handleReflectionSubmit}
            onSkip={() => setShowReflection(false)}
          />
        )}
      </div>
    </div>
  );
};