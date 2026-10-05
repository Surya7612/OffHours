import React, { useState, useEffect } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { WelcomeScreen } from './components/WelcomeScreen';
import { MainDashboard } from './components/MainDashboard';
import { ProfileScreen } from './components/ProfileScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { PodSelector } from './components/PodSelector';
import { PaymentWall } from './components/PaymentWall';
import { SubscriptionBanner } from './components/SubscriptionBanner';
import { ThemeToggle } from './components/ThemeToggle';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { ThemeProvider } from './contexts/ThemeContext';
import { User, Pod, AuthState } from './types';
import { createMockUser, createAllMockPods } from './utils/mockData';
import { 
  encryptData, 
  decryptData, 
  sanitizeInput, 
  validateEmail, 
  validatePassword,
  SecureStorage,
  SessionManager,
  SecurityAudit,
  initializeSecurity
} from './utils/security';
import { RealTimeNotificationService } from './utils/realTimeNotifications';
import { webNotifications } from './utils/webNotifications';
import { initializeEngagementFeatures, EngagementFeatures } from './utils/engagementFeatures';
import { useSubscription } from './hooks/useSubscription';
import { Settings, Shield } from 'lucide-react';

type AppState = 'auth' | 'welcome' | 'pod-selection' | 'dashboard' | 'profile' | 'admin';

