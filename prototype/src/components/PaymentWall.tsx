import React, { useState, useEffect } from 'react';
import { Crown, Check, X, Gift, Star, Zap, Shield, Users, Calendar, Trophy } from 'lucide-react';
import { User } from '../types';

interface PaymentWallProps {
  user: User;
  onSubscribe: (plan: 'monthly' | 'yearly', couponCode?: string) => void;
  onClose: () => void;
  showTrialExpired?: boolean;
}

interface PricingPlan {
  id: 'monthly' | 'yearly';
  name: string;
  price: number;
  originalPrice?: number;
  period: string;
  savings?: string;
  features: string[];
  popular?: boolean;
  couponPrice?: number;
}

export const PaymentWall: React.FC<PaymentWallProps> = ({ 
  user, 
  onSubscribe, 
  onClose, 
  showTrialExpired = false 
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [isFirst50User, setIsFirst50User] = useState(false);

  const plans: PricingPlan[] = [
    {
      id: 'monthly',
      name: 'Monthly',
      price: 4.00,
      period: 'per month',
      features: [
        'Unlimited daily nudges',
        'Join local pods',
        'Activity tracking & calendar',
        'Achievement system',
        'Community events',
        'Premium support'
      ]
    },
    {
      id: 'yearly',
      name: 'Yearly',
      price: 24.00,
      originalPrice: 48.00,
      period: 'per year',
      savings: 'Save 50%',
      popular: true,
      couponPrice: 12.00,
      features: [
        'Everything in Monthly',
        '2 months FREE',
        'Priority pod placement',
        'Early access to features',
        'Exclusive community events',
        'Personal presence coach'
      ]
    }
  ];

  const validCoupons = ['FIRST50', 'EARLYBIRD', 'WELCOME50'];

  useEffect(() => {
    const checkFirst50Status = () => {
      const userCount = parseInt(localStorage.getItem('total_user_count') || '0');
      const userNumber = parseInt(user.id.split('-')[1] || '999');
      
      const isEligible = userNumber <= 50 && userCount < 50;
      
      setIsFirst50User(isEligible);
      setShowCouponInput(isEligible);
      
      if (isEligible) {
        setCouponCode('FIRST50');
      }
    };

    checkFirst50Status();
  }, [user.id]);

  const handleCouponApply = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isFirst50User) {
      alert('This coupon is only valid for the first 50 users. The promotion has ended.');
      return;
    }

    if (validCoupons.includes(couponCode.toUpperCase())) {
      setCouponApplied(true);
      setShowCouponInput(false);
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Coupon Applied! 🎉', {
          body: '50% discount applied to your yearly subscription!',
          icon: '/favicon.ico',
          tag: 'coupon-success'
        });
      }
    } else {
      alert('Invalid coupon code. Please try again.');
    }
  };

  const handleSubscribe = async () => {
    setIsProcessing(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const finalCouponCode = (couponApplied && isFirst50User) ? couponCode : undefined;
      
      onSubscribe(selectedPlan, finalCouponCode);
      
      if (finalCouponCode) {
        const currentCount = parseInt(localStorage.getItem('total_user_count') || '0');
        localStorage.setItem('total_user_count', (currentCount + 1).toString());
      }
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Welcome to OffHours Pro! 🌟', {
          body: 'Your subscription is now active. Enjoy unlimited access!',
          icon: '/favicon.ico',
          tag: 'subscription-success'
        });
      }
      
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getDisplayPrice = (plan: PricingPlan) => {
    if (plan.id === 'yearly' && couponApplied && isFirst50User && plan.couponPrice) {
      return plan.couponPrice;
    }
    return plan.price;
  };

  const getMonthlyEquivalent = (plan: PricingPlan) => {
    const price = getDisplayPrice(plan);
    if (plan.id === 'yearly') {
      return (price / 12).toFixed(2);
    }
    return price.toFixed(2);
  };

  const getCurrentUserCount = () => {
    return parseInt(localStorage.getItem('total_user_count') || '0');
  };

  const getRemainingSpots = () => {
    return Math.max(0, 50 - getCurrentUserCount());
  };

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-fadeIn">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto animate-slideUp border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-t-3xl p-8 text-white overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16 animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 translate-y-12 animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 w-16 h-16 bg-white rounded-full -translate-x-8 -translate-y-8 animate-pulse delay-500"></div>
          </div>
          
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 p-2 hover:bg-white/20 rounded-xl transition-all duration-200 transform hover:scale-110 z-10"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="text-center relative z-10">
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/30 animate-bounce">
              <Crown className="w-10 h-10" />
            </div>
            
            {showTrialExpired ? (
              <>
                <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent font-display">
                  Your Free Trial Has Ended
                </h1>
                <p className="text-emerald-100 text-xl leading-relaxed font-body">
                  Continue your presence journey with OffHours Pro
                </p>
              </>
            ) : (
              <>
                <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent font-display">
                  Upgrade to OffHours Pro
                </h1>
                <p className="text-emerald-100 text-xl leading-relaxed font-body">
                  Unlock unlimited access to mindful moments and community connection
                </p>
              </>
            )}
            
            <div className="flex items-center justify-center gap-3 mt-6 text-emerald-100">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-body">3-day free trial • Cancel anytime • Secure payment</span>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Trial Info */}
          {!showTrialExpired && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-2xl p-6 mb-8 text-center border border-emerald-200 dark:border-emerald-700 animate-slideUp delay-200">
              <div className="flex items-center justify-center gap-3 mb-3">
                <Gift className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-emerald-800 dark:text-emerald-300 text-lg font-display">
                  Start Your 3-Day Free Trial
                </span>
              </div>
              <p className="text-emerald-700 dark:text-emerald-400 font-body">
                Experience all Pro features risk-free. Cancel anytime during your trial.
              </p>
            </div>
          )}

          {/* First 50 Users Coupon Section */}
          {isFirst50User && showCouponInput && !couponApplied && (
            <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 dark:from-purple-900/30 dark:via-pink-900/30 dark:to-purple-900/30 rounded-2xl p-6 mb-8 border-2 border-purple-200 dark:border-purple-700 animate-slideUp delay-300">
              <div className="flex items-center gap-3 mb-4">
                <Star className="w-6 h-6 text-purple-600 dark:text-purple-400 animate-spin" />
                <span className="font-bold text-purple-800 dark:text-purple-300 text-lg font-display">
                  🎉 You're one of our first 50 users!
                </span>
              </div>
              <p className="text-purple-700 dark:text-purple-400 mb-2 font-body">
                Get 50% off your yearly subscription as a founding member.
              </p>
              <p className="text-purple-600 dark:text-purple-500 text-sm mb-4 font-body">
                Only {getRemainingSpots()} spots remaining at this price!
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="FIRST50"
                  className="flex-1 px-4 py-3 border-2 border-purple-300 dark:border-purple-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-800 dark:text-white transition-all duration-200 font-body"
                />
                <button
                  onClick={handleCouponApply}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-medium transform hover:scale-105 shadow-lg font-display"
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          {/* Coupon Applied */}
          {couponApplied && isFirst50User && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl p-6 mb-8 border-2 border-green-200 dark:border-green-700 animate-slideUp delay-300">
              <div className="flex items-center gap-3 text-green-800 dark:text-green-300">
                <Check className="w-6 h-6 animate-bounce" />
                <span className="font-bold text-lg font-display">Founding Member Discount Applied!</span>
              </div>
              <p className="text-green-700 dark:text-green-400 mt-2 font-body">
                You're saving 50% as one of our first 50 users. Welcome to the OffHours community! 🌟
              </p>
            </div>
          )}

          {/* Show message if user is not in first 50 */}
          {!isFirst50User && getCurrentUserCount() >= 50 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-2xl p-6 mb-8 border border-amber-200 dark:border-amber-700 animate-slideUp delay-300">
              <div className="flex items-center gap-3 text-amber-800 dark:text-amber-300">
                <Star className="w-6 h-6" />
                <span className="font-bold font-display">Founding Member Promotion Ended</span>
              </div>
              <p className="text-amber-700 dark:text-amber-400 mt-1 font-body">
                The 50% discount for our first 50 users has ended. You're still getting great value with our regular pricing!
              </p>
            </div>
          )}

          {/* Pricing Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {plans.map((plan, index) => {
              const displayPrice = getDisplayPrice(plan);
              const monthlyEquivalent = getMonthlyEquivalent(plan);
              
              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative p-8 rounded-3xl border-2 cursor-pointer transition-all duration-300 transform hover:scale-105 animate-slideUp ${
                    selectedPlan === plan.id
                      ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 shadow-2xl'
                      : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 bg-white dark:bg-gray-800 hover:shadow-xl'
                  }`}
                  style={{ 
                    paddingTop: plan.popular ? '3.5rem' : '2rem',
                    animationDelay: `${index * 100}ms`
                  }}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg animate-pulse font-display">
                        Most Popular
                      </div>
                    </div>
                  )}

                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 font-display">
                      {plan.name}
                    </h3>
                    
                    <div className="mb-4">
                      {plan.originalPrice && plan.id === 'yearly' && (
                        <div className="text-lg text-gray-500 dark:text-gray-400 line-through">
                          ${plan.originalPrice.toFixed(2)}
                        </div>
                      )}
                      <div className="text-4xl font-bold text-gray-800 dark:text-white font-display">
                        ${displayPrice.toFixed(2)}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 font-body">
                        {plan.period}
                      </div>
                    </div>

                    {plan.id === 'yearly' && (
                      <div className="text-emerald-600 dark:text-emerald-400 font-medium mb-2 font-body">
                        ${monthlyEquivalent}/month
                      </div>
                    )}

                    {plan.savings && (
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-bold mb-2 font-display">
                        <Zap className="w-4 h-4" />
                        {couponApplied && isFirst50User && plan.id === 'yearly' ? 'Save 75%' : plan.savings}
                      </div>
                    )}

                    {plan.id === 'yearly' && isFirst50User && (
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 text-purple-700 dark:text-purple-300 rounded-full text-xs font-bold mt-2 ml-2 font-display">
                        <Crown className="w-3 h-3" />
                        First 50 Only
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300 font-body">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {selectedPlan === plan.id && (
                    <div className="absolute inset-0 border-2 border-emerald-500 rounded-3xl pointer-events-none">
                      <div className="absolute top-6 right-6">
                        <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center animate-bounce">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Features Highlight */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-8 mb-8 animate-slideUp delay-500">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center font-display">
              What You'll Get with OffHours Pro
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900 dark:to-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                  <Users className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h4 className="font-bold text-gray-800 dark:text-white mb-3 font-display">Community Connection</h4>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-body">
                  Join local pods and participate in meaningful group activities
                </p>
              </div>
              
              <div className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                  <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="font-bold text-gray-800 dark:text-white mb-3 font-display">Smart Scheduling</h4>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-body">
                  AI-powered activity suggestions based on your preferences
                </p>
              </div>
              
              <div className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                  <Trophy className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h4 className="font-bold text-gray-800 dark:text-white mb-3 font-display">Progress Tracking</h4>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-body">
                  Track your presence journey with achievements and insights
                </p>
              </div>
            </div>
          </div>

          {/* Subscribe Button */}
          <button
            onClick={handleSubscribe}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 text-white font-bold py-5 px-8 rounded-2xl hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 text-lg font-display"
          >
            {isProcessing ? (
              <>
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              <>
                <Crown className="w-6 h-6" />
                {showTrialExpired ? 'Continue with Pro' : 'Start Free Trial'}
                {isFirst50User && couponApplied && selectedPlan === 'yearly' && (
                  <span className="ml-2 px-3 py-1 bg-white/20 rounded-full text-sm font-bold">
                    50% OFF
                  </span>
                )}
              </>
            )}
          </button>

          {/* Security & Guarantee */}
          <div className="text-center mt-8 text-gray-600 dark:text-gray-400">
            <div className="flex items-center justify-center gap-6 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-body">Secure Payment</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span className="text-sm font-body">Cancel Anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                <span className="text-sm font-body">30-Day Guarantee</span>
              </div>
            </div>
            <p className="text-sm font-body">
              Powered by RevenueCat • Your payment information is encrypted and secure
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};