import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, MapPin, Users, ExternalLink, Clock, DollarSign, Search, Filter, ChevronDown, Loader2, ArrowLeft, Share2, Heart, Navigation } from 'lucide-react';
import { LumaEvent, LumaAPI } from '../utils/lumaIntegration';
import { useGeolocation } from '../hooks/useGeolocation';
import { format } from 'date-fns';

interface LumaEventsViewProps {
  onBack: () => void;
  onRSVP?: (event: LumaEvent) => void;
}

export const LumaEventsView: React.FC<LumaEventsViewProps> = ({ onBack, onRSVP }) => {
  const [events, setEvents] = useState<LumaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);
  const [userRSVPs, setUserRSVPs] = useState<Set<string>>(new Set());
  const { latitude, longitude } = useGeolocation();

  const allTags = [
    'networking', 'walking', 'founders', 'investors', 'lunch', 'meditation', 
    'wellness', 'morning', 'tech', 'coffee', 'yoga', 'sunset', 'outdoor',
    'creative', 'writing', 'workshop', 'photography', 'startup', 'pitch',
    'volunteering', 'community', 'gardening', 'music', 'jazz', 'nightlife',
    'fitness', 'running', 'cooking', 'food', 'italian', 'indoor'
  ];

  // Load user RSVPs from localStorage
  useEffect(() => {
    const savedRSVPs = localStorage.getItem('luma_rsvps');
    if (savedRSVPs) {
      try {
        const rsvpData = JSON.parse(savedRSVPs);
        setUserRSVPs(new Set(rsvpData));
      } catch (error) {
        console.error('Error loading RSVPs:', error);
      }
    }
  }, []);

  const fetchEvents = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const params: any = {
        page: pageNum,
        limit: 6
      };
      
      if (latitude && longitude) {
        params.location = {
          lat: latitude,
          lng: longitude,
          radius: 50 // 50km radius
        };
      }
      
      if (selectedTags.length > 0) {
        params.tags = selectedTags;
      }
      
      const result = await LumaAPI.getEvents(params);
      
      if (append) {
        setEvents(prev => [...prev, ...result.events]);
      } else {
        setEvents(result.events);
      }
      
      setHasMore(result.hasMore);
      setTotalEvents(result.total);
    } catch (error) {
      console.error('Error fetching Luma events:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [latitude, longitude, selectedTags]);

  useEffect(() => {
    setPage(1);
    fetchEvents(1, false);
  }, [fetchEvents]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => {
      const newTags = prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag];
      return newTags;
    });
    setPage(1);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEvents(nextPage, true);
  };

  const handleEventClick = (event: LumaEvent, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Open Luma event in new tab
    window.open(event.url, '_blank', 'noopener,noreferrer');
  };

  const handleRSVP = (event: LumaEvent, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (userRSVPs.has(event.id)) {
      // Cancel RSVP
      const confirmCancel = window.confirm(`Cancel your RSVP for "${event.title}"?`);
      if (confirmCancel) {
        const newRSVPs = new Set(userRSVPs);
        newRSVPs.delete(event.id);
        setUserRSVPs(newRSVPs);
        localStorage.setItem('luma_rsvps', JSON.stringify([...newRSVPs]));
        
        // Call parent callback if provided
        if (onRSVP) {
          onRSVP(event);
        }
        
        alert('RSVP cancelled. You can always RSVP again later.');
      }
    } else {
      // Add RSVP and redirect to Luma
      const newRSVPs = new Set(userRSVPs);
      newRSVPs.add(event.id);
      setUserRSVPs(newRSVPs);
      localStorage.setItem('luma_rsvps', JSON.stringify([...newRSVPs]));
      
      // Call parent callback if provided
      if (onRSVP) {
        onRSVP(event);
      }
      
      // Show notification about redirect
      alert(`You'll be redirected to Luma to complete your RSVP for "${event.title}". We'll track your attendance for notifications.`);
      
      // Open Luma event for RSVP
      window.open(event.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleGetDirections = (event: LumaEvent, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (event.location.lat && event.location.lng) {
      // Use Apple Maps on iOS, Google Maps otherwise
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (isIOS) {
        window.open(`maps://maps.google.com/maps?daddr=${event.location.lat},${event.location.lng}&ll=`);
      } else {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${event.location.lat},${event.location.lng}`);
      }
    } else {
      // Fallback to address search
      const query = encodeURIComponent(event.location.address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`);
    }
  };

  const handleShare = (event: LumaEvent, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const shareData = {
      title: event.title,
      text: event.description,
      url: event.url
    };
    
    // Check if Web Share API is available and can share the data
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      navigator.share(shareData).catch((error) => {
        console.error('Error sharing:', error);
        // Fallback to clipboard if share fails
        navigator.clipboard.writeText(`Check out this event: ${event.title} - ${event.url}`);
        alert('Event link copied to clipboard!');
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`Check out this event: ${event.title} - ${event.url}`);
      alert('Event link copied to clipboard!');
    }
  };

  const filteredEvents = events.filter(event => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      event.title.toLowerCase().includes(query) ||
      event.description.toLowerCase().includes(query) ||
      event.location.name.toLowerCase().includes(query) ||
      event.organizer.name.toLowerCase().includes(query) ||
      event.tags.some(tag => tag.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Luma Events
          </h1>
          <div className="w-20"></div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, locations, organizers..."
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-800 dark:text-white"
          />
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Filter Events
            </h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
            >
              <Filter className="w-4 h-4" />
              <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Results Summary */}
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {loading ? 'Loading events...' : `${totalEvents} events found`}
            {selectedTags.length > 0 && (
              <span className="ml-2">
                • Filtered by: {selectedTags.join(', ')}
              </span>
            )}
          </div>

          {showFilters && (
            <div className="space-y-4">
              {/* Selected Tags */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Selected:</span>
                  {selectedTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className="px-3 py-1 bg-emerald-500 text-white rounded-full text-sm font-medium hover:bg-emerald-600 transition-colors duration-200"
                    >
                      {tag} ×
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedTags([])}
                    className="px-3 py-1 bg-gray-500 text-white rounded-full text-sm font-medium hover:bg-gray-600 transition-colors duration-200"
                  >
                    Clear All
                  </button>
                </div>
              )}

              {/* Tag Filters */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filter by Interest
                </h3>
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                        selectedTags.includes(tag)
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Events List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
            <p className="text-gray-600 dark:text-gray-400">Loading events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No events found</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map(event => {
              const isRSVPd = userRSVPs.has(event.id);
              
              return (
                <div
                  key={event.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {event.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                        {event.description}
                      </p>
                    </div>
                    
                    {isRSVPd && (
                      <div className="flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-medium ml-4">
                        ✓ RSVP'd
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{format(event.startTime, 'MMM d, h:mm a')}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{event.location.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Users className="w-4 h-4" />
                      <span>
                        {event.attendeeCount}
                        {event.maxAttendees && ` / ${event.maxAttendees}`} attending
                      </span>
                    </div>
                    
                    {event.price ? (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <DollarSign className="w-4 h-4" />
                        <span>${event.price}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <span className="text-sm font-medium">Free Event</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-wrap gap-2">
                      {event.tags.slice(0, 4).map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                      {event.tags.length > 4 && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium">
                          +{event.tags.length - 4} more
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <span>{event.organizer.avatar}</span>
                      <span className="truncate max-w-32">{event.organizer.name}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => handleRSVP(event, e)}
                      className={`flex-1 font-semibold py-3 px-6 rounded-xl transition-colors duration-200 ${
                        isRSVPd
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-emerald-500 text-white hover:bg-emerald-600'
                      }`}
                    >
                      {isRSVPd ? 'Cancel RSVP' : 'RSVP on Luma'}
                    </button>
                    
                    <button
                      onClick={(e) => handleEventClick(event, e)}
                      className="px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors duration-200"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={(e) => handleGetDirections(event, e)}
                      className="px-4 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors duration-200"
                    >
                      <Navigation className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={(e) => handleShare(event, e)}
                      className="px-4 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors duration-200"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Load More Button */}
            {hasMore && !loading && (
              <div className="text-center py-6">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2 mx-auto"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More Events'
                  )}
                </button>
              </div>
            )}

            {/* End of Results */}
            {!hasMore && events.length > 0 && (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <p>You've reached the end of the events list</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};