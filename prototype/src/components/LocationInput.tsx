import React, { useState } from 'react';
import { MapPin, Cloud, Clock } from 'lucide-react';

interface LocationInputProps {
  onSubmit: (data: {
    location: string;
    weather: string;
    time: string;
    vibe: string[];
    energy: string;
  }) => void;
}

export const LocationInput: React.FC<LocationInputProps> = ({ onSubmit }) => {
  const [location, setLocation] = useState('');
  const [weather, setWeather] = useState('');
  const [time, setTime] = useState('');
  const [vibe, setVibe] = useState<string[]>([]);
  const [energy, setEnergy] = useState('');

  const vibeOptions = [
    'urban', 'suburban', 'rural', 'coastal', 'mountainous',
    'busy', 'quiet', 'relaxed', 'energetic', 'artistic',
    'near water', 'historic', 'modern', 'green spaces'
  ];

  const handleVibeToggle = (option: string) => {
    setVibe(prev => 
      prev.includes(option) 
        ? prev.filter(v => v !== option)
        : [...prev, option]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (location && weather && time) {
      onSubmit({ location, weather, time, vibe, energy });
    }
  };

  const getCurrentTime = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    setTime(timeString);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">OffHours</h1>
        <p className="text-gray-600">Let's find your perfect unwind activity</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <MapPin className="w-4 h-4" />
            Where are you?
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Jersey City, NJ"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
            required
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Cloud className="w-4 h-4" />
            Current weather
          </label>
          <input
            type="text"
            value={weather}
            onChange={(e) => setWeather(e.target.value)}
            placeholder="e.g., clear skies, 72°F"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
            required
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4" />
            Current time
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="e.g., 6:03 PM"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
              required
            />
            <button
              type="button"
              onClick={getCurrentTime}
              className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors duration-200"
            >
              Now
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-3 block">
            Neighborhood vibe (select all that apply)
          </label>
          <div className="flex flex-wrap gap-2">
            {vibeOptions.map(option => (
              <button
                key={option}
                type="button"
                onClick={() => handleVibeToggle(option)}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  vibe.includes(option)
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-3 block">
            Energy level (optional)
          </label>
          <div className="flex gap-2">
            {['low', 'medium', 'high'].map(level => (
              <button
                key={level}
                type="button"
                onClick={() => setEnergy(energy === level ? '' : level)}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  energy === level
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
        >
          Get My Activity ✨
        </button>
      </form>
    </div>
  );
};