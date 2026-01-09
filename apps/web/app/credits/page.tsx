'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Crown,
  Star,
  Check,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface CreditTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
}

interface SubscriptionPlan {
  tier: string;
  name: string;
  description: string;
  monthlyPrice: number;
  credits: number;
  features: string[];
}

export default function CreditsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fallback plans if API fails
  // Each credit = 1 minute of video usage
  const fallbackPlans: SubscriptionPlan[] = [
    {
      tier: 'free',
      name: 'Free',
      description: 'Try SmartClip for free',
      monthlyPrice: 0,
      credits: 10,
      features: ['10 credits per month', '10 minutes of footage', 'With watermark', 'Basic features', 'Community support']
    },
    {
      tier: 'basic',
      name: 'Basic',
      description: 'Perfect for getting started',
      monthlyPrice: 30,
      credits: 300,
      features: ['300 credits per month', '300 minutes of footage', 'No watermark', 'All features included', 'Email support']
    },
    {
      tier: 'premium',
      name: 'Executive Premium',
      description: 'For serious content creators',
      monthlyPrice: 40,
      credits: 500,
      features: ['500 credits per month', '500 minutes of footage', 'No watermark', 'All features included', 'Priority support', 'Advanced analytics']
    },
    {
      tier: 'enterprise',
      name: 'Enterprise',
      description: 'Custom solution for teams',
      monthlyPrice: 0,
      credits: -1,
      features: ['Contact us for pricing', 'Custom credit allocation', 'No watermark', 'All features included', '24/7 priority support', 'Advanced analytics', 'API access', 'Dedicated account manager']
    }
  ];

  useEffect(() => {
    setMounted(true);
    loadData();
    
    // Check for success/cancel query params from Stripe redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      const tier = params.get('tier') || 'basic';
      const billing = params.get('billing') || 'monthly';
      
      // Call test endpoint to simulate webhook and add credits
      apiClient.simulateCheckoutSuccess(tier, billing)
        .then(() => {
          alert('🎉 Subscription created successfully! Your credits have been added.');
          loadData(); // Reload to show new credits
        })
        .catch((error) => {
          console.error('Failed to activate subscription:', error);
          alert('⚠️ Payment successful but failed to add credits. Please contact support.');
        })
        .finally(() => {
          // Clean up URL
          window.history.replaceState({}, '', '/credits');
        });
    } else if (params.get('canceled') === 'true') {
      alert('Checkout canceled. You can try again anytime.');
      // Clean up URL
      window.history.replaceState({}, '', '/credits');
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use fallback plans as main plans
      setPlans(fallbackPlans);
      
      const [balanceRes, historyRes, subRes] = await Promise.all([
        apiClient.getCreditsBalance().catch((err) => {
          console.error('Credits balance API error:', err);
          return { success: false, data: null, error: err };
        }),
        apiClient.getCreditsHistory(10, 0).catch((err) => {
          console.error('Credits history API error:', err);
          return { success: false, data: null };
        }),
        apiClient.getSubscriptionDetails().catch((err) => {
          console.error('Subscription details API error:', err);
          return { success: false, data: null };
        }),
      ]);

      console.log('Balance API Response:', balanceRes);
      console.log('History API Response:', historyRes);
      console.log('Subscription API Response:', subRes);

      if (balanceRes.success && balanceRes.data) {
        console.log('Setting balance to:', balanceRes.data.balance);
        console.log('Setting stats to:', balanceRes.data.stats);
        setBalance(balanceRes.data.balance);
        setStats(balanceRes.data.stats);
      } else {
        console.warn('Balance API call failed or returned no data');
        setError('Failed to load credits balance. Please refresh the page.');
      }

      if (historyRes.success && historyRes.data) {
        setTransactions(historyRes.data);
      }

      if (subRes.success && subRes.data) {
        setCurrentSubscription(subRes.data);
      }
    } catch (error: any) {
      console.error('Failed to load credits data:', error);
      setError('An error occurred while loading your credits. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planTier: string) => {
    try {
      setProcessingPlan(planTier);
      
      // Create Stripe Checkout session
      const response = await apiClient.createCheckoutSession(planTier);
      
      if (response.success && response.data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = response.data.url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error: any) {
      console.error('Upgrade failed:', error);
      alert('Failed to create checkout session. Please try again.');
      setProcessingPlan(null);
    }
    // Don't reset processingPlan here - let the redirect happen
  };

  const getTierBadge = (tier: string) => {
    const badges: Record<string, { color: string; icon: any }> = {
      free: { color: 'bg-gray-500', icon: Star },
      basic: { color: 'bg-blue-500', icon: Zap },
      pro: { color: 'bg-purple-500', icon: Crown },
      premium: { color: 'bg-amber-500', icon: Crown },
    };
    const badge = badges[tier.toLowerCase()] || badges.free;
    const Icon = badge.icon;
    return (
      <Badge className={`${badge.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {tier.toUpperCase()}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentTier = currentSubscription?.subscriptionTier || 'free';
  const isUnlimited = currentTier === 'premium';

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div>
              <h1 className="text-3xl font-bold">
                Credits & Subscription
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your credits and upgrade your plan
              </p>
            </div>
          </div>
          {getTierBadge(currentTier)}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <div className="text-sm">{error}</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadData()}
                className="ml-auto"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Credits Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-linear-to-br from-blue-500 to-purple-600 text-white border-0">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Available Credits</span>
                  <CreditCard className="w-5 h-5" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold mb-2">
                  {isUnlimited ? '∞' : balance}
                </div>
                <p className="text-blue-100 text-sm">
                  {isUnlimited ? 'Unlimited credits' : `${balance} minutes of footage`}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Total Used</span>
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">
                  {stats?.totalUsed || 0}
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Credits used all time
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Transactions</span>
                  <Calendar className="w-5 h-5 text-green-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">
                  {stats?.transactionCount || 0}
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Total transactions
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Subscription Plans */}
        <Card className="mb-8 overflow-visible">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Subscription Plans</CardTitle>
                <CardDescription>Choose the perfect plan for your needs. Each credit = 1 minute of video processing.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {plans.map((plan, index) => {
                const price = plan.monthlyPrice;
                const isCurrentPlan = plan.tier === currentTier;
                const isUnlimitedPlan = plan.credits === -1 || plan.credits > 1000000;
                const isFreePlan = plan.tier === 'free';
                const isEnterprisePlan = plan.tier === 'enterprise';
                const isPremium = plan.tier === 'premium';

                return (
                  <motion.div
                    key={plan.tier}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="relative"
                  >
                    <div className={`relative rounded-xl p-6 h-full flex flex-col transition-all duration-200 ${
                      isPremium 
                        ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-lg hover:shadow-xl' 
                        : 'bg-card border-2 border-border hover:border-primary/50 hover:shadow-md'
                    } ${isCurrentPlan && !isPremium ? 'ring-2 ring-primary' : ''}`}>
                      
                      {/* Current Plan Badge */}
                      {isCurrentPlan && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20">
                          <div className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Active Plan
                          </div>
                        </div>
                      )}

                      {/* Popular Badge for Premium */}
                      {isPremium && !isCurrentPlan && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20">
                          <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            Most Popular
                          </div>
                        </div>
                      )}

                      {/* Plan Icon Badge */}
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4 ${
                        isPremium ? 'bg-white/20' : 'bg-primary/10'
                      }`}>
                        {getTierBadge(plan.tier)}
                      </div>

                      {/* Plan Name */}
                      <h3 className={`text-xl font-bold mb-2 ${isPremium ? 'text-white' : ''}`}>
                        {plan.name}
                      </h3>

                      {/* Plan Description */}
                      <p className={`text-sm mb-6 ${isPremium ? 'text-blue-100' : 'text-muted-foreground'}`}>
                        {plan.description}
                      </p>

                      {/* Price */}
                      <div className="mb-6">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold">
                            {isEnterprisePlan ? 'Custom' : isFreePlan ? '$0' : `$${price}`}
                          </span>
                          {!isEnterprisePlan && (
                            <span className={`text-base ${isPremium ? 'text-blue-200' : 'text-muted-foreground'}`}>
                              /month
                            </span>
                          )}
                        </div>
                        <p className={`text-sm mt-2 ${isPremium ? 'text-blue-100' : 'text-muted-foreground'}`}>
                          {isUnlimitedPlan 
                            ? 'Custom credit allocation' 
                            : `${plan.credits} credits included`}
                        </p>
                      </div>

                      {/* Divider */}
                      <div className={`h-px w-full mb-6 ${isPremium ? 'bg-white/20' : 'bg-border'}`} />

                      {/* Features */}
                      <ul className="space-y-3 mb-8 flex-grow">
                        {plan.features?.map((feature: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-3 text-sm">
                            <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                              isPremium ? 'bg-white/20' : 'bg-primary/10'
                            }`}>
                              <Check className={`w-3 h-3 ${isPremium ? 'text-white' : 'text-primary'}`} />
                            </div>
                            <span className={isPremium ? 'text-white' : ''}>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA Button */}
                      <Button
                        className={`w-full h-11 font-semibold ${
                          isPremium && !isCurrentPlan
                            ? 'bg-white text-blue-600 hover:bg-blue-50' 
                            : ''
                        }`}
                        variant={isCurrentPlan ? 'outline' : isPremium ? 'secondary' : 'default'}
                        disabled={isCurrentPlan || processingPlan === plan.tier || isFreePlan || isEnterprisePlan}
                        onClick={() => isEnterprisePlan ? window.location.href = 'mailto:support@smartclip.com?subject=Enterprise Plan Inquiry' : handleUpgrade(plan.tier)}
                      >
                        <span className="flex items-center justify-center gap-2">
                          {processingPlan === plan.tier ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Processing...
                            </>
                          ) : isCurrentPlan ? (
                            <>
                              <Check className="w-4 h-4" />
                              Current Plan
                            </>
                          ) : isFreePlan ? (
                            'Current Plan'
                          ) : isEnterprisePlan ? (
                            'Contact Sales'
                          ) : (
                            <>
                              Get Started
                              <ArrowUpRight className="w-4 h-4" />
                            </>
                          )}
                        </span>
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your credit usage and purchase history</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No transactions yet
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        transaction.amount > 0 
                          ? 'bg-green-100 dark:bg-green-900' 
                          : 'bg-red-100 dark:bg-red-900'
                      }`}>
                        {transaction.amount > 0 ? (
                          <ArrowUpRight className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{transaction.description}</div>
                        <div className="text-sm text-gray-500">
                          {formatDate(transaction.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                      </div>
                      <div className="text-sm text-gray-500">
                        Balance: {transaction.balanceAfter}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
