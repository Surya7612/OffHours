import React, { useState } from 'react';
import { MapPin, Clock, Heart, Users, Navigation } from 'lucide-react';

interface WelcomeScreenProps {
  onComplete: (userData: {
    firstName: string;
    location: string;
    nudgeTime: string;
    interests: string[];
    proximityRadius: number;
  }) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [location, setLocation] = useState('');
  const [nudgeTime, setNudgeTime] = useState('18:00');
  const [interests, setInterests] = useState<string[]>([]);
  const [proximityRadius, setProximityRadius] = useState(2); // Default 2km

  const interestOptions = [
    'Walking', 'Cooking', 'Reading', 'Journaling', 'Photography',
    'Gardening', 'Music', 'Art', 'Meditation', 'Coffee', 'Tea',
    'Conversations', 'Nature', 'Community', 'Learning'
  ];

  const proximityOptions = [
    { value: 1, label: '1km - Very close (5-10 min walk)' },
    { value: 2, label: '2km - Close (10-20 min walk)' },
    { value: 5, label: '5km - Nearby (15-30 min travel)' },
    { value: 10, label: '10km - Extended area (30+ min travel)' }
  ];

  const handleInterestToggle = (interest: string) => {
    setInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSubmit = () => {
    onComplete({ firstName, location, nudgeTime, interests, proximityRadius });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">OffHours</h1>
          <p className="text-gray-600 dark:text-gray-400">Reclaim your 6PM. Reconnect, for real.</p>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                What should we call you?
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Your first name"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <MapPin className="w-4 h-4" />
                Where are you based?
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
              >
                <option value="">Select your area</option>
                <option value="jersey-city">Jersey City, NJ</option>
                <option value="manhattan">Manhattan, NYC</option>
                <option value="brooklyn">Brooklyn, NYC</option>
                <option value="queens">Queens, NYC</option>
                <option value="bronx">Bronx, NYC</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Navigation className="w-4 h-4" />
                Activity proximity preference
              </label>
              <select
                value={proximityRadius}
                onChange={(e) => setProximityRadius(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
              >
                {proximityOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                How far are you willing to travel for activities?
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Clock className="w-4 h-4" />
                When should we nudge you?
              </label>
              <select
                value={nudgeTime}
                onChange={(e) => setNudgeTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
              >
                <option value="17:00">5:00 PM</option>
                <option value="17:30">5:30 PM</option>
                <option value="18:00">6:00 PM</option>
                <option value="18:30">6:30 PM</option>
                <option value="19:00">7:00 PM</option>
              </select>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!firstName || !location}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                What draws you to real-life moments?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Select what resonates with you (optional)
              </p>
              <div className="flex flex-wrap gap-2">
                {interestOptions.map(interest => (
                  <button
                    key={interest}
                    onClick={() => handleInterestToggle(interest)}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      interests.includes(interest)
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-medium text-emerald-800 dark:text-emerald-300">Your Local Pod</span>
              </div>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                You'll be matched with 5-10 people within {proximityRadius}km who share similar goals for authentic connection.
              </p>
            </div>

            <button
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Join OffHours ✨
            </button>
          </div>
        )}
      </div>
    </div>
  );
};