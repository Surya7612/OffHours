import { useState, useEffect } from 'react';
import { revenueCat } from '../utils/revenueCat';

interface SubscriptionStatus {
  hasAccess: boolean;
  isTrialActive: boolean;
  daysRemaining: number;
  plan: any;
  loading: boolean;
}

export const useSubscription = (userId: string | null) => {
  const [status, setStatus] = useState<SubscriptionStatus>({
    hasAccess: false,
    isTrialActive: false,
    daysRemaining: 0,
    plan: null,
    loading: true
  });

  useEffect(() => {
    if (!userId) {
      setStatus(prev => ({ ...prev, loading: false }));
      return;
    }

    const checkSubscription = async () => {
      try {
        const subscriptionStatus = await revenueCat.getSubscriptionStatus(userId);
        setStatus({
          ...subscriptionStatus,
          loading: false
        });
      } catch (error) {
        console.error('Error checking subscription:', error);
        setStatus(prev => ({ ...prev, loading: false }));
      }
    };

    checkSubscription();

    // Check subscription status every 5 minutes
    const interval = setInterval(checkSubscription, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userId]);

  const purchaseSubscription = async (planId: string, couponCode?: string) => {
    if (!userId) return { success: false, error: 'User not found' };

    try {
      const result = await revenueCat.purchaseSubscription(userId, planId, couponCode);
      
      if (result.success) {
        // Refresh subscription status
        const subscriptionStatus = await revenueCat.getSubscriptionStatus(userId);
        setStatus({
          ...subscriptionStatus,
          loading: false
        });
      }
      
      return result;
    } catch (error) {
      console.error('Purchase failed:', error);
      return { success: false, error: 'Purchase failed' };
    }
  };

  const cancelSubscription = async () => {
    if (!userId) return { success: false, error: 'User not found' };

    try {
      const result = await revenueCat.cancelSubscription(userId);
      
      if (result.success) {
        // Refresh subscription status
        const subscriptionStatus = await revenueCat.getSubscriptionStatus(userId);
        setStatus({
          ...subscriptionStatus,
          loading: false
        });
      }
      
      return result;
    } catch (error) {
      console.error('Cancellation failed:', error);
      return { success: false, error: 'Cancellation failed' };
    }
  };

  return {
    ...status,
    purchaseSubscription,
    cancelSubscription
  };
};