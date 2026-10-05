import React, { useState } from 'react';
import { Plus, MapPin, Clock, Users, Share2, QrCode, MessageCircle, Calendar, X, Search } from 'lucide-react';
import { User } from '../types';
import { format, addDays } from 'date-fns';

interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  date: Date;
  time: string;
  location: string;
  maxAttendees?: number;
  tags: string[];
  createdBy: string;
  shareableLink: string;
  qrCode: string;
}

interface LocationSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface CommunityEventCreatorProps {
  user: User;
  onBack: () => void;
}

export const CommunityEventCreator: React.FC<CommunityEventCreatorProps> = ({ user, onBack }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createdEvents, setCreatedEvents] = useState<CommunityEvent[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    time: '18:00',
    location: '',
    maxAttendees: '',
    tags: [] as string[]
  });

  const suggestedTags = [
    'walking', 'coffee', 'meditation', 'art', 'music', 'food', 'nature',
    'fitness', 'reading', 'photography', 'volunteering', 'learning',
    'networking', 'creative', 'mindful', 'social', 'outdoor', 'indoor'
  ];

  // Mock location search - in production, use Google Places API
  const searchLocations = async (query: string) => {
    if (query.length < 3) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }

    // Mock location suggestions
    const mockSuggestions: LocationSuggestion[] = [
      {
        place_id: '1',
        description: `${query} - Central Park, New York, NY`,
        structured_formatting: {
          main_text: 'Central Park',
          secondary_text: 'New York, NY, USA'
        }
      },
      {
        place_id: '2',
        description: `${query} - Bryant Park, New York, NY`,
        structured_formatting: {
          main_text: 'Bryant Park',
          secondary_text: 'New York, NY, USA'
        }
      },
      {
        place_id: '3',
        description: `${query} - Hamilton Park, Jersey City, NJ`,
        structured_formatting: {
          main_text: 'Hamilton Park',
          secondary_text: 'Jersey City, NJ, USA'
        }
      },
      {
        place_id: '4',
        description: `${query} - Liberty State Park, Jersey City, NJ`,
        structured_formatting: {
          main_text: 'Liberty State Park',
          secondary_text: 'Jersey City, NJ, USA'
        }
      },
      {
        place_id: '5',
        description: `${query} - Washington Square Park, New York, NY`,
        structured_formatting: {
          main_text: 'Washington Square Park',
          secondary_text: 'New York, NY, USA'
        }
      }
    ].filter(suggestion => 
      suggestion.structured_formatting.main_text.toLowerCase().includes(query.toLowerCase()) ||
      suggestion.structured_formatting.secondary_text.toLowerCase().includes(query.toLowerCase())
    );

    setLocationSuggestions(mockSuggestions);
    setShowLocationSuggestions(true);
  };

  const handleLocationChange = (value: string) => {
    setFormData(prev => ({ ...prev, location: value }));
    searchLocations(value);
  };

  const handleLocationSelect = (suggestion: LocationSuggestion) => {
    setFormData(prev => ({ ...prev, location: suggestion.description }));
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
  };

  const generateQRCode = (text: string): string => {
    // Use a working QR code service
    const encodedText = encodeURIComponent(text);
    
    // Try multiple QR code services as fallbacks
    const qrServices = [
      `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedText}`,
      `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodedText}`,
      // SVG fallback
      `data:image/svg+xml;base64,${btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
          <rect width="200" height="200" fill="white" stroke="black" stroke-width="2"/>
          <rect x="20" y="20" width="20" height="20" fill="black"/>
          <rect x="60" y="20" width="20" height="20" fill="black"/>
          <rect x="100" y="20" width="20" height="20" fill="black"/>
          <rect x="140" y="20" width="20" height="20" fill="black"/>
          <rect x="20" y="60" width="20" height="20" fill="black"/>
          <rect x="140" y="60" width="20" height="20" fill="black"/>
          <rect x="20" y="100" width="20" height="20" fill="black"/>
          <rect x="60" y="100" width="20" height="20" fill="black"/>
          <rect x="100" y="100" width="20" height="20" fill="black"/>
          <rect x="140" y="100" width="20" height="20" fill="black"/>
          <rect x="20" y="140" width="20" height="20" fill="black"/>
          <rect x="60" y="140" width="20" height="20" fill="black"/>
          <rect x="100" y="140" width="20" height="20" fill="black"/>
          <rect x="140" y="140" width="20" height="20" fill="black"/>
          <text x="100" y="190" text-anchor="middle" font-size="12" fill="black">QR Code</text>
        </svg>
      `)}`
    ];
    
    return qrServices[0]; // Use the first service
  };

  const handleCreateEvent = () => {
    if (!formData.title || !formData.description || !formData.location) {
      alert('Please fill in all required fields');
      return;
    }

    const eventDate = new Date(`${formData.date}T${formData.time}`);
    const eventId = `event-${Date.now()}`;
    const shareableLink = `https://offhours.app/events/${eventId}`;
    
    // Generate QR code using working service
    const qrCodeUrl = generateQRCode(shareableLink);
    
    const newEvent: CommunityEvent = {
      id: eventId,
      title: formData.title,
      description: formData.description,
      date: eventDate,
      time: formData.time,
      location: formData.location,
      maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : undefined,
      tags: formData.tags,
      createdBy: user.id,
      shareableLink,
      qrCode: qrCodeUrl
    };

    setCreatedEvents(prev => [newEvent, ...prev]);
    setShowCreateForm(false);
    setFormData({
      title: '',
      description: '',
      date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      time: '18:00',
      location: '',
      maxAttendees: '',
      tags: []
    });

    alert('Event created successfully! Share the link or QR code with others.');
  };

  const handleTagToggle = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleShare = (event: CommunityEvent) => {
    const shareData = {
      title: `Join me for: ${event.title}`,
      text: `${event.description}\n\n📅 ${format(event.date, 'MMM d, yyyy')} at ${event.time}\n📍 ${event.location}`,
      url: event.shareableLink
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      navigator.share(shareData).catch(console.error);
    } else {
      navigator.clipboard.writeText(`${shareData.title}\n\n${shareData.text}\n\n${shareData.url}`);
      alert('Event details copied to clipboard!');
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
  };

  const handleDownloadQR = (event: CommunityEvent) => {
    // Create a temporary link to download the QR code
    const link = document.createElement('a');
    link.href = event.qrCode;
    link.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-qr-code.png`;
    
    // For data URLs, we need to convert to blob first
    if (event.qrCode.startsWith('data:')) {
      fetch(event.qrCode)
        .then(res => res.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob);
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        })
        .catch(() => {
          // Fallback: just open the QR code in new tab
          window.open(event.qrCode, '_blank');
        });
    } else {
      link.click();
    }
  };

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
            Community Events
          </h1>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </button>
        </div>

        {/* Created Events */}
        {createdEvents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
              Your Created Events
            </h2>
            <div className="space-y-4">
              {createdEvents.map(event => (
                <div key={event.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                        {event.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-3">
                        {event.description}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Calendar className="w-4 h-4" />
                          <span>{format(event.date, 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span>{event.time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <MapPin className="w-4 h-4" />
                          <span>{event.location}</span>
                        </div>
                      </div>

                      {event.maxAttendees && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-4">
                          <Users className="w-4 h-4" />
                          <span>Max {event.maxAttendees} attendees</span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mb-4">
                        {event.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Sharing Options */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                    <h4 className="font-medium text-gray-800 dark:text-white mb-3">Share this event</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Share Link */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Shareable Link
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={event.shareableLink}
                            readOnly
                            className="flex-1 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-sm text-gray-800 dark:text-white"
                          />
                          <button
                            onClick={() => handleCopyLink(event.shareableLink)}
                            className="px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors duration-200"
                          >
                            Copy
                          </button>
                        </div>
                      </div>

                      {/* QR Code */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          QR Code
                        </label>
                        <div className="flex items-center gap-2">
                          <img
                            src={event.qrCode}
                            alt="QR Code"
                            className="w-16 h-16 border border-gray-300 dark:border-gray-600 rounded-lg"
                            onError={(e) => {
                              // Fallback to a simple QR placeholder
                              e.currentTarget.src = `data:image/svg+xml;base64,${btoa(`
                                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
                                  <rect width="64" height="64" fill="white" stroke="black" stroke-width="2"/>
                                  <rect x="8" y="8" width="8" height="8" fill="black"/>
                                  <rect x="24" y="8" width="8" height="8" fill="black"/>
                                  <rect x="40" y="8" width="8" height="8" fill="black"/>
                                  <rect x="8" y="24" width="8" height="8" fill="black"/>
                                  <rect x="40" y="24" width="8" height="8" fill="black"/>
                                  <rect x="8" y="40" width="8" height="8" fill="black"/>
                                  <rect x="24" y="40" width="8" height="8" fill="black"/>
                                  <rect x="40" y="40" width="8" height="8" fill="black"/>
                                  <text x="32" y="58" text-anchor="middle" font-size="6" fill="black">QR</text>
                                </svg>
                              `)}`;
                            }}
                          />
                          <button
                            onClick={() => handleDownloadQR(event)}
                            className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 text-sm"
                          >
                            Download
                          </button>
                        </div>
                      </div>

                      {/* Share Button */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Quick Share
                        </label>
                        <button
                          onClick={() => handleShare(event)}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors duration-200"
                        >
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Event Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                    Create Community Event
                  </h2>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Event Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Sunset Walk & Coffee"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your event and what people can expect..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white resize-none"
                    />
                  </div>

                  {/* Date and Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Time *
                      </label>
                      <input
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Location with Search */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Location *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => handleLocationChange(e.target.value)}
                        onFocus={() => formData.location.length >= 3 && setShowLocationSuggestions(true)}
                        placeholder="Search for a location..."
                        className="w-full px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                      />
                      <Search className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    </div>
                    
                    {/* Location Suggestions */}
                    {showLocationSuggestions && locationSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        {locationSuggestions.map(suggestion => (
                          <button
                            key={suggestion.place_id}
                            type="button"
                            onClick={() => handleLocationSelect(suggestion)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-600 border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                          >
                            <div className="font-medium text-gray-800 dark:text-white">
                              {suggestion.structured_formatting.main_text}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {suggestion.structured_formatting.secondary_text}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Max Attendees */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Max Attendees (optional)
                    </label>
                    <input
                      type="number"
                      value={formData.maxAttendees}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxAttendees: e.target.value }))}
                      placeholder="Leave empty for unlimited"
                      min="1"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tags (help people find your event)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {suggestedTags.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleTagToggle(tag)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                            formData.tags.includes(tag)
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Create Button */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateEvent}
                      className="flex-1 px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors duration-200 font-medium"
                    >
                      Create Event
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {createdEvents.length === 0 && !showCreateForm && (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              Create Your First Community Event
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Organize activities, meetups, or gatherings for your local community. 
              Share via link, QR code, or social media to get people together.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors duration-200 mx-auto"
            >
              <Plus className="w-5 h-5" />
              Create Your First Event
            </button>
          </div>
        )}
      </div>
    </div>
  );
};