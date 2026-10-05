import { User, Pod } from '../types';

export const createMockUser = (userData: {
  firstName: string;
  location: string;
  nudgeTime: string;
  interests: string[];
}): User => {
  return {
    id: 'user-1',
    firstName: userData.firstName,
    lastName: '',
    email: 'user@example.com',
    avatar: '🌟',
    location: {
      lat: 40.7178,
      lng: -74.0431,
      neighborhood: getNeighborhood(userData.location),
      city: userData.location
    },
    preferences: {
      nudgeTime: userData.nudgeTime,
      energyLevel: 'medium',
      interests: userData.interests,
      allowSoloNudges: true,
      allowPodNudges: true,
      proximityRadius: 2
    },
    presencePoints: 340,
    streak: 7,
    joinedAt: new Date(),
    friends: [],
    profileComplete: true
  };
};

// Create multiple pods for different areas and interests
export const createMockPod = (location: string): Pod => {
  const pods = createAllMockPods(location);
  // Return the first pod that matches the location
  return pods.find(pod => pod.name.toLowerCase().includes(getNeighborhood(location).toLowerCase())) || pods[0];
};

export const createAllMockPods = (userLocation: string): Pod[] => {
  const baseLocation = { lat: 40.7178, lng: -74.0431 };
  
  return [
    // Jersey City Pods
    {
      id: 'pod-jc-downtown',
      name: 'Downtown JC Connectors',
      location: {
        center: baseLocation,
        radius: 2
      },
      members: createMockMembers('downtown-jc', 8),
      weeklyActivity: {
        id: 'activity-jc-1',
        title: 'Sunday Morning Coffee Circle',
        description: 'Meet at Hamilton Park for coffee and conversation. Bring your favorite mug and an open heart.',
        scheduledDate: getNextSunday(),
        votes: [
          { userId: 'user-jc-2', vote: 'yes' },
          { userId: 'user-jc-3', vote: 'yes' },
          { userId: 'user-jc-4', vote: 'no' }
        ],
        status: 'voting',
        rsvpList: ['user-jc-2', 'user-jc-3']
      },
      chatEnabled: true,
      createdAt: new Date()
    },
    {
      id: 'pod-jc-newport',
      name: 'Newport Mindful Walkers',
      location: {
        center: { lat: 40.7282, lng: -74.0342 },
        radius: 1.5
      },
      members: createMockMembers('newport', 6),
      weeklyActivity: {
        id: 'activity-newport-1',
        title: 'Waterfront Meditation Walk',
        description: 'Silent walking meditation along the Hudson River waterfront. Focus on breath and movement.',
        scheduledDate: getNextSaturday(),
        votes: [
          { userId: 'user-newport-1', vote: 'yes' },
          { userId: 'user-newport-2', vote: 'yes' }
        ],
        status: 'voting',
        rsvpList: ['user-newport-1', 'user-newport-2']
      },
      chatEnabled: true,
      createdAt: new Date()
    },
    {
      id: 'pod-jc-heights',
      name: 'Heights Creative Circle',
      location: {
        center: { lat: 40.7456, lng: -74.0498 },
        radius: 2
      },
      members: createMockMembers('heights', 7),
      weeklyActivity: {
        id: 'activity-heights-1',
        title: 'Sunset Sketching Session',
        description: 'Bring sketchbooks and capture the golden hour views from Hamilton Park. All skill levels welcome.',
        scheduledDate: getNextFriday(),
        votes: [
          { userId: 'user-heights-1', vote: 'yes' },
          { userId: 'user-heights-2', vote: 'no' },
          { userId: 'user-heights-3', vote: 'yes' }
        ],
        status: 'voting',
        rsvpList: ['user-heights-1', 'user-heights-3']
      },
      chatEnabled: true,
      createdAt: new Date()
    },

    // Manhattan Pods
    {
      id: 'pod-manhattan-lower',
      name: 'Lower Manhattan Explorers',
      location: {
        center: { lat: 40.7074, lng: -74.0113 },
        radius: 3
      },
      members: createMockMembers('lower-manhattan', 10),
      weeklyActivity: {
        id: 'activity-manhattan-1',
        title: 'Historic District Food Walk',
        description: 'Explore Stone Street and South Street Seaport while sharing stories and trying local treats.',
        scheduledDate: getNextSunday(),
        votes: [
          { userId: 'user-manhattan-1', vote: 'yes' },
          { userId: 'user-manhattan-2', vote: 'yes' },
          { userId: 'user-manhattan-3', vote: 'yes' },
          { userId: 'user-manhattan-4', vote: 'no' }
        ],
        status: 'voting',
        rsvpList: ['user-manhattan-1', 'user-manhattan-2', 'user-manhattan-3']
      },
      chatEnabled: true,
      createdAt: new Date()
    },

    // Brooklyn Pods
    {
      id: 'pod-brooklyn-park-slope',
      name: 'Park Slope Presence Pod',
      location: {
        center: { lat: 40.6782, lng: -73.9442 },
        radius: 2
      },
      members: createMockMembers('park-slope', 9),
      weeklyActivity: {
        id: 'activity-brooklyn-1',
        title: 'Prospect Park Nature Connection',
        description: 'Mindful walk through Prospect Park focusing on seasonal changes and natural beauty.',
        scheduledDate: getNextSaturday(),
        votes: [
          { userId: 'user-brooklyn-1', vote: 'yes' },
          { userId: 'user-brooklyn-2', vote: 'yes' }
        ],
        status: 'voting',
        rsvpList: ['user-brooklyn-1', 'user-brooklyn-2']
      },
      chatEnabled: true,
      createdAt: new Date()
    },

    // Queens Pods
    {
      id: 'pod-queens-astoria',
      name: 'Astoria Community Circle',
      location: {
        center: { lat: 40.7648, lng: -73.9442 },
        radius: 2.5
      },
      members: createMockMembers('astoria', 8),
      weeklyActivity: {
        id: 'activity-queens-1',
        title: 'Cultural Food Tour',
        description: 'Explore Astoria\'s diverse food scene while practicing mindful eating and cultural appreciation.',
        scheduledDate: getNextSunday(),
        votes: [
          { userId: 'user-queens-1', vote: 'yes' },
          { userId: 'user-queens-2', vote: 'no' },
          { userId: 'user-queens-3', vote: 'yes' }
        ],
        status: 'voting',
        rsvpList: ['user-queens-1', 'user-queens-3']
      },
      chatEnabled: true,
      createdAt: new Date()
    }
  ];
};

