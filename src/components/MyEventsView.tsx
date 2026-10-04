import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, Users, X, AlertCircle, CheckCircle, Navigation, ArrowLeft, RefreshCw } from 'lucide-react';
import { User, UserEventRSVP, UnifiedNudge } from '../types';
import { format, isAfter, isBefore, addMinutes, differenceInMinutes } from 'date-fns';

interface MyEventsViewProps {
  user: User;
  onBack: () => void;
}

export const MyEventsView: React.FC<MyEventsViewProps> = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [userRSVPs, setUserRSVPs] = useState<UserEventRSVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  // Load RSVPs from localStorage and sync with other components
  const loadRSVPs = () => {
    setLoading(true);
    
    // Load from localStorage
    const savedRSVPs = localStorage.getItem('user_rsvps');
    
    let allRSVPs: UserEventRSVP[] = [];
    
    // Load saved RSVPs
    if (savedRSVPs) {
      try {
        allRSVPs = JSON.parse(savedRSVPs).map((rsvp: any) => ({
          ...rsvp,
          eventDate: new Date(rsvp.eventDate),
          rsvpDate: new Date(rsvp.rsvpDate)
        }));
      } catch (error) {
        console.error('Error loading RSVPs:', error);
      }
    }
    
    // Add mock pod activities if none exist
    if (allRSVPs.length === 0) {
      allRSVPs = [
        {
          id: 'rsvp-pod-1',
          userId: user.id,
          eventId: 'pod-activity-1',
          eventType: 'pod',
          eventTitle: 'Sunday Morning Coffee Circle',
          eventDescription: 'Meet at Hamilton Park for coffee and conversation. Bring your favorite mug and an open heart.',
          eventDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          eventLocation: 'Hamilton Park, Jersey City, NJ',
          status: 'confirmed',
          rsvpDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          eventData: {
            podName: 'Downtown JC Connectors',
            attendees: 5
          }
        },
        {
          id: 'rsvp-pod-2',
          userId: user.id,
          eventId: 'pod-activity-2',
          eventType: 'pod',
          eventTitle: 'Evening Mindful Walk',
          eventDescription: 'Join us for a peaceful walk through Liberty State Park as the sun sets.',
          eventDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          eventLocation: 'Liberty State Park, Jersey City, NJ',
          status: 'confirmed',
          rsvpDate: new Date(),
          eventData: {
            podName: 'Downtown JC Connectors',
            attendees: 8
          }
        }
      ];
    }
    
    setUserRSVPs(allRSVPs);
    // Save back to localStorage to sync
    localStorage.setItem('user_rsvps', JSON.stringify(allRSVPs));
    setLastSync(new Date());
    setLoading(false);
  };

  useEffect(() => {
    loadRSVPs();

    // Listen for storage changes to sync across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user_rsvps') {
        loadRSVPs();
      }
    };

    // Listen for custom events from other components
    const handleRSVPUpdate = () => {
      loadRSVPs();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('rsvp-updated', handleRSVPUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('rsvp-updated', handleRSVPUpdate);
    };
  }, [user.id]);

  const handleCancelRSVP = (rsvpId: string) => {
    const rsvp = userRSVPs.find(r => r.id === rsvpId);
    if (!rsvp) return;

    const confirmCancel = window.confirm(
      `Are you sure you want to cancel your RSVP for "${rsvp.eventTitle}"?`
    );

    if (confirmCancel) {
      const updatedRSVPs = userRSVPs.map(r => 
        r.id === rsvpId 
          ? { ...r, status: 'cancelled' as const }
          : r
      );
      
      setUserRSVPs(updatedRSVPs);
      localStorage.setItem('user_rsvps', JSON.stringify(updatedRSVPs));

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('rsvp-updated'));

      alert('RSVP cancelled successfully. You can always RSVP again later.');
    }
  };

  const handleGetDirections = (rsvp: UserEventRSVP) => {
    const { eventData } = rsvp;
    
    if (eventData?.lat && eventData?.lng) {
      // Use Apple Maps on iOS, Google Maps otherwise
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (isIOS) {
        window.open(`maps://maps.google.com/maps?daddr=${eventData.lat},${eventData.lng}&ll=`);
      } else {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${eventData.lat},${eventData.lng}`);
      }
    } else {
      // Fallback to address search
      const query = encodeURIComponent(rsvp.eventLocation);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`);
    }
  };

  const getTimeUntilEvent = (eventDate: Date): string => {
    const now = new Date();
    const minutesUntil = differenceInMinutes(eventDate, now);
    
    if (minutesUntil < 0) return 'Event has passed';
    if (minutesUntil < 60) return `${minutesUntil} minutes`;
    if (minutesUntil < 1440) return `${Math.floor(minutesUntil / 60)} hours`;
    return `${Math.floor(minutesUntil / 1440)} days`;
  };

  const getEventStatus = (rsvp: UserEventRSVP): { color: string; text: string; icon: React.ReactNode } => {
    if (rsvp.status === 'cancelled') {
      return {
        color: 'text-red-600 dark:text-red-400',
        text: 'Cancelled',
        icon: <X className="w-4 h-4" />
      };
    }

    const now = new Date();
    const eventDate = rsvp.eventDate;
    const minutesUntil = differenceInMinutes(eventDate, now);

    if (minutesUntil < 0) {
      return {
        color: 'text-gray-600 dark:text-gray-400',
        text: 'Completed',
        icon: <CheckCircle className="w-4 h-4" />
      };
    }

    if (minutesUntil <= 30) {
      return {
        color: 'text-orange-600 dark:text-orange-400',
        text: 'Starting Soon',
        icon: <AlertCircle className="w-4 h-4" />
      };
    }

    return {
      color: 'text-emerald-600 dark:text-emerald-400',
      text: 'Confirmed',
      icon: <CheckCircle className="w-4 h-4" />
    };
  };

  const upcomingEvents = userRSVPs.filter(rsvp => 
    isAfter(rsvp.eventDate, new Date()) && rsvp.status === 'confirmed'
  ).sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());

  const pastEvents = userRSVPs.filter(rsvp => 
    isBefore(rsvp.eventDate, new Date()) || rsvp.status === 'cancelled'
  ).sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime());

  const eventsToShow = activeTab === 'upcoming' ? upcomingEvents : pastEvents;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">Loading your events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2 font-display">
            <Calendar className="w-6 h-6" />
            My Events
          </h1>
          <button
            onClick={loadRSVPs}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors duration-200"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Sync Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400 font-body">
              Last synced: {format(lastSync, 'MMM d, h:mm a')}
            </div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-body">Events synced</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-1 mb-6">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
              activeTab === 'upcoming'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
            }`}
          >
            Upcoming ({upcomingEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
              activeTab === 'past'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
            }`}
          >
            Past ({pastEvents.length})
          </button>
        </div>

        {/* Events List */}
        {eventsToShow.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 font-body">
              {activeTab === 'upcoming' ? 'No upcoming events' : 'No past events'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 font-body">
              {activeTab === 'upcoming' 
                ? 'RSVP to pod or community activities to see them here'
                : 'Your completed and cancelled events will appear here'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {eventsToShow.map(rsvp => {
              const status = getEventStatus(rsvp);
              const timeUntil = getTimeUntilEvent(rsvp.eventDate);
              
              return (
                <div
                  key={rsvp.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white font-display">
                          {rsvp.eventTitle}
                        </h3>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          rsvp.eventType === 'community' 
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                        }`}>
                          {rsvp.eventType === 'community' ? '🌐 Community' : '👥 Pod'}
                        </div>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 mb-3 font-body">
                        {rsvp.eventDescription}
                      </p>
                    </div>
                    
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${status.color} bg-opacity-10`}>
                      {status.icon}
                      {status.text}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <div>
                        <div className="font-medium font-body">{format(rsvp.eventDate, 'MMM d, yyyy')}</div>
                        <div className="text-sm font-body">{format(rsvp.eventDate, 'h:mm a')}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate font-body">{rsvp.eventLocation}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Users className="w-4 h-4" />
                      <span className="font-body">
                        {rsvp.eventType === 'pod' 
                          ? `${rsvp.eventData?.attendees || 'Multiple'} attendees`
                          : 'Community event'
                        }
                      </span>
                    </div>
                  </div>

                  {activeTab === 'upcoming' && rsvp.status === 'confirmed' && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-emerald-800 dark:text-emerald-300 font-display">
                            {timeUntil === 'Event has passed' ? 'Event starting soon' : `Starts in ${timeUntil}`}
                          </div>
                          <div className="text-sm text-emerald-600 dark:text-emerald-400 font-body">
                            RSVP'd on {format(rsvp.rsvpDate, 'MMM d, yyyy')}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleGetDirections(rsvp)}
                            className="flex items-center gap-1 px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors duration-200 text-sm"
                          >
                            <Navigation className="w-4 h-4" />
                            Directions
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-body">
                      {rsvp.eventType === 'community' ? (
                        <span>Organized by {rsvp.eventData?.organizer}</span>
                      ) : (
                        <span>Pod: {rsvp.eventData?.podName}</span>
                      )}
                    </div>
                    
                    {activeTab === 'upcoming' && rsvp.status === 'confirmed' && (
                      <button
                        onClick={() => handleCancelRSVP(rsvp.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium transition-colors duration-200"
                      >
                        Cancel RSVP
                      </button>
                    )}
                    
                    {rsvp.status === 'cancelled' && (
                      <span className="text-red-600 dark:text-red-400 text-sm font-medium">
                        Cancelled on {format(new Date(), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};