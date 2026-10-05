import React, { useState } from 'react';
import { Users, MapPin, Calendar, ChevronRight, Check } from 'lucide-react';
import { Pod } from '../types';
import { createAllMockPods } from '../utils/mockData';

interface PodSelectorProps {
  userLocation: string;
  onSelectPod: (pod: Pod) => void;
  selectedPodId?: string;
}

export const PodSelector: React.FC<PodSelectorProps> = ({ 
  userLocation, 
  onSelectPod, 
  selectedPodId 
}) => {
  const [availablePods] = useState<Pod[]>(createAllMockPods(userLocation));
  const [selectedPod, setSelectedPod] = useState<string | null>(selectedPodId || null);

  const handleSelectPod = (pod: Pod) => {
    setSelectedPod(pod.id);
    onSelectPod(pod);
  };

  const getDistanceText = (pod: Pod) => {
    // Mock distance calculation based on location
    const distances: Record<string, string> = {
      'pod-jc-downtown': '0.2 km away',
      'pod-jc-newport': '1.5 km away',
      'pod-jc-heights': '2.1 km away',
      'pod-manhattan-lower': '3.2 km away',
      'pod-brooklyn-park-slope': '8.5 km away',
      'pod-queens-astoria': '12.3 km away'
    };
    return distances[pod.id] || '2.0 km away';
  };

  const getActivityStatus = (pod: Pod) => {
    if (!pod.weeklyActivity) return 'No activity planned';
    
    const { status, votes } = pod.weeklyActivity;
    const yesVotes = votes.filter(v => v.vote === 'yes').length;
    const totalVotes = votes.length;
    
    if (status === 'voting') {
      return `${yesVotes}/${totalVotes} voted yes`;
    }
    return 'Activity confirmed';
  };

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20 dark:border-gray-700/20">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          Choose Your Pod
        </h3>
      </div>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Join a local community pod to participate in group activities and connect with like-minded people nearby.
      </p>

      <div className="space-y-3">
        {availablePods.map(pod => (
          <div
            key={pod.id}
            onClick={() => handleSelectPod(pod)}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
              selectedPod === pod.id
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                : 'border-gray-200 dark:border-gray-600 hover:border-emerald-300 dark:hover:border-emerald-600'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-gray-800 dark:text-white">
                    {pod.name}
                  </h4>
                  {selectedPod === pod.id && (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{pod.members.length} members</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{getDistanceText(pod)}</span>
                  </div>
                </div>

                {pod.weeklyActivity && (
                  <div className="bg-white/50 dark:bg-gray-700/50 rounded-lg p-3 mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                        This Week's Activity
                      </span>
                    </div>
                    <h5 className="font-medium text-gray-800 dark:text-white text-sm">
                      {pod.weeklyActivity.title}
                    </h5>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {getActivityStatus(pod)}
                    </p>
                  </div>
                )}

                <div className="flex -space-x-1">
                  {pod.members.slice(0, 4).map((member, index) => (
                    <div
                      key={member.id}
                      className="w-6 h-6 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-white text-xs font-medium"
                      title={member.firstName}
                    >
                      {member.avatar}
                    </div>
                  ))}
                  {pod.members.length > 4 && (
                    <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs font-medium">
                      +{pod.members.length - 4}
                    </div>
                  )}
                </div>
              </div>
              
              <ChevronRight className={`w-5 h-5 transition-transform duration-200 ${
                selectedPod === pod.id 
                  ? 'text-emerald-600 dark:text-emerald-400 rotate-90' 
                  : 'text-gray-400'
              }`} />
            </div>
          </div>
        ))}
      </div>

      {selectedPod && (
        <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
          <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
            ✅ Pod selected! You'll receive invitations for group activities and can participate in weekly votes.
          </p>
        </div>
      )}
    </div>
  );
};