const createMockMembers = (area: string, count: number): User[] => {
  const memberNames = [
    { first: 'Alex', last: 'Chen', avatar: '🌱', interests: ['walking', 'nature'] },
    { first: 'Sam', last: 'Rivera', avatar: '🎨', interests: ['art', 'conversations'] },
    { first: 'Jordan', last: 'Kim', avatar: '☕', interests: ['coffee', 'reading'] },
    { first: 'Casey', last: 'Martinez', avatar: '🌊', interests: ['nature', 'meditation'] },
    { first: 'Taylor', last: 'Johnson', avatar: '📚', interests: ['learning', 'community'] },
    { first: 'Morgan', last: 'Davis', avatar: '🎵', interests: ['music', 'creativity'] },
    { first: 'Riley', last: 'Wilson', avatar: '🌸', interests: ['mindfulness', 'yoga'] },
    { first: 'Avery', last: 'Brown', avatar: '🎯', interests: ['fitness', 'goals'] },
    { first: 'Quinn', last: 'Garcia', avatar: '🌟', interests: ['inspiration', 'growth'] },
    { first: 'Sage', last: 'Miller', avatar: '🍃', interests: ['wellness', 'balance'] }
  ];

  return memberNames.slice(0, count).map((member, index) => ({
    id: `user-${area}-${index + 1}`,
    firstName: member.first,
    lastName: member.last,
    email: `${member.first.toLowerCase()}@example.com`,
    avatar: member.avatar,
    location: { 
      lat: 40.7178 + (Math.random() - 0.5) * 0.02, 
      lng: -74.0431 + (Math.random() - 0.5) * 0.02, 
      neighborhood: getNeighborhood(area), 
      city: getCityFromArea(area)
    },
    preferences: { 
      nudgeTime: ['17:30', '18:00', '18:30', '19:00'][Math.floor(Math.random() * 4)], 
      energyLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any, 
      interests: member.interests,
      allowSoloNudges: true, 
      allowPodNudges: true,
      proximityRadius: Math.floor(Math.random() * 3) + 1
    },
    presencePoints: Math.floor(Math.random() * 500) + 100,
    streak: Math.floor(Math.random() * 15) + 1,
    joinedAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Random date within last 90 days
    friends: [],
    profileComplete: true
  }));
};

const getNeighborhood = (location: string): string => {
  const neighborhoods: Record<string, string> = {
    'jersey-city': 'Downtown JC',
    'downtown-jc': 'Downtown JC',
    'newport': 'Newport',
    'heights': 'Jersey City Heights',
    'manhattan': 'Lower Manhattan',
    'lower-manhattan': 'Lower Manhattan',
    'brooklyn': 'Park Slope',
    'park-slope': 'Park Slope',
    'queens': 'Astoria',
    'astoria': 'Astoria',
    'bronx': 'South Bronx'
  };
  return neighborhoods[location] || 'Downtown';
};

const getCityFromArea = (area: string): string => {
  if (area.includes('jc') || area.includes('newport') || area.includes('heights')) {
    return 'Jersey City';
  }
  if (area.includes('manhattan')) {
    return 'Manhattan';
  }
  if (area.includes('brooklyn') || area.includes('park-slope')) {
    return 'Brooklyn';
  }
  if (area.includes('queens') || area.includes('astoria')) {
    return 'Queens';
  }
  return 'Jersey City';
};

const getNextSunday = (): Date => {
  const today = new Date();
  const daysUntilSunday = (7 - today.getDay()) % 7;
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
  nextSunday.setHours(10, 0, 0, 0);
  return nextSunday;
};

const getNextSaturday = (): Date => {
  const today = new Date();
  const daysUntilSaturday = (6 - today.getDay() + 7) % 7;
  const nextSaturday = new Date(today);
  nextSaturday.setDate(today.getDate() + (daysUntilSaturday === 0 ? 7 : daysUntilSaturday));
  nextSaturday.setHours(9, 0, 0, 0);
  return nextSaturday;
};

const getNextFriday = (): Date => {
  const today = new Date();
  const daysUntilFriday = (5 - today.getDay() + 7) % 7;
  const nextFriday = new Date(today);
  nextFriday.setDate(today.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
  nextFriday.setHours(18, 0, 0, 0);
  return nextFriday;
};