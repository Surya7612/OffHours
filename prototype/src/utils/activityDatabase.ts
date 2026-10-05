export interface ActivityTemplate {
  id: string;
  title: string;
  description: string;
  type: 'solo' | 'social' | 'nature' | 'mindful' | 'creative' | 'movement' | 'community';
  duration: number; // in minutes
  energyLevel: 'low' | 'medium' | 'high';
  timeOfDay: ('morning' | 'afternoon' | 'evening' | 'night')[];
  weather: ('sunny' | 'cloudy' | 'rainy' | 'cold' | 'hot' | 'any')[];
  location: 'indoor' | 'outdoor' | 'both';
  groupSize: 'solo' | 'pair' | 'small' | 'large' | 'any';
  interests: string[];
  proximityRequired: number; // km radius needed
  equipment?: string[];
  cost: 'free' | 'low' | 'medium' | 'high';
  accessibility: 'high' | 'medium' | 'low';
  tags: string[];
}

export const ACTIVITY_DATABASE: ActivityTemplate[] = [
  // SOLO ACTIVITIES
  {
    id: 'solo-mindful-breathing',
    title: 'Mindful Breathing Space',
    description: 'Find a quiet corner, close your eyes, and take 10 deep breaths. Notice how your body feels with each exhale.',
    type: 'mindful',
    duration: 10,
    energyLevel: 'low',
    timeOfDay: ['morning', 'afternoon', 'evening', 'night'],
    weather: ['any'],
    location: 'both',
    groupSize: 'solo',
    interests: ['meditation', 'wellness'],
    proximityRequired: 0,
    cost: 'free',
    accessibility: 'high',
    tags: ['quick', 'stress-relief', 'anywhere']
  },
  {
    id: 'solo-gratitude-journal',
    title: 'Gratitude Reflection',
    description: 'Write down three things you\'re grateful for today. Take time to really feel the appreciation in your heart.',
    type: 'mindful',
    duration: 15,
    energyLevel: 'low',
    timeOfDay: ['morning', 'evening'],
    weather: ['any'],
    location: 'both',
    groupSize: 'solo',
    interests: ['journaling', 'reflection'],
    proximityRequired: 0,
    equipment: ['pen', 'paper'],
    cost: 'free',
    accessibility: 'high',
    tags: ['reflection', 'writing', 'peaceful']
  },
  {
    id: 'solo-creative-doodle',
    title: 'Creative Doodling',
    description: 'Grab paper and pen. Draw whatever comes to mind for 20 minutes. No judgment, just let your creativity flow.',
    type: 'creative',
    duration: 20,
    energyLevel: 'medium',
    timeOfDay: ['afternoon', 'evening'],
    weather: ['any'],
    location: 'both',
    groupSize: 'solo',
    interests: ['art', 'creativity'],
    proximityRequired: 0,
    equipment: ['paper', 'pen/pencil'],
    cost: 'free',
    accessibility: 'high',
    tags: ['artistic', 'relaxing', 'expressive']
  },
  {
    id: 'solo-nature-walk',
    title: 'Solo Nature Walk',
    description: 'Step outside and walk slowly for 25 minutes. Leave your phone behind and notice the world around you.',
    type: 'nature',
    duration: 25,
    energyLevel: 'medium',
    timeOfDay: ['morning', 'afternoon', 'evening'],
    weather: ['sunny', 'cloudy'],
    location: 'outdoor',
    groupSize: 'solo',
    interests: ['walking', 'nature'],
    proximityRequired: 1,
    cost: 'free',
    accessibility: 'medium',
    tags: ['exercise', 'fresh-air', 'mindful']
  },
  {
    id: 'solo-tea-meditation',
    title: 'Tea Meditation',
    description: 'Brew your favorite tea or coffee. Sit quietly and savor each sip mindfully, feeling the warmth and taste.',
    type: 'mindful',
    duration: 20,
    energyLevel: 'low',
    timeOfDay: ['morning', 'afternoon', 'evening'],
    weather: ['any'],
    location: 'indoor',
    groupSize: 'solo',
    interests: ['tea', 'coffee', 'meditation'],
    proximityRequired: 0,
    cost: 'low',
    accessibility: 'high',
    tags: ['cozy', 'warm', 'ritual']
  },
  {
    id: 'solo-stretching',
    title: 'Gentle Stretching',
    description: 'Move your body gently. Stretch, roll your shoulders, touch your toes. Listen to what your body needs.',
    type: 'movement',
    duration: 15,
    energyLevel: 'low',
    timeOfDay: ['morning', 'afternoon', 'evening'],
    weather: ['any'],
    location: 'both',
    groupSize: 'solo',
    interests: ['fitness', 'wellness'],
    proximityRequired: 0,
    cost: 'free',
    accessibility: 'high',
    tags: ['body-care', 'flexibility', 'gentle']
  },

  // SOCIAL ACTIVITIES
  {
    id: 'social-coffee-chat',
    title: 'Coffee Shop Connection',
    description: 'Visit a local coffee shop with a friend. Sit by the window, people-watch, and have a real conversation.',
    type: 'social',
    duration: 45,
    energyLevel: 'medium',
    timeOfDay: ['morning', 'afternoon'],
    weather: ['any'],
    location: 'indoor',
    groupSize: 'pair',
    interests: ['coffee', 'conversations'],
    proximityRequired: 2,
    cost: 'low',
    accessibility: 'high',
    tags: ['cozy', 'conversation', 'local']
  },
  {
    id: 'social-sunset-walk',
    title: 'Evening Stroll & Chat',
    description: 'Call a friend and take a walk while you talk. Let the conversation flow naturally as you move through your neighborhood.',
    type: 'social',
    duration: 30,
    energyLevel: 'medium',
    timeOfDay: ['evening'],
    weather: ['sunny', 'cloudy'],
    location: 'outdoor',
    groupSize: 'pair',
    interests: ['walking', 'conversations'],
    proximityRequired: 1,
    cost: 'free',
    accessibility: 'medium',
    tags: ['exercise', 'bonding', 'fresh-air']
  },
  {
    id: 'social-cooking-together',
    title: 'Cooking Connection',
    description: 'Invite a friend over to cook something simple together. Focus on the process, not perfection.',
    type: 'social',
    duration: 60,
    energyLevel: 'medium',
    timeOfDay: ['afternoon', 'evening'],
    weather: ['any'],
    location: 'indoor',
    groupSize: 'pair',
    interests: ['cooking', 'food'],
    proximityRequired: 0,
    cost: 'low',
    accessibility: 'medium',
    tags: ['creative', 'nourishing', 'collaborative']
  },
  {
    id: 'social-park-picnic',
    title: 'Spontaneous Park Picnic',
    description: 'Grab some snacks and meet friends at a nearby park. Sit on the grass and enjoy simple food together.',
    type: 'social',
    duration: 90,
    energyLevel: 'medium',
    timeOfDay: ['afternoon', 'evening'],
    weather: ['sunny', 'cloudy'],
    location: 'outdoor',
    groupSize: 'small',
    interests: ['food', 'nature', 'community'],
    proximityRequired: 3,
    cost: 'low',
    accessibility: 'medium',
    tags: ['outdoor', 'food', 'relaxed']
  },
  {
    id: 'social-board-games',
    title: 'Board Game Café',
    description: 'Meet friends at a board game café or bring games to someone\'s home. Focus on fun, not winning.',
    type: 'social',
    duration: 120,
    energyLevel: 'medium',
    timeOfDay: ['afternoon', 'evening'],
    weather: ['any'],
    location: 'indoor',
    groupSize: 'small',
    interests: ['games', 'strategy'],
    proximityRequired: 2,
    cost: 'low',
    accessibility: 'high',
    tags: ['fun', 'strategic', 'laughter']
  },

  // NATURE ACTIVITIES
  {
    id: 'nature-sunrise-watch',
    title: 'Sunrise Observation',
    description: 'Wake up early and find a spot to watch the sunrise. Bring a warm drink and just be present.',
    type: 'nature',
    duration: 30,
    energyLevel: 'low',
    timeOfDay: ['morning'],
    weather: ['sunny', 'cloudy'],
    location: 'outdoor',
    groupSize: 'any',
    interests: ['nature', 'photography'],
    proximityRequired: 2,
    cost: 'free',
    accessibility: 'medium',
    tags: ['peaceful', 'inspiring', 'early']
  },
  {
    id: 'nature-tree-sitting',
    title: 'Tree Meditation',
    description: 'Find a large tree in a park. Sit with your back against it for 20 minutes and feel its energy.',
    type: 'nature',
    duration: 20,
    energyLevel: 'low',
    timeOfDay: ['morning', 'afternoon'],
    weather: ['sunny', 'cloudy'],
    location: 'outdoor',
    groupSize: 'solo',
    interests: ['nature', 'meditation'],
    proximityRequired: 1,
    cost: 'free',
    accessibility: 'medium',
    tags: ['grounding', 'peaceful', 'spiritual']
  },
  {
    id: 'nature-flower-photography',
    title: 'Flower Photography Walk',
    description: 'Take a slow walk and photograph flowers, leaves, or interesting natural details you notice.',
    type: 'nature',
    duration: 45,
    energyLevel: 'medium',
    timeOfDay: ['morning', 'afternoon'],
    weather: ['sunny', 'cloudy'],
    location: 'outdoor',
    groupSize: 'any',
    interests: ['photography', 'nature', 'art'],
    proximityRequired: 2,
    equipment: ['camera/phone'],
    cost: 'free',
    accessibility: 'medium',
    tags: ['creative', 'observant', 'artistic']
  },
  {
    id: 'nature-barefoot-grounding',
    title: 'Barefoot Grounding',
    description: 'If possible, step outside barefoot for 10 minutes. Feel the earth beneath your feet and breathe deeply.',
    type: 'nature',
    duration: 10,
    energyLevel: 'low',
    timeOfDay: ['morning', 'afternoon', 'evening'],
    weather: ['sunny', 'cloudy'],
    location: 'outdoor',
    groupSize: 'solo',
    interests: ['nature', 'wellness'],
    proximityRequired: 0,
    cost: 'free',
    accessibility: 'low',
    tags: ['grounding', 'sensory', 'natural']
  },

  // MINDFUL ACTIVITIES
  {
    id: 'mindful-body-scan',
    title: 'Body Scan Meditation',
    description: 'Lie down comfortably and slowly scan your body from toes to head, noticing any sensations.',
    type: 'mindful',
    duration: 25,
    energyLevel: 'low',
    timeOfDay: ['morning', 'evening'],
    weather: ['any'],
    location: 'indoor',
    groupSize: 'solo',
    interests: ['meditation', 'wellness'],
    proximityRequired: 0,
    cost: 'free',
    accessibility: 'high',
    tags: ['relaxing', 'healing', 'awareness']
  },
  {
    id: 'mindful-eating',
    title: 'Mindful Eating Practice',
    description: 'Choose one meal or snack to eat in complete silence, focusing on taste, texture, and gratitude.',
    type: 'mindful',
    duration: 20,
    energyLevel: 'low',
    timeOfDay: ['morning', 'afternoon', 'evening'],
    weather: ['any'],
    location: 'both',
    groupSize: 'solo',
    interests: ['food', 'meditation'],
    proximityRequired: 0,
    cost: 'free',
    accessibility: 'high',
    tags: ['nourishing', 'present', 'grateful']
  },
  {
    id: 'mindful-listening',
    title: 'Sound Meditation',
    description: 'Sit quietly for 15 minutes and just listen. Notice all the sounds around you without judgment.',
    type: 'mindful',
    duration: 15,
    energyLevel: 'low',
    timeOfDay: ['morning', 'afternoon', 'evening'],
    weather: ['any'],
    location: 'both',
    groupSize: 'solo',
    interests: ['meditation', 'awareness'],
    proximityRequired: 0,
    cost: 'free',
    accessibility: 'high',
    tags: ['awareness', 'peaceful', 'present']
  },

  // CREATIVE ACTIVITIES
  {
    id: 'creative-poetry-writing',
    title: 'Poetry in the Moment',
    description: 'Write a short poem about how you\'re feeling right now. Don\'t worry about rhyming or rules.',
    type: 'creative',
    duration: 25,
    energyLevel: 'medium',
    timeOfDay: ['afternoon', 'evening'],
    weather: ['any'],
    location: 'both',
    groupSize: 'solo',
    interests: ['writing', 'poetry'],
    proximityRequired: 0,
    equipment: ['pen', 'paper'],
    cost: 'free',
    accessibility: 'high',
    tags: ['expressive', 'emotional', 'artistic']
  },
  {
    id: 'creative-collage-making',
    title: 'Vision Collage',
    description: 'Cut out images from magazines that speak to you and create a collage of your current mood or dreams.',
    type: 'creative',
    duration: 45,
    energyLevel: 'medium',
    timeOfDay: ['afternoon', 'evening'],
    weather: ['any'],
    location: 'indoor',
    groupSize: 'any',
    interests: ['art', 'creativity'],
    proximityRequired: 0,
    equipment: ['magazines', 'scissors', 'glue'],
    cost: 'low',
    accessibility: 'high',
    tags: ['artistic', 'visionary', 'therapeutic']
  },
  {
    id: 'creative-music-listening',
    title: 'Intentional Music Journey',
    description: 'Choose an album you\'ve never heard before. Lie down and listen to the whole thing without distractions.',
    type: 'creative',
    duration: 60,
    energyLevel: 'low',
    timeOfDay: ['afternoon', 'evening'],
    weather: ['any'],
    location: 'indoor',
    groupSize: 'solo',
    interests: ['music'],
    proximityRequired: 0,
    cost: 'free',
    accessibility: 'high',
    tags: ['immersive', 'discovery', 'emotional']
  },

  // MOVEMENT ACTIVITIES
  {
    id: 'movement-dance-alone',
    title: 'Solo Dance Party',
    description: 'Put on your favorite music and dance like nobody\'s watching. Move however feels good.',
    type: 'movement',
    duration: 20,
    energyLevel: 'high',
    timeOfDay: ['morning', 'afternoon', 'evening'],
    weather: ['any'],
    location: 'indoor',
    groupSize: 'solo',
    interests: ['music', 'fitness'],
    proximityRequired: 0,
    cost: 'free',
    accessibility: 'high',
    tags: ['energizing', 'fun', 'expressive']
  },
  {
    id: 'movement-stairs-climbing',
    title: 'Mindful Stair Climbing',
    description: 'Find a set of stairs and walk up and down slowly, focusing on your breath and movement.',
    type: 'movement',
    duration: 15,
    energyLevel: 'medium',
    timeOfDay: ['morning', 'afternoon'],
    weather: ['any'],
    location: 'both',
    groupSize: 'solo',
    interests: ['fitness'],
    proximityRequired: 1,
    cost: 'free',
    accessibility: 'medium',
    tags: ['cardio', 'accessible', 'energizing']
  },
  {
    id: 'movement-yoga-flow',
    title: 'Simple Yoga Flow',
    description: 'Do a gentle 20-minute yoga sequence. Focus on connecting breath with movement.',
    type: 'movement',
    duration: 20,
    energyLevel: 'medium',
    timeOfDay: ['morning', 'evening'],
    weather: ['any'],
    location: 'both',
    groupSize: 'any',
    interests: ['yoga', 'wellness'],
    proximityRequired: 0,
    cost: 'free',
    accessibility: 'medium',
    tags: ['flexibility', 'calming', 'centering']
  },

  // COMMUNITY ACTIVITIES
  {
    id: 'community-local-volunteer',
    title: 'Quick Community Help',
    description: 'Spend an hour helping at a local food bank, community garden, or neighborhood cleanup.',
    type: 'community',
    duration: 60,
    energyLevel: 'medium',
    timeOfDay: ['morning', 'afternoon'],
    weather: ['sunny', 'cloudy'],
    location: 'outdoor',
    groupSize: 'any',
    interests: ['community', 'volunteering'],
    proximityRequired: 5,
    cost: 'free',
    accessibility: 'medium',
    tags: ['giving', 'meaningful', 'social']
  },
  {
    id: 'community-neighbor-check',
    title: 'Neighbor Connection',
    description: 'Check in on an elderly neighbor or someone who might appreciate company. Bring flowers or baked goods.',
    type: 'community',
    duration: 30,
    energyLevel: 'low',
    timeOfDay: ['afternoon', 'evening'],
    weather: ['any'],
    location: 'both',
    groupSize: 'solo',
    interests: ['community', 'kindness'],
    proximityRequired: 0,
    cost: 'low',
    accessibility: 'high',
    tags: ['caring', 'connection', 'kindness']
  },
  {
    id: 'community-skill-share',
    title: 'Skill Sharing Circle',
    description: 'Organize a small group where everyone teaches something they know - cooking, crafts, languages.',
    type: 'community',
    duration: 90,
    energyLevel: 'medium',
    timeOfDay: ['afternoon', 'evening'],
    weather: ['any'],
    location: 'indoor',
    groupSize: 'small',
    interests: ['learning', 'teaching'],
    proximityRequired: 2,
    cost: 'free',
    accessibility: 'high',
    tags: ['educational', 'collaborative', 'enriching']
  },

  // SEASONAL/WEATHER SPECIFIC
  {
    id: 'rainy-window-watching',
    title: 'Rain Watching Meditation',
    description: 'Sit by a window during rain and watch the droplets. Listen to the sound and feel the cozy atmosphere.',
    type: 'mindful',
    duration: 20,
    energyLevel: 'low',
    timeOfDay: ['afternoon', 'evening'],
    weather: ['rainy'],
    location: 'indoor',
    groupSize: 'solo',
    interests: ['meditation', 'nature'],
    proximityRequired: 0,
    cost: 'free',
    accessibility: 'high',
    tags: ['cozy', 'peaceful', 'contemplative']
  },
  {
    id: 'cold-hot-chocolate',
    title: 'Warming Ritual',
    description: 'Make hot chocolate from scratch on a cold day. Focus on the warmth and comfort it brings.',
    type: 'mindful',
    duration: 30,
    energyLevel: 'low',
    timeOfDay: ['afternoon', 'evening'],
    weather: ['cold'],
    location: 'indoor',
    groupSize: 'any',
    interests: ['cooking', 'comfort'],
    proximityRequired: 0,
    cost: 'low',
    accessibility: 'high',
    tags: ['warming', 'comforting', 'ritual']
  },
  {
    id: 'hot-shade-reading',
    title: 'Shaded Reading Time',
    description: 'Find a cool, shaded spot outside and read for pleasure. Bring a cold drink and enjoy the breeze.',
    type: 'mindful',
    duration: 45,
    energyLevel: 'low',
    timeOfDay: ['morning', 'afternoon'],
    weather: ['hot'],
    location: 'outdoor',
    groupSize: 'solo',
    interests: ['reading'],
    proximityRequired: 1,
    equipment: ['book'],
    cost: 'free',
    accessibility: 'high',
    tags: ['relaxing', 'educational', 'cool']
  }
];

