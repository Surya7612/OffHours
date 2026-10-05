import React from 'react';
import { CheckCircle, RotateCcw } from 'lucide-react';

interface SuccessMessageProps {
  onReset: () => void;
}

export const SuccessMessage: React.FC<SuccessMessageProps> = ({ onReset }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto text-center">
      <div className="mb-6">
        <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Enjoy your time off! 🌟
        </h2>
        <p className="text-gray-600">
          Take this moment to truly disconnect and be present. You've earned this pause.
        </p>
      </div>
      
      <button
        onClick={onReset}
        className="flex items-center gap-2 mx-auto px-6 py-3 text-emerald-600 hover:text-emerald-700 font-medium transition-colors duration-200"
      >
        <RotateCcw className="w-4 h-4" />
        Get another suggestion
      </button>
    </div>
  );
};