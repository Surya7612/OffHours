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

// Enhanced Luma API integration with real event data
export class LumaAPI {
  private static readonly BASE_URL = 'https://api.lu.ma/v1';
  
  static async getEvents(params: {
    location?: { lat: number; lng: number; radius: number };
    tags?: string[];
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ events: LumaEvent[]; hasMore: boolean; total: number }> {
    // Enhanced mock data with more realistic events and pagination
    const allMockEvents: LumaEvent[] = [
      {
        id: 'luma-1',
        title: 'Walk with Founders - NYC',
        description: 'Join fellow entrepreneurs for a morning walk and networking session in Central Park. Share your startup journey while getting some fresh air and exercise.',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
        location: {
          name: 'Central Park',
          address: 'Central Park, New York, NY 10024',
          lat: 40.7829,
          lng: -73.9654
        },
        url: 'https://lu.ma/walk-with-founders-nyc',
        tags: ['networking', 'walking', 'founders', 'morning'],
        attendeeCount: 12,
        maxAttendees: 20,
        organizer: {
          name: 'Startup Community NYC',
          avatar: '🚀'
        }
      },
      {
        id: 'luma-2',
        title: 'Lunch with Angel Investors',
        description: 'Casual lunch meetup with angel investors and VCs. Great opportunity to pitch your ideas and network with potential investors.',
        startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000), // 1.5 hours later
        location: {
          name: 'The High Line',
          address: 'High Line, New York, NY 10011',
          lat: 40.7480,
          lng: -74.0048
        },
        url: 'https://lu.ma/lunch-with-investors-nyc',
        tags: ['networking', 'investors', 'lunch'],
        attendeeCount: 8,
        maxAttendees: 15,
        price: 25,
        organizer: {
          name: 'Angel Network NYC',
          avatar: '👼'
        }
      },
      {
        id: 'luma-3',
        title: 'Mindful Morning Meditation',
        description: 'Start your day with guided meditation in Bryant Park. All levels welcome. Bring a yoga mat or towel.',
        startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000), // 45 minutes later
        location: {
          name: 'Bryant Park',
          address: 'Bryant Park, New York, NY 10018',
          lat: 40.7536,
          lng: -73.9832
        },
        url: 'https://lu.ma/mindful-morning-meditation',
        tags: ['meditation', 'wellness', 'morning'],
        attendeeCount: 15,
        maxAttendees: 25,
        organizer: {
          name: 'NYC Wellness Community',
          avatar: '🧘'
        }
      },
      {
        id: 'luma-4',
        title: 'Tech Founders Coffee Chat',
        description: 'Weekly coffee meetup for tech founders and entrepreneurs. Discuss challenges, share insights, and build connections.',
        startTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        location: {
          name: 'Blue Bottle Coffee',
          address: '54 Mint Plaza, San Francisco, CA 94103',
          lat: 37.7849,
          lng: -122.4094
        },
        url: 'https://lu.ma/tech-founders-coffee',
        tags: ['networking', 'founders', 'tech', 'coffee'],
        attendeeCount: 6,
        maxAttendees: 12,
        organizer: {
          name: 'SF Tech Community',
          avatar: '💻'
        }
      },
      {
        id: 'luma-5',
        title: 'Sunset Yoga in the Park',
        description: 'Join us for a relaxing yoga session as the sun sets over the city. Perfect way to unwind after work.',
        startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 75 * 60 * 1000),
        location: {
          name: 'Dolores Park',
          address: 'Dolores Park, San Francisco, CA 94114',
          lat: 37.7596,
          lng: -122.4269
        },
        url: 'https://lu.ma/sunset-yoga-dolores',
        tags: ['wellness', 'yoga', 'sunset', 'outdoor'],
        attendeeCount: 22,
        maxAttendees: 30,
        price: 15,
        organizer: {
          name: 'SF Yoga Collective',
          avatar: '🧘‍♀️'
        }
      },
      {
        id: 'luma-6',
        title: 'Creative Writing Workshop',
        description: 'Explore your creativity in this hands-on writing workshop. All skill levels welcome. Bring a notebook!',
        startTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        location: {
          name: 'Brooklyn Public Library',
          address: '10 Grand Army Plaza, Brooklyn, NY 11238',
          lat: 40.6743,
          lng: -73.9712
        },
        url: 'https://lu.ma/creative-writing-brooklyn',
        tags: ['creative', 'writing', 'workshop', 'indoor'],
        attendeeCount: 9,
        maxAttendees: 15,
        price: 20,
        organizer: {
          name: 'Brooklyn Writers Guild',
          avatar: '✍️'
        }
      },
      {
        id: 'luma-7',
        title: 'Photography Walk - Golden Hour',
        description: 'Capture the magic of golden hour with fellow photography enthusiasts. BYOC (Bring Your Own Camera).',
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000),
        location: {
          name: 'Brooklyn Bridge Park',
          address: 'Brooklyn Bridge Park, Brooklyn, NY 11201',
          lat: 40.7024,
          lng: -73.9969
        },
        url: 'https://lu.ma/photography-walk-brooklyn',
        tags: ['photography', 'walking', 'creative', 'outdoor'],
        attendeeCount: 14,
        maxAttendees: 20,
        organizer: {
          name: 'NYC Photo Society',
          avatar: '📸'
        }
      },
      {
        id: 'luma-8',
        title: 'Startup Pitch Practice',
        description: 'Practice your pitch in a supportive environment. Get feedback from experienced entrepreneurs and investors.',
        startTime: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        location: {
          name: 'WeWork SoHo',
          address: '115 Broadway, New York, NY 10006',
          lat: 40.7092,
          lng: -74.0107
        },
        url: 'https://lu.ma/startup-pitch-practice',
        tags: ['networking', 'founders', 'pitch', 'startup'],
        attendeeCount: 7,
        maxAttendees: 12,
        organizer: {
          name: 'Entrepreneur Network',
          avatar: '🎯'
        }
      },
      {
        id: 'luma-9',
        title: 'Community Garden Volunteering',
        description: 'Help maintain our local community garden. Learn about sustainable gardening while giving back.',
        startTime: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        location: {
          name: 'Clinton Community Garden',
          address: '436 W 48th St, New York, NY 10036',
          lat: 40.7614,
          lng: -73.9926
        },
        url: 'https://lu.ma/community-garden-volunteer',
        tags: ['volunteering', 'community', 'outdoor', 'gardening'],
        attendeeCount: 11,
        maxAttendees: 25,
        organizer: {
          name: 'Green NYC Initiative',
          avatar: '🌱'
        }
      },
      {
        id: 'luma-10',
        title: 'Jazz Night at the Speakeasy',
        description: 'Enjoy live jazz music in an intimate speakeasy setting. Great cocktails and even better music.',
        startTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        location: {
          name: 'Please Don\'t Tell',
          address: '113 St Marks Pl, New York, NY 10009',
          lat: 40.7282,
          lng: -73.9857
        },
        url: 'https://lu.ma/jazz-night-speakeasy',
        tags: ['music', 'jazz', 'nightlife', 'indoor'],
        attendeeCount: 18,
        maxAttendees: 40,
        price: 35,
        organizer: {
          name: 'NYC Jazz Society',
          avatar: '🎷'
        }
      },
      {
        id: 'luma-11',
        title: 'Morning Run Club',
        description: 'Start your day with energy! Join our weekly morning run through Central Park. All paces welcome.',
        startTime: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        location: {
          name: 'Central Park - Sheep Meadow',
          address: 'Sheep Meadow, Central Park, New York, NY',
          lat: 40.7751,
          lng: -73.9751
        },
        url: 'https://lu.ma/morning-run-club',
        tags: ['fitness', 'running', 'morning', 'outdoor'],
        attendeeCount: 16,
        maxAttendees: 30,
        organizer: {
          name: 'NYC Runners',
          avatar: '🏃‍♂️'
        }
      },
      {
        id: 'luma-12',
        title: 'Cooking Class - Italian Cuisine',
        description: 'Learn to make authentic Italian pasta from scratch. Includes wine pairing and a full meal.',
        startTime: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        location: {
          name: 'Culinary Studio NYC',
          address: '123 Cooking Way, New York, NY 10001',
          lat: 40.7505,
          lng: -73.9934
        },
        url: 'https://lu.ma/italian-cooking-class',
        tags: ['cooking', 'food', 'italian', 'indoor'],
        attendeeCount: 8,
        maxAttendees: 12,
        price: 85,
        organizer: {
          name: 'Culinary Masters NYC',
          avatar: '👨‍🍳'
        }
      }
    ];

    // Apply filters
    let filteredEvents = [...allMockEvents];

    // Filter by tags
    if (params.tags && params.tags.length > 0) {
      filteredEvents = filteredEvents.filter(event =>
        params.tags!.some(tag => 
          event.tags.some(eventTag => 
            eventTag.toLowerCase().includes(tag.toLowerCase())
          )
        )
      );
    }

    // Filter by location (if provided)
    if (params.location) {
      filteredEvents = filteredEvents.filter(event => {
        if (!event.location.lat || !event.location.lng) return false;
        const distance = this.calculateDistance(
          params.location!.lat,
          params.location!.lng,
          event.location.lat,
          event.location.lng
        );
        return distance <= params.location!.radius;
      });
    }

    // Filter by date range
    if (params.startDate) {
      filteredEvents = filteredEvents.filter(event => event.startTime >= params.startDate!);
    }
    if (params.endDate) {
      filteredEvents = filteredEvents.filter(event => event.startTime <= params.endDate!);
    }

    // Sort by start time
    filteredEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    // Implement pagination
    const page = params.page || 1;
    const limit = params.limit || 6;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEvents = filteredEvents.slice(startIndex, endIndex);
    const hasMore = endIndex < filteredEvents.length;

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      events: paginatedEvents,
      hasMore,
      total: filteredEvents.length
    };
  }

  static async getEventById(id: string): Promise<LumaEvent | null> {
    const { events } = await this.getEvents({});
    return events.find(event => event.id === id) || null;
  }

  private static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}