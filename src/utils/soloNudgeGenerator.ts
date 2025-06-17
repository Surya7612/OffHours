import { SoloNudge, User } from '../types';

const soloNudgeTemplates = [
  {
    title: "Mindful Breathing Space",
    description: "Find a quiet corner, close your eyes, and take 10 deep breaths. Notice how your body feels with each exhale.",
    type: "mindful" as const,
    duration: 10
  },
  {
    title: "Gratitude Reflection",
    description: "Write down three things you're grateful for today. Take time to really feel the appreciation in your heart.",
    type: "reflection" as const,
    duration: 15
  },
  {
    title: "Creative Doodling",
    description: "Grab paper and pen. Draw whatever comes to mind for 20 minutes. No judgment, just let your creativity flow.",
    type: "creative" as const,
    duration: 20
  },
  {
    title: "Solo Nature Walk",
    description: "Step outside and walk slowly for 25 minutes. Leave your phone behind and notice the world around you.",
    type: "nature" as const,
    duration: 25,
    location: "Nearby park or quiet street"
  },
  {
    title: "Gentle Stretching",
    description: "Move your body gently. Stretch, roll your shoulders, touch your toes. Listen to what your body needs.",
    type: "movement" as const,
    duration: 15
  },
  {
    title: "Tea Meditation",
    description: "Brew your favorite tea or coffee. Sit quietly and savor each sip mindfully, feeling the warmth and taste.",
    type: "mindful" as const,
    duration: 20
  },
  {
    title: "Memory Lane Journal",
    description: "Write about a happy memory from this week. Relive the moment and notice what made it special.",
    type: "reflection" as const,
    duration: 15
  },
  {
    title: "Window Gazing",
    description: "Sit by a window and watch the world outside for 10 minutes. No phone, no agenda, just observing life.",
    type: "mindful" as const,
    duration: 10
  },
  {
    title: "Hand Lettering Practice",
    description: "Write out a meaningful quote or poem by hand. Focus on making each letter beautiful and intentional.",
    type: "creative" as const,
    duration: 25
  },
  {
    title: "Barefoot Grounding",
    description: "If possible, step outside barefoot for 10 minutes. Feel the earth beneath your feet and breathe deeply.",
    type: "nature" as const,
    duration: 10,
    location: "Backyard, balcony, or nearby grass"
  }
];

export const generateSoloNudge = (user: User): SoloNudge => {
  // Filter based on user interests and energy level
  let filteredNudges = [...soloNudgeTemplates];
  
  if (user.preferences.energyLevel === 'low') {
    filteredNudges = soloNudgeTemplates.filter(n => 
      n.type === 'mindful' || n.type === 'reflection' || n.duration <= 15
    );
  } else if (user.preferences.energyLevel === 'high') {
    filteredNudges = soloNudgeTemplates.filter(n => 
      n.type === 'movement' || n.type === 'nature' || n.type === 'creative'
    );
  }

  // Prefer activities that match user interests
  const interestMatches = filteredNudges.filter(nudge => {
    const nudgeKeywords = [nudge.type, nudge.title.toLowerCase()];
    return user.preferences.interests.some(interest => 
      nudgeKeywords.some(keyword => keyword.includes(interest.toLowerCase()))
    );
  });

  const selectedNudges = interestMatches.length > 0 ? interestMatches : filteredNudges;
  const randomIndex = Math.floor(Math.random() * selectedNudges.length);
  const template = selectedNudges[randomIndex];

  return {
    id: `solo-nudge-${Date.now()}`,
    title: template.title,
    description: template.description,
    type: template.type,
    duration: template.duration,
    location: template.location,
    scheduledTime: new Date()
  };
};