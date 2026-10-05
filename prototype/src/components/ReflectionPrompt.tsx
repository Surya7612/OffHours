import React, { useState } from 'react';
import { Heart, Edit3 } from 'lucide-react';

interface ReflectionPromptProps {
  onSubmit: (reflection: string) => void;
  onSkip: () => void;
}

const reflectionPrompts = [
  "How did that moment make you feel?",
  "What did you notice that you hadn't before?",
  "Who or what are you grateful for right now?",
  "What was the most present you felt today?",
  "How did connecting with others (or yourself) change your evening?"
];

export const ReflectionPrompt: React.FC<ReflectionPromptProps> = ({ onSubmit, onSkip }) => {
  const [reflection, setReflection] = useState('');
  const [prompt] = useState(() => 
    reflectionPrompts[Math.floor(Math.random() * reflectionPrompts.length)]
  );

  const handleSubmit = () => {
    if (reflection.trim()) {
      onSubmit(reflection);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Beautiful moment! ✨
          </h2>
          <p className="text-gray-600">
            Take a moment to reflect on your experience
          </p>
        </div>

        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Edit3 className="w-4 h-4" />
            {prompt}
          </label>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Share what's on your heart..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 resize-none"
            rows={4}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={!reflection.trim()}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            Reflect (+10 points)
          </button>
          <button
            onClick={onSkip}
            className="px-6 py-3 text-gray-500 hover:text-gray-700 font-medium transition-colors duration-200"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
};