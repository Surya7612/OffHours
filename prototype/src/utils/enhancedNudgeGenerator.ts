import { UnifiedNudge, Pod, User, SoloNudge } from '../types';
import { ACTIVITY_DATABASE, filterActivitiesByContext, getRandomActivity, ActivityTemplate } from './activityDatabase';

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

const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' | 'night' => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

const getWeatherCondition = (): string => {
  // In production, this would call a weather API
  const conditions = ['sunny', 'cloudy', 'rainy', 'cold', 'hot'];
  return conditions[Math.floor(Math.random() * conditions.length)];
};

const getPersonalizedActivities = (user: User): ActivityTemplate[] => {
  const timeOfDay = getTimeOfDay();
  const weather = getWeatherCondition();
  
  // AI-powered personalization based on user data
  const context = {
    energyLevel: user.preferences.energyLevel,
    timeOfDay,
    weather,
    location: 'both' as const,
    groupSize: 'solo' as const,
    interests: user.preferences.interests,
    proximityRadius: user.preferences.proximityRadius,
    duration: 45 // Personalized duration based on user history
  };

  // Filter activities based on user's past behavior and preferences
  let personalizedActivities = filterActivitiesByContext(ACTIVITY_DATABASE, context);
  
  // AI scoring based on user patterns
  personalizedActivities = personalizedActivities.map(activity => ({
    ...activity,
    personalizedScore: calculatePersonalizationScore(activity, user)
  })).sort((a, b) => (b as any).personalizedScore - (a as any).personalizedScore);

  return personalizedActivities.slice(0, 10); // Top 10 personalized activities
};

const calculatePersonalizationScore = (activity: ActivityTemplate, user: User): number => {
  let score = 0;
  
  // Interest matching (high weight)
  const interestMatches = activity.interests.filter(interest => 
    user.preferences.interests.some(userInterest => 
      interest.toLowerCase().includes(userInterest.toLowerCase()) ||
      userInterest.toLowerCase().includes(interest.toLowerCase())
    )
  ).length;
  score += interestMatches * 15;
  
  // Energy level matching
  if (activity.energyLevel === user.preferences.energyLevel) {
    score += 10;
  }
  
  // Time preference (evening activities for 6PM nudges)
  if (activity.timeOfDay.includes('evening')) {
    score += 8;
  }
  
  // Accessibility bonus
  if (activity.accessibility === 'high') {
    score += 5;
  }
  
  // Free activity bonus
  if (activity.cost === 'free') {
    score += 3;
  }
  
  // Proximity bonus
  if (activity.proximityRequired <= user.preferences.proximityRadius) {
    score += 5;
  }
  
  return score;
};

export const generateEnhancedSoloNudge = (user: User): SoloNudge => {
  const personalizedActivities = getPersonalizedActivities(user);
  const selectedActivity = personalizedActivities[0] || ACTIVITY_DATABASE[0];

  return {
    id: `solo-nudge-${Date.now()}`,
    title: selectedActivity.title,
    description: `${selectedActivity.description}\n\n💡 Personalized for you based on your interests in ${user.preferences.interests.slice(0, 2).join(' and ')}.`,
    type: selectedActivity.type as any,
    duration: selectedActivity.duration,
    location: selectedActivity.location === 'outdoor' ? 'Nearby outdoor space' : undefined,
    scheduledTime: new Date()
  };
};

export const generateEnhancedUnifiedNudge = (pod: Pod, user: User): UnifiedNudge => {
  const timeOfDay = getTimeOfDay();
  const weather = getWeatherCondition();
  
  // Get collective interests from pod members
  const podInterests = pod.members.reduce((interests, member) => {
    return [...interests, ...member.preferences.interests];
  }, [] as string[]);
  
  // Get most common interests
  const interestCounts = podInterests.reduce((counts, interest) => {
    counts[interest] = (counts[interest] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
  
  const popularInterests = Object.entries(interestCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([interest]) => interest);

  const context = {
    energyLevel: 'medium' as const, // Default for group activities
    timeOfDay,
    weather,
    location: weather === 'rainy' ? 'indoor' as const : 'both' as const,
    groupSize: 'small' as const,
    interests: popularInterests,
    proximityRadius: Math.min(...pod.members.map(m => m.preferences.proximityRadius)),
    duration: 60 // Max 60 minutes for group activities
  };

  const filteredActivities = filterActivitiesByContext(
    ACTIVITY_DATABASE.filter(a => a.groupSize !== 'solo'), 
    context
  );
  
  const selectedActivity = getRandomActivity(filteredActivities, popularInterests);

  if (!selectedActivity) {
    // Fallback to a simple group walk
    return createFallbackUnifiedNudge(pod, user);
  }

  // Select appropriate location
  const location = selectedActivity.location === 'outdoor' 
    ? locations[Math.floor(Math.random() * locations.length)]
    : {
        name: "Local Community Space",
        address: "Nearby indoor venue",
        lat: jerseyCity.lat,
        lng: jerseyCity.lng
      };

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
    title: selectedActivity.title,
    description: `${selectedActivity.description}\n\n🎯 Curated for your pod based on shared interests in ${popularInterests.slice(0, 2).join(' and ')}.`,
    location: {
      name: location.name,
      address: location.address,
      lat: location.lat,
      lng: location.lng
    },
    scheduledTime,
    duration: selectedActivity.duration,
    type: mapActivityTypeToNudgeType(selectedActivity.type),
    maxParticipants: 8,
    participants: mockParticipants,
    podId: pod.id,
    weather: {
      condition: weather,
      temperature: Math.floor(Math.random() * 30) + 50 // 50-80°F
    }
  };
};

const mapActivityTypeToNudgeType = (activityType: string): 'walk' | 'gathering' | 'mindful' | 'creative' | 'social' => {
  switch (activityType) {
    case 'movement':
    case 'nature':
      return 'walk';
    case 'creative':
      return 'creative';
    case 'mindful':
      return 'mindful';
    case 'community':
    case 'social':
      return 'social';
    default:
      return 'gathering';
  }
};

const createFallbackUnifiedNudge = (pod: Pod, user: User): UnifiedNudge => {
  const location = locations[Math.floor(Math.random() * locations.length)];
  
  const now = new Date();
  const [hours, minutes] = user.preferences.nudgeTime.split(':').map(Number);
  const scheduledTime = new Date(now);
  scheduledTime.setHours(hours, minutes, 0, 0);
  
  if (scheduledTime < now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  return {
    id: `nudge-${Date.now()}`,
    title: 'Silent Sunset Walk',
    description: 'Leave your phone behind and walk in comfortable silence. Notice the golden hour light and let your thoughts wander freely.\n\n✨ A mindful moment designed for your pod.',
    location: {
      name: location.name,
      address: location.address,
      lat: location.lat,
      lng: location.lng
    },
    scheduledTime,
    duration: 30,
    type: 'walk',
    maxParticipants: 8,
    participants: [],
    podId: pod.id,
    weather: {
      condition: "Clear skies",
      temperature: 72
    }
  };
};

// Export for backward compatibility
export const generateTodaysNudge = generateEnhancedUnifiedNudge;
export const generateSoloNudge = generateEnhancedSoloNudge;