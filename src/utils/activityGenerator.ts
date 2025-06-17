import { UserContext, ActivitySuggestion, WeatherInfo } from '../types';

const parseWeather = (weatherSummary: string): WeatherInfo => {
  const tempMatch = weatherSummary.match(/(\d+)°?F?/);
  const temperature = tempMatch ? parseInt(tempMatch[1]) : 70;
  
  const condition = weatherSummary.toLowerCase();
  const isNice = !condition.includes('rain') && 
                 !condition.includes('storm') && 
                 !condition.includes('snow') && 
                 temperature >= 50 && temperature <= 85;
  
  return {
    temperature,
    condition: weatherSummary,
    isNice
  };
};

const getTimeOfDay = (timeString: string): 'morning' | 'afternoon' | 'evening' | 'night' => {
  const hour = parseInt(timeString.split(':')[0]);
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

const outdoorActivities = {
  morning: [
    {
      title: "Morning Reset Walk",
      nudge: "Step outside and breathe in the fresh morning air. Take a 20-minute walk around your neighborhood and notice three things you've never seen before.",
      type: "nature" as const
    },
    {
      title: "Coffee Shop Connection",
      nudge: "Visit a local coffee shop without your laptop or phone. Sit by the window, people-watch, and maybe strike up a conversation with someone new.",
      type: "social" as const
    }
  ],
  afternoon: [
    {
      title: "Park Bench Pause",
      nudge: "Find a quiet bench in a nearby park. Sit for 15 minutes and just observe the world around you—no agenda, just presence.",
      type: "mindful" as const
    },
    {
      title: "Neighborhood Explorer",
      nudge: "Take a different route home today. Walk slowly and discover a street or shop you've never noticed before.",
      type: "solo" as const
    }
  ],
  evening: [
    {
      title: "Golden Hour Unplug",
      nudge: "Step outside and leave your phone behind. Find a spot to watch the sunset and let your thoughts wander freely for 20 minutes.",
      type: "nature" as const
    },
    {
      title: "Evening Stroll & Chat",
      nudge: "Call a friend or family member and take a walk while you talk. Let the conversation flow naturally as you move through your neighborhood.",
      type: "social" as const
    }
  ],
  night: [
    {
      title: "Stargazing Moment",
      nudge: "Step outside and look up at the night sky for 10 minutes. No phone, no distractions—just you and the vastness above.",
      type: "mindful" as const
    },
    {
      title: "Night Air Reset",
      nudge: "Take a short walk around the block to clear your head. Feel the cool night air and let the day's stress melt away.",
      type: "solo" as const
    }
  ]
};

const indoorActivities = {
  morning: [
    {
      title: "Mindful Morning Tea",
      nudge: "Brew your favorite tea or coffee and sit by a window. Spend 15 minutes just sipping and watching the world wake up outside.",
      type: "mindful" as const
    },
    {
      title: "Call Someone You Miss",
      nudge: "Think of someone you haven't spoken to in a while. Pick up the phone and have a real conversation—no texting allowed.",
      type: "social" as const
    }
  ],
  afternoon: [
    {
      title: "Creative Hand Time",
      nudge: "Find paper and a pen. Spend 20 minutes drawing, writing, or doodling whatever comes to mind. No judgment, just creation.",
      type: "solo" as const
    },
    {
      title: "Cozy Reading Nook",
      nudge: "Create a comfortable spot with pillows and blankets. Read a few pages of a book or magazine—something that feeds your soul.",
      type: "mindful" as const
    }
  ],
  evening: [
    {
      title: "Kitchen Connection",
      nudge: "Cook something simple with your hands—no recipes, just intuition. Focus on the textures, smells, and process of creating.",
      type: "solo" as const
    },
    {
      title: "Living Room Gathering",
      nudge: "Invite a neighbor or friend over for tea. Sit together without screens and share stories about your day.",
      type: "social" as const
    }
  ],
  night: [
    {
      title: "Candlelight Reflection",
      nudge: "Light a candle and sit quietly for 15 minutes. Let the gentle flame help you process the day and find peace.",
      type: "mindful" as const
    },
    {
      title: "Gratitude Journal",
      nudge: "Write down three things you're grateful for today. Use pen and paper, and really think about why each one matters.",
      type: "solo" as const
    }
  ]
};

export const generateActivitySuggestion = (context: UserContext): ActivitySuggestion => {
  const weather = parseWeather(context.weather_summary);
  const timeOfDay = getTimeOfDay(context.local_time);
  
  const activities = weather.isNice ? outdoorActivities[timeOfDay] : indoorActivities[timeOfDay];
  
  // Add some variety based on energy level and location vibes
  let filteredActivities = [...activities];
  
  if (context.energy_level === 'low') {
    filteredActivities = activities.filter(a => a.type === 'mindful' || a.type === 'solo');
  } else if (context.energy_level === 'high') {
    filteredActivities = activities.filter(a => a.type === 'social' || a.type === 'nature');
  }
  
  // If no activities match the filter, use all activities
  if (filteredActivities.length === 0) {
    filteredActivities = activities;
  }
  
  // Select a random activity
  const randomIndex = Math.floor(Math.random() * filteredActivities.length);
  return filteredActivities[randomIndex];
};