import { UnifiedNudge, Pod, User } from '../types';

const jerseyCity = {
  lat: 40.7178,
  lng: -74.0431
};

const locations = [
  {
    name: "Liberty State Park",
    address: "200 Morris Pesin Dr, Jersey City, NJ 07305",
    lat: 40.7067,
    lng: -74.0447
  },
  {
    name: "Newport Waterfront",
    address: "Newport Pkwy, Jersey City, NJ 07310",
    lat: 40.7282,
    lng: -74.0342
  },
  {
    name: "Hamilton Park",
    address: "223 9th St, Jersey City, NJ 07302",
    lat: 40.7456,
    lng: -74.0498
  },
  {
    name: "Van Vorst Park",
    address: "York St & 3rd St, Jersey City, NJ 07302",
    lat: 40.7198,
    lng: -74.0465
  },
  {
    name: "Pershing Field Park",
    address: "Central Ave & Bentley Ave, Jersey City, NJ 07307",
    lat: 40.7503,
    lng: -74.0456
  }
];

const nudgeTemplates = [
  {
    title: "Silent Sunset Walk",
    description: "Leave your phone behind and walk in comfortable silence. Notice the golden hour light and let your thoughts wander freely.",
    type: "walk" as const,
    duration: 30
  },
  {
    title: "Gratitude Circle",
    description: "Gather in a circle and share one thing you're grateful for today. No phones, just presence and authentic connection.",
    type: "gathering" as const,
    duration: 20
  },
  {
    title: "Mindful Breathing Together",
    description: "Find a quiet spot and practice 10 minutes of synchronized breathing. Feel the collective calm wash over the group.",
    type: "mindful" as const,
    duration: 15
  },
  {
    title: "Story Sharing Stroll",
    description: "Walk slowly and share stories from your day. Listen deeply and connect through the simple act of being heard.",
    type: "social" as const,
    duration: 25
  },
  {
    title: "Creative Sketching Hour",
    description: "Bring paper and pencils. Sit together and sketch what you see around you. Share your perspectives without judgment.",
    type: "creative" as const,
    duration: 45
  }
];

export const generateTodaysNudge = (pod: Pod, user: User): UnifiedNudge => {
  // Select a random template and location
  const template = nudgeTemplates[Math.floor(Math.random() * nudgeTemplates.length)];
  const location = locations[Math.floor(Math.random() * locations.length)];
  
  // Generate time based on user's preferred nudge time
  const now = new Date();
  const [hours, minutes] = user.preferences.nudgeTime.split(':').map(Number);
  const scheduledTime = new Date(now);
  scheduledTime.setHours(hours, minutes, 0, 0);
  
  // If the time has passed today, schedule for tomorrow
  if (scheduledTime < now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  // Mock some participants from the pod
  const mockParticipants = pod.members.slice(0, Math.floor(Math.random() * 4) + 1).map(member => ({
    userId: member.id,
    status: Math.random() > 0.5 ? 'confirmed' : 'interested' as const,
    joinedAt: new Date()
  }));

  return {
    id: `nudge-${Date.now()}`,
    title: template.title,
    description: template.description,
    location: {
      name: location.name,
      address: location.address,
      lat: location.lat,
      lng: location.lng
    },
    scheduledTime,
    duration: template.duration,
    type: template.type,
    maxParticipants: 8,
    participants: mockParticipants,
    podId: pod.id,
    weather: {
      condition: "Clear skies",
      temperature: 72
    }
  };
};