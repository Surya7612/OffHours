import React, { useState } from 'react';
import { ArrowLeft, CreditCard, Calendar, Clock, CheckCircle, AlertTriangle, RefreshCw, X, Download, ExternalLink, Shield } from 'lucide-react';
import { User } from '../types';

interface SubscriptionManagementProps {
  user: User;
  subscription: {
    loading: boolean;
    hasAccess: boolean;
    isTrialActive: boolean;
    daysRemaining: number;
    plan?: {
      id: string;
      price: number;
      period: string;
    };
    purchaseSubscription: (planId: string, couponCode?: string) => Promise<{ success: boolean; error?: string }>;
    cancelSubscription?: () => Promise<{ success: boolean; error?: string }>;
  };
  onUpgrade: () => void;
  onBack: () => void;
}

export const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({
  user,
  subscription,
  onUpgrade,
  onBack
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showInvoices, setShowInvoices] = useState(false);

  const handleCancelSubscription = async () => {
    if (!subscription.cancelSubscription) {
      alert('Cancellation is not available at this time. Please contact support.');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await subscription.cancelSubscription();
      if (result.success) {
        alert('Your subscription has been cancelled. You will have access until the end of your current billing period.');
        setShowCancelConfirm(false);
      } else {
        alert(`Cancellation failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('An error occurred while cancelling your subscription. Please try again later.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getNextBillingDate = () => {
    if (subscription.isTrialActive) {
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + subscription.daysRemaining);
      return formatDate(trialEndDate);
    }

    if (subscription.hasAccess && subscription.plan) {
      const today = new Date();
      const nextBillingDate = new Date();
      
      if (subscription.plan.period === 'monthly') {
        nextBillingDate.setMonth(today.getMonth() + 1);
      } else {
        nextBillingDate.setFullYear(today.getFullYear() + 1);
      }
      
      return formatDate(nextBillingDate);
    }

    return 'Not applicable';
  };

  // Mock invoices for demonstration
  const invoices = [
    {
      id: 'INV-001',
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      amount: subscription.plan?.price || 24.00,
      status: 'paid'
    },
    {
      id: 'INV-002',
      date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      amount: subscription.plan?.price || 24.00,
      status: 'paid'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white font-display">
            Manage Subscription
          </h1>
          <div className="w-10"></div>
        </div>

        {/* Subscription Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6 animate-slideUp">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white font-display">
              Current Plan
            </h2>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              subscription.hasAccess 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' 
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {subscription.isTrialActive ? 'Trial Active' : subscription.hasAccess ? 'Active' : 'Inactive'}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-white">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 dark:text-white mb-1 font-display">
                  {subscription.isTrialActive 
                    ? 'Free Trial' 
                    : subscription.hasAccess && subscription.plan 
                      ? `OffHours Pro (${subscription.plan.period})` 
                      : 'Free Plan'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 font-body">
                  {subscription.isTrialActive 
                    ? `${subscription.daysRemaining} days remaining in your trial` 
                    : subscription.hasAccess && subscription.plan
                      ? `$${subscription.plan.price.toFixed(2)}/${subscription.plan.period === 'monthly' ? 'month' : 'year'}`
                      : 'Limited features'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 font-body">
                  Next billing date
                </div>
                <div className="flex items-center gap-2 font-medium text-gray-800 dark:text-white">
                  <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span>{getNextBillingDate()}</span>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 font-body">
                  Payment method
                </div>
                <div className="flex items-center gap-2 font-medium text-gray-800 dark:text-white">
                  <CreditCard className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span>{subscription.hasAccess && !subscription.isTrialActive ? 'Visa •••• 4242' : 'None'}</span>
                </div>
              </div>
            </div>

            {subscription.isTrialActive && (
              <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-1 font-display">
                      Your trial ends in {subscription.daysRemaining} days
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-400 font-body">
                      Upgrade now to continue enjoying all premium features without interruption.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {subscription.hasAccess && !subscription.isTrialActive ? (
                <>
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 font-medium"
                  >
                    Cancel Subscription
                  </button>
                  <button
                    onClick={() => onUpgrade()}
                    className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    Change Plan
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onUpgrade()}
                  className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  {subscription.isTrialActive ? 'Upgrade Now' : 'Subscribe'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Billing History */}
        {subscription.hasAccess && !subscription.isTrialActive && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6 animate-slideUp delay-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white font-display">
                Billing History
              </h2>
              <button
                onClick={() => setShowInvoices(!showInvoices)}
                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium"
              >
                {showInvoices ? 'Hide' : 'View All'}
              </button>
            </div>

            {showInvoices ? (
              <div className="space-y-3">
                {invoices.map(invoice => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <div>
                      <div className="font-medium text-gray-800 dark:text-white font-display">
                        {invoice.id}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 font-body">
                        {formatDate(invoice.date)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-medium text-gray-800 dark:text-white">
                          ${invoice.amount.toFixed(2)}
                        </div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400">
                          {invoice.status === 'paid' && 'Paid'}
                        </div>
                      </div>
                      <button
                        className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        title="Download invoice"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <p className="font-body">Click "View All" to see your billing history</p>
              </div>
            )}
          </div>
        )}

        {/* Plan Features */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6 animate-slideUp delay-300">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 font-display">
            Your Plan Features
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300 font-body">Unlimited daily nudges</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300 font-body">Join local pods</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300 font-body">Activity tracking & calendar</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300 font-body">Achievement system</span>
            </div>
            
            {subscription.hasAccess && (
              <>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300 font-body">Priority pod placement</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300 font-body">Early access to features</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300 font-body">Exclusive community events</span>
                </div>
              </>
            )}
          </div>
          
          {!subscription.hasAccess && !subscription.isTrialActive && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <p className="text-sm font-body">
                  You're on the free plan with limited features. Upgrade to access all premium features.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Help & Support */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 animate-slideUp delay-400">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 font-display">
            Help & Support
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-800 dark:text-white mb-1 font-display">
                  Billing Support
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 font-body">
                  Need help with your subscription or billing? Our team is here to help.
                </p>
                <a 
                  href="mailto:support@offhours.app" 
                  className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm font-medium"
                >
                  <ExternalLink className="w-3 h-3" />
                  Contact Support
                </a>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-800 dark:text-white mb-1 font-display">
                  Subscription FAQ
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 font-body">
                  Find answers to common questions about your subscription.
                </p>
                <a 
                  href="#" 
                  className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm font-medium"
                >
                  <ExternalLink className="w-3 h-3" />
                  View FAQ
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 animate-scaleIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white font-display">
                Cancel Subscription?
              </h3>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-400 mb-4 font-body">
                Are you sure you want to cancel your subscription? You'll lose access to premium features at the end of your current billing period.
              </p>
              
              <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-1 font-display">
                      What you'll lose
                    </h4>
                    <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1 font-body">
                      <li>• Priority pod placement</li>
                      <li>• Early access to features</li>
                      <li>• Exclusive community events</li>
                      <li>• Personal presence coach</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 font-medium"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={isProcessing}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  'Confirm Cancellation'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};