// Helper functions for filtering activities
export const filterActivitiesByContext = (
  activities: ActivityTemplate[],
  context: {
    energyLevel?: 'low' | 'medium' | 'high';
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    weather?: string;
    location?: 'indoor' | 'outdoor' | 'both';
    groupSize?: 'solo' | 'pair' | 'small' | 'large' | 'any';
    interests?: string[];
    proximityRadius?: number;
    duration?: number; // max duration in minutes
  }
): ActivityTemplate[] => {
  return activities.filter(activity => {
    // Energy level match
    if (context.energyLevel && activity.energyLevel !== context.energyLevel) {
      return false;
    }

    // Time of day match
    if (context.timeOfDay && !activity.timeOfDay.includes(context.timeOfDay)) {
      return false;
    }

    // Weather match
    if (context.weather && !activity.weather.includes('any') && !activity.weather.includes(context.weather as any)) {
      return false;
    }

    // Location match
    if (context.location && activity.location !== 'both' && activity.location !== context.location) {
      return false;
    }

    // Group size match
    if (context.groupSize && activity.groupSize !== 'any' && activity.groupSize !== context.groupSize) {
      return false;
    }

    // Proximity check
    if (context.proximityRadius !== undefined && activity.proximityRequired > context.proximityRadius) {
      return false;
    }

    // Duration check
    if (context.duration && activity.duration > context.duration) {
      return false;
    }

    // Interest match (if user has interests, prefer activities that match)
    if (context.interests && context.interests.length > 0) {
      const hasMatchingInterest = activity.interests.some(interest => 
        context.interests!.some(userInterest => 
          interest.toLowerCase().includes(userInterest.toLowerCase()) ||
          userInterest.toLowerCase().includes(interest.toLowerCase())
        )
      );
      // Don't filter out, but we can use this for scoring later
    }

    return true;
  });
};