function App() {
  const [state, setState] = useState<AppState>('auth');
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: false
  });
  const [pod, setPod] = useState<Pod | null>(null);
  const [availablePods, setAvailablePods] = useState<Pod[]>([]);
  const [showPaymentWall, setShowPaymentWall] = useState(false);

  // Subscription management
  const subscription = useSubscription(authState.user?.id || null);

  // Initialize security and engagement features on app start
  useEffect(() => {
    initializeSecurity();
    
    // Initialize web notifications
    webNotifications.initialize().then(enabled => {
      if (enabled) {
        console.log('🔔 Web notifications enabled - users will get native-like notifications!');
      }
    });
  }, []);

  // Initialize engagement features when user logs in
  useEffect(() => {
    if (authState.user) {
      initializeEngagementFeatures(authState.user.id);
      
      // Schedule daily nudge at user's preferred time
      const [hours, minutes] = authState.user.preferences.nudgeTime.split(':').map(Number);
      const nudgeTime = new Date();
      nudgeTime.setHours(hours, minutes, 0, 0);
      
      if (nudgeTime > new Date()) {
        webNotifications.scheduleNotification(
          'Time for your OffHours moment! 🌟',
          `${authState.user.firstName}, ready to disconnect and reconnect?`,
          nudgeTime,
          { action: 'view_activity' }
        );
      }
    }
  }, [authState.user]);

  // Check subscription access and show payment wall if needed
  useEffect(() => {
    if (authState.user && !subscription.loading) {
      // Show payment wall if trial expired and no active subscription
      if (!subscription.hasAccess && !subscription.isTrialActive) {
        setShowPaymentWall(true);
      }
    }
  }, [authState.user, subscription]);

  // Initialize real-time notifications
  useEffect(() => {
    const initializeNotifications = async () => {
      const hasPermission = await RealTimeNotificationService.requestNotificationPermission();
      if (hasPermission) {
        console.log('Notification permission granted');
      }
    };

    initializeNotifications();
  }, []);

  // Connect to real-time notifications when user is authenticated
  useEffect(() => {
    if (authState.user) {
      const notificationService = RealTimeNotificationService.getInstance();
      notificationService.connect(authState.user.id);

      // Listen for notifications
      const handleNotification = (notification: any) => {
        console.log('Received notification:', notification);
        // Handle notification in UI
      };

      notificationService.on('notification', handleNotification);

      return () => {
        notificationService.off('notification', handleNotification);
        notificationService.disconnect();
      };
    }
  }, [authState.user]);

  // Helper function to rehydrate pod data with proper Date objects
  const rehydratePodData = (podData: any): Pod => {
    return {
      ...podData,
      weeklyActivity: {
        ...podData.weeklyActivity,
        scheduledDate: new Date(podData.weeklyActivity.scheduledDate)
      }
    };
  };

  // Check for existing session on app load
  useEffect(() => {
    const savedUser = SecureStorage.getItem('offhours_user');
    if (savedUser && SessionManager.validateSession()) {
      try {
        const user = JSON.parse(savedUser);
        setAuthState({
          isAuthenticated: true,
          user,
          isLoading: false
        });
        
        if (user.profileComplete) {
          const savedPod = SecureStorage.getItem('offhours_pod');
          if (savedPod) {
            const podData = JSON.parse(savedPod);
            const rehydratedPod = rehydratePodData(podData);
            setPod(rehydratedPod);
            setState('dashboard');
          } else {
            // User needs to select a pod
            const pods = createAllMockPods(user.location.city);
            setAvailablePods(pods);
            setState('pod-selection');
          }
        } else {
          setState('welcome');
        }
        
        SecurityAudit.log('user_session_restored', { userId: user.id });
      } catch (error) {
        console.error('Error loading saved user:', error);
        SecurityAudit.log('session_restore_failed', { error: error.message });
        SecureStorage.removeItem('offhours_user');
        SecureStorage.removeItem('offhours_pod');
        SessionManager.destroySession();
      }
    }
  }, []);

  const handleLogin = async (email: string, password: string) => {
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPassword = sanitizeInput(password);
    
    // Validate email
    if (!validateEmail(sanitizedEmail)) {
      alert('Please enter a valid email address');
      SecurityAudit.log('login_failed', { reason: 'invalid_email', email: sanitizedEmail });
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(sanitizedPassword);
    if (!passwordValidation.isValid) {
      alert('Password does not meet security requirements:\n' + passwordValidation.errors.join('\n'));
      SecurityAudit.log('login_failed', { reason: 'weak_password', email: sanitizedEmail });
      return;
    }

    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    // Simulate API call with security delay
    setTimeout(() => {
      if (sanitizedEmail && sanitizedPassword) {
        const mockUser: User = {
          id: 'user-1',
          firstName: 'Demo',
          lastName: 'User',
          email: sanitizedEmail,
          avatar: '🌟',
          location: {
            lat: 40.7178,
            lng: -74.0431,
            neighborhood: 'Downtown JC',
            city: 'Jersey City'
          },
          preferences: {
            nudgeTime: '18:00',
            energyLevel: 'medium',
            interests: ['walking', 'nature'],
            allowSoloNudges: true,
            allowPodNudges: true,
            proximityRadius: 2
          },
          presencePoints: 340,
          streak: 7,
          joinedAt: new Date(),
          friends: [],
          isAdmin: sanitizedEmail === 'admin@offhours.app',
          profileComplete: true
        };

        setAuthState({
          isAuthenticated: true,
          user: mockUser,
          isLoading: false
        });

        // Create secure session
        SessionManager.createSession(mockUser.id);

        // Encrypt and store user data
        SecureStorage.setItem('offhours_user', JSON.stringify(mockUser));
        
        if (mockUser.profileComplete) {
          // Check if user has a saved pod
          const savedPod = SecureStorage.getItem('offhours_pod');
          if (savedPod) {
            const podData = JSON.parse(savedPod);
            const rehydratedPod = rehydratePodData(podData);
            setPod(rehydratedPod);
            setState('dashboard');
          } else {
            // User needs to select a pod
            const pods = createAllMockPods(mockUser.location.city);
            setAvailablePods(pods);
            setState('pod-selection');
          }
        } else {
          setState('welcome');
        }

        // Send welcome notification
        setTimeout(() => {
          webNotifications.sendNotification('Welcome to OffHours! 🎉', {
            body: `${mockUser.firstName}, you're all set! Your first activity suggestion is ready.`,
            tag: 'welcome',
            data: { action: 'view_activity' }
          });
        }, 2000);

        SecurityAudit.log('user_login_success', { userId: mockUser.id, email: sanitizedEmail });
      } else {
        setAuthState(prev => ({ 
          ...prev, 
          isLoading: false 
        }));
        SecurityAudit.log('login_failed', { reason: 'invalid_credentials' });
      }
    }, 1000);
  };

  const handleRegister = async (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => {
    // Sanitize all inputs
    const sanitizedData = {
      firstName: sanitizeInput(userData.firstName),
      lastName: sanitizeInput(userData.lastName),
      email: sanitizeInput(userData.email),
      password: sanitizeInput(userData.password)
    };

    // Validate email
    if (!validateEmail(sanitizedData.email)) {
      alert('Please enter a valid email address');
      SecurityAudit.log('registration_failed', { reason: 'invalid_email', email: sanitizedData.email });
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(sanitizedData.password);
    if (!passwordValidation.isValid) {
      alert('Password does not meet security requirements:\n' + passwordValidation.errors.join('\n'));
      SecurityAudit.log('registration_failed', { reason: 'weak_password', email: sanitizedData.email });
      return;
    }

    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    // Simulate API call
    setTimeout(() => {
      const newUser: User = {
        id: `user-${Date.now()}`,
        firstName: sanitizedData.firstName,
        lastName: sanitizedData.lastName,
        email: sanitizedData.email,
        avatar: '🌟',
        location: {
          lat: 40.7178,
          lng: -74.0431,
          neighborhood: 'Downtown JC',
          city: 'Jersey City'
        },
        preferences: {
          nudgeTime: '18:00',
          energyLevel: 'medium',
          interests: [],
          allowSoloNudges: true,
          allowPodNudges: true,
          proximityRadius: 2
        },
        presencePoints: 0,
        streak: 0,
        joinedAt: new Date(),
        friends: [],
        isAdmin: false,
        profileComplete: false
      };

      setAuthState({
        isAuthenticated: true,
        user: newUser,
        isLoading: false
      });

      // Create secure session
      SessionManager.createSession(newUser.id);

      // Encrypt and store user data
      SecureStorage.setItem('offhours_user', JSON.stringify(newUser));
      setState('welcome');

      SecurityAudit.log('user_registration_success', { userId: newUser.id, email: sanitizedData.email });
    }, 1000);
  };

  const handleWelcomeComplete = (userData: {
    firstName: string;
    location: string;
    nudgeTime: string;
    interests: string[];
    proximityRadius: number;
  }) => {
    if (!authState.user) return;

    const sanitizedData = {
      firstName: sanitizeInput(userData.firstName),
      location: sanitizeInput(userData.location),
      nudgeTime: sanitizeInput(userData.nudgeTime),
      interests: userData.interests.map(interest => sanitizeInput(interest)),
      proximityRadius: userData.proximityRadius
    };

    const updatedUser: User = {
      ...authState.user,
      firstName: sanitizedData.firstName,
      location: {
        ...authState.user.location,
        city: sanitizedData.location,
        neighborhood: getNeighborhood(sanitizedData.location)
      },
      preferences: {
        ...authState.user.preferences,
        nudgeTime: sanitizedData.nudgeTime,
        interests: sanitizedData.interests,
        proximityRadius: sanitizedData.proximityRadius
      },
      profileComplete: true
    };

    setAuthState(prev => ({ ...prev, user: updatedUser }));
    
    // Encrypt and store data
    SecureStorage.setItem('offhours_user', JSON.stringify(updatedUser));

    // Show pod selection
    const pods = createAllMockPods(sanitizedData.location);
    setAvailablePods(pods);
    setState('pod-selection');

    SecurityAudit.log('profile_completed', { userId: updatedUser.id });
  };

  const handlePodSelection = (selectedPod: Pod) => {
    setPod(selectedPod);
    SecureStorage.setItem('offhours_pod', JSON.stringify(selectedPod));
    setState('dashboard');

    // Send pod welcome notification
    setTimeout(() => {
      webNotifications.sendNotification('Pod Joined! 👥', {
        body: `Welcome to ${selectedPod.name}! Your community is ready to connect.`,
        tag: 'pod-joined',
        data: { action: 'view_activity' }
      });
    }, 1000);
  };

  const handleUpdateProfile = (updates: Partial<User>) => {
    if (!authState.user) return;

    const updatedUser = { ...authState.user, ...updates };
    setAuthState(prev => ({ ...prev, user: updatedUser }));
    
    // Encrypt and store updated data
    SecureStorage.setItem('offhours_user', JSON.stringify(updatedUser));
    SecurityAudit.log('profile_updated', { userId: updatedUser.id });
  };

  const handleLogout = () => {
    SecurityAudit.log('user_logout', { userId: authState.user?.id });
    
    setAuthState({
      isAuthenticated: false,
      user: null,
      isLoading: false
    });
    setPod(null);
    
    // Clear all stored data and session
    SecureStorage.removeItem('offhours_user');
    SecureStorage.removeItem('offhours_pod');
    SessionManager.destroySession();
    setState('auth');
  };

  const handleSubscribe = async (plan: 'monthly' | 'yearly', couponCode?: string) => {
    if (!authState.user) return;

    try {
      const result = await subscription.purchaseSubscription(
        plan === 'monthly' ? 'monthly_plan' : 'yearly_plan',
        couponCode
      );

      if (result.success) {
        setShowPaymentWall(false);
        
        // Show success notification
        webNotifications.sendNotification('Welcome to OffHours Pro! 🎉', {
          body: 'Your subscription is now active. Enjoy unlimited access to all features!',
          tag: 'subscription-success',
          requireInteraction: true
        });
        
        // Check for achievements
        if (authState.user) {
          EngagementFeatures.checkAchievements(authState.user.id, {
            type: 'subscription',
            plan,
            completedAt: new Date()
          });
        }
      } else {
        alert('Subscription failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Subscription failed. Please try again.');
    }
  };

  const getNeighborhood = (location: string): string => {
    const neighborhoods: Record<string, string> = {
      'jersey-city': 'Downtown JC',
      'manhattan': 'Lower Manhattan',
      'brooklyn': 'Park Slope',
      'queens': 'Astoria',
      'bronx': 'South Bronx'
    };
    return neighborhoods[location] || 'Downtown';
  };

  // Show loading state
  if (authState.isLoading || subscription.loading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="text-2xl">🌟</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Payment Wall */}
      {showPaymentWall && authState.user && (
        <PaymentWall
          user={authState.user}
          onSubscribe={handleSubscribe}
          onClose={() => setShowPaymentWall(false)}
          showTrialExpired={!subscription.isTrialActive && !subscription.hasAccess}
        />
      )}

      {/* Auth Screen */}
      {state === 'auth' && (
        <AuthScreen
          onLogin={handleLogin}
          onRegister={handleRegister}
          isLoading={authState.isLoading}
        />
      )}
      
      {/* Welcome/Onboarding Screen */}
      {state === 'welcome' && authState.user && (
        <WelcomeScreen onComplete={handleWelcomeComplete} />
      )}

      {/* Pod Selection Screen */}
      {state === 'pod-selection' && authState.user && (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                Welcome to OffHours! 🎉
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Choose a local pod to join group activities and connect with your community.
              </p>
            </div>
            
            <PodSelector
              userLocation={authState.user.location.city}
              onSelectPod={handlePodSelection}
            />
          </div>
        </div>
      )}
      
      {/* Main Dashboard */}
      {state === 'dashboard' && authState.user && pod && (
        <div className="relative">
          <MainDashboard 
            user={authState.user} 
            pod={pod} 
            subscription={subscription}
            setShowPaymentWall={setShowPaymentWall}
          />
        </div>
      )}

      {/* Profile Screen */}
      {state === 'profile' && authState.user && (
        <ProfileScreen
          user={authState.user}
          onUpdateProfile={handleUpdateProfile}
          onLogout={handleLogout}
          onBack={() => setState('dashboard')}
          subscription={subscription}
          onManageSubscription={() => setShowPaymentWall(true)}
        />
      )}

      {/* Admin Dashboard */}
      {state === 'admin' && authState.user?.isAdmin && (
        <AdminDashboard
          user={authState.user}
          onBack={() => setState('dashboard')}
        />
      )}
    </ThemeProvider>
  );
}

export default App;