// RevenueCat integration for subscription management
// This is a mock implementation - in production, use the actual RevenueCat SDK

export interface SubscriptionPlan {
  id: string;
  productId: string;
  price: number;
  period: 'monthly' | 'yearly';
  trialDays: number;
}

export interface UserSubscription {
  isActive: boolean;
  plan: SubscriptionPlan | null;
  expiresAt: Date | null;
  isTrialActive: boolean;
  trialExpiresAt: Date | null;
  cancelledAt: Date | null;
  isFirst50User?: boolean;
  couponApplied?: string;
}

export class RevenueCatService {
  private static instance: RevenueCatService;
  
  private constructor() {}

  static getInstance(): RevenueCatService {
    if (!RevenueCatService.instance) {
      RevenueCatService.instance = new RevenueCatService();
    }
    return RevenueCatService.instance;
  }

  // Initialize RevenueCat SDK
  async initialize(apiKey: string): Promise<void> {
    console.log('RevenueCat initialized with API key:', apiKey);
    // In production: await Purchases.configure({ apiKey });
  }

  // Get available subscription plans
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    // Mock plans - in production, fetch from RevenueCat
    return [
      {
        id: 'monthly_plan',
        productId: 'offhours_monthly_4_99',
        price: 4.00,
        period: 'monthly',
        trialDays: 3
      },
      {
        id: 'yearly_plan',
        productId: 'offhours_yearly_24_99',
        price: 24.00, // Regular price (50% off the original $48)
        period: 'yearly',
        trialDays: 3
      }
    ];
  }

  // Check if user is eligible for first 50 discount
  private isFirst50User(userId: string): boolean {
    const userNumber = parseInt(userId.split('-')[1] || '999');
    const totalUsers = parseInt(localStorage.getItem('total_user_count') || '0');
    
    // User is eligible if they're in first 50 AND total count is still under 50
    return userNumber <= 50 && totalUsers < 50;
  }

  // Get user's current subscription status
  async getUserSubscription(userId: string): Promise<UserSubscription> {
    const saved = localStorage.getItem(`subscription_${userId}`);
    
    if (saved) {
      try {
        const data = JSON.parse(saved);
        return {
          ...data,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          trialExpiresAt: data.trialExpiresAt ? new Date(data.trialExpiresAt) : null,
          cancelledAt: data.cancelledAt ? new Date(data.cancelledAt) : null
        };
      } catch (error) {
        console.error('Error parsing subscription data:', error);
      }
    }

    // Default: new user gets 3-day trial
    const trialExpiresAt = new Date();
    trialExpiresAt.setDate(trialExpiresAt.getDate() + 3);

    return {
      isActive: true,
      plan: null,
      expiresAt: null,
      isTrialActive: true,
      trialExpiresAt,
      cancelledAt: null,
      isFirst50User: this.isFirst50User(userId)
    };
  }

  // Purchase a subscription
  async purchaseSubscription(
    userId: string, 
    planId: string, 
    couponCode?: string
  ): Promise<{ success: boolean; subscription?: UserSubscription; error?: string }> {
    try {
      const plans = await this.getSubscriptionPlans();
      const plan = plans.find(p => p.id === planId);
      
      if (!plan) {
        return { success: false, error: 'Plan not found' };
      }

      // Check if user is eligible for first 50 discount
      const isFirst50 = this.isFirst50User(userId);
      
      // Apply coupon discount only for first 50 users
      let finalPrice = plan.price;
      let appliedCoupon = '';
      
      if (couponCode === 'FIRST50' && plan.period === 'yearly' && isFirst50) {
        finalPrice = 12.00; // 50% off the yearly plan for first 50 users
        appliedCoupon = couponCode;
        
        // Increment the user count
        const currentCount = parseInt(localStorage.getItem('total_user_count') || '0');
        localStorage.setItem('total_user_count', (currentCount + 1).toString());
      } else if (couponCode && !isFirst50) {
        return { success: false, error: 'Coupon is only valid for the first 50 users' };
      }

      // Create subscription
      const expiresAt = new Date();
      if (plan.period === 'monthly') {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      }

      const subscription: UserSubscription = {
        isActive: true,
        plan: { ...plan, price: finalPrice },
        expiresAt,
        isTrialActive: false,
        trialExpiresAt: null,
        cancelledAt: null,
        isFirst50User: isFirst50,
        couponApplied: appliedCoupon
      };

      // Save subscription
      localStorage.setItem(`subscription_${userId}`, JSON.stringify(subscription));

      // Log purchase event
      this.logPurchaseEvent(userId, plan, finalPrice, appliedCoupon);

      return { success: true, subscription };
    } catch (error) {
      console.error('Purchase failed:', error);
      return { success: false, error: 'Purchase failed' };
    }
  }

  // Cancel subscription
  async cancelSubscription(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription.isActive) {
        return { success: false, error: 'No active subscription' };
      }

      const updatedSubscription = {
        ...subscription,
        cancelledAt: new Date()
      };

      localStorage.setItem(`subscription_${userId}`, JSON.stringify(updatedSubscription));

      return { success: true };
    } catch (error) {
      console.error('Cancellation failed:', error);
      return { success: false, error: 'Cancellation failed' };
    }
  }

  // Restore purchases (for mobile apps)
  async restorePurchases(userId: string): Promise<{ success: boolean; subscription?: UserSubscription }> {
    // In production: await Purchases.restorePurchases();
    const subscription = await this.getUserSubscription(userId);
    return { success: true, subscription };
  }

  // Check if user has access to premium features
  async hasActiveSubscription(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    
    if (subscription.isTrialActive && subscription.trialExpiresAt) {
      return new Date() < subscription.trialExpiresAt;
    }
    
    if (subscription.isActive && subscription.expiresAt && !subscription.cancelledAt) {
      return new Date() < subscription.expiresAt;
    }
    
    return false;
  }

  // Get subscription status for UI
  async getSubscriptionStatus(userId: string): Promise<{
    hasAccess: boolean;
    isTrialActive: boolean;
    daysRemaining: number;
    plan: SubscriptionPlan | null;
    isFirst50User: boolean;
  }> {
    const subscription = await this.getUserSubscription(userId);
    const now = new Date();
    
    let hasAccess = false;
    let isTrialActive = false;
    let daysRemaining = 0;
    
    if (subscription.isTrialActive && subscription.trialExpiresAt) {
      hasAccess = now < subscription.trialExpiresAt;
      isTrialActive = hasAccess;
      daysRemaining = Math.ceil((subscription.trialExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    } else if (subscription.isActive && subscription.expiresAt && !subscription.cancelledAt) {
      hasAccess = now < subscription.expiresAt;
      daysRemaining = Math.ceil((subscription.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    return {
      hasAccess,
      isTrialActive,
      daysRemaining: Math.max(0, daysRemaining),
      plan: subscription.plan,
      isFirst50User: this.isFirst50User(userId)
    };
  }

  // Get current user count for first 50 tracking
  getCurrentUserCount(): number {
    return parseInt(localStorage.getItem('total_user_count') || '0');
  }

  // Get remaining spots for first 50 promotion
  getRemainingFirst50Spots(): number {
    return Math.max(0, 50 - this.getCurrentUserCount());
  }

  // Analytics and logging
  private logPurchaseEvent(
    userId: string, 
    plan: SubscriptionPlan, 
    price: number, 
    couponCode?: string
  ): void {
    const event = {
      event: 'subscription_purchased',
      userId,
      planId: plan.id,
      originalPrice: plan.price,
      finalPrice: price,
      discount: plan.price - price,
      couponCode,
      isFirst50User: this.isFirst50User(userId),
      timestamp: new Date().toISOString()
    };
    
    console.log('Purchase event:', event);
    
    // In production: send to analytics service
    // analytics.track('subscription_purchased', event);
  }

  // Webhook handling for subscription updates
  async handleWebhook(webhookData: any): Promise<void> {
    console.log('Webhook received:', webhookData);
    
    // In production: handle RevenueCat webhook events
    // - INITIAL_PURCHASE
    // - RENEWAL
    // - CANCELLATION
    // - BILLING_ISSUE
    // - PRODUCT_CHANGE
  }
}

// Export singleton instance
export const revenueCat = RevenueCatService.getInstance();

// Initialize RevenueCat (in production, use your actual API key)
revenueCat.initialize('your_revenuecat_api_key_here');