export const scoreActivityRelevance = (
  activity: ActivityTemplate,
  userInterests: string[],
  recentActivities: string[] = []
): number => {
  let score = 0;

  // Interest matching (high weight)
  const interestMatches = activity.interests.filter(interest => 
    userInterests.some(userInterest => 
      interest.toLowerCase().includes(userInterest.toLowerCase()) ||
      userInterest.toLowerCase().includes(interest.toLowerCase())
    )
  ).length;
  score += interestMatches * 10;

  // Variety bonus (avoid recent activity types)
  if (!recentActivities.includes(activity.type)) {
    score += 5;
  }

  // Accessibility bonus
  if (activity.accessibility === 'high') {
    score += 3;
  }

  // Free activity bonus
  if (activity.cost === 'free') {
    score += 2;
  }

  return score;
};

export const getRandomActivity = (
  filteredActivities: ActivityTemplate[],
  userInterests: string[] = [],
  recentActivities: string[] = []
): ActivityTemplate | null => {
  if (filteredActivities.length === 0) return null;

  // Score all activities
  const scoredActivities = filteredActivities.map(activity => ({
    activity,
    score: scoreActivityRelevance(activity, userInterests, recentActivities)
  }));

  // Sort by score (highest first)
  scoredActivities.sort((a, b) => b.score - a.score);

  // Use weighted random selection (higher scores more likely)
  const totalScore = scoredActivities.reduce((sum, item) => sum + Math.max(item.score, 1), 0);
  let random = Math.random() * totalScore;

  for (const item of scoredActivities) {
    random -= Math.max(item.score, 1);
    if (random <= 0) {
      return item.activity;
    }
  }

  // Fallback to first activity
  return scoredActivities[0]?.activity || null;
};

// Export categories for UI
export const ACTIVITY_CATEGORIES = {
  solo: 'Solo Time',
  social: 'Social Connection',
  nature: 'Nature & Outdoors',
  mindful: 'Mindful Moments',
  creative: 'Creative Expression',
  movement: 'Movement & Energy',
  community: 'Community & Service'
};

export const ENERGY_LEVELS = {
  low: 'Gentle & Restorative',
  medium: 'Moderate Engagement',
  high: 'Active & Energizing'
};

export const TIME_PERIODS = {
  morning: 'Morning (6AM - 12PM)',
  afternoon: 'Afternoon (12PM - 5PM)',
  evening: 'Evening (5PM - 9PM)',
  night: 'Night (9PM - 6AM)'
};