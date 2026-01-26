'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Sparkles,
  BarChart3,
  Activity,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import Silk from '@/components/slik-background';

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
          alert('Subscription created successfully! Your credits have been added.');
          loadData(); // Reload to show new credits
        })
        .catch((error) => {
          console.error('Failed to activate subscription:', error);
          alert('Payment successful but failed to add credits. Please contact support.');
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
  const usagePercentage = stats?.totalUsed ? (stats.totalUsed / (stats.totalUsed + balance)) * 100 : 0;

  return (
    <>
      <div className="flex-1 flex flex-col min-h-screen relative overflow-hidden">
        {/* Silk Background */}
        <div className="absolute inset-0 z-0">
          <Silk speed={3} scale={1.5} color="#2B2B2B" noiseIntensity={1.2} rotation={0.3} />
        </div>
        
        {/* Main Content */}
        <div className="relative z-10 flex-1 flex flex-col min-h-screen text-foreground">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Enhanced Header */}
            <motion.div 
              className="flex items-center justify-between mb-10"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <motion.h1 
                    className="text-4xl font-bold bg-gradient-to-r from-gray-200 via-white to-gray-200 bg-clip-text text-transparent dark:from-gray-300 dark:via-white dark:to-gray-300"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    Credits & Billing
                  </motion.h1>
                  <motion.p 
                    className="text-muted-foreground mt-2 flex items-center gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Sparkles className="w-4 h-4" />
                    Manage your credits and unlock premium features
                  </motion.p>
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
              >
                {getTierBadge(currentTier)}
              </motion.div>
            </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div 
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl backdrop-blur-sm"
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.3 }}
            >
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Credits Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-gray-900 via-black to-gray-800">
              {/* Animated background effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
              />
              
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center justify-between text-white">
                  <span className="text-base font-medium">Available Credits</span>
                  <motion.div
                    whileHover={{ rotate: 15, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <CreditCard className="w-5 h-5" />
                  </motion.div>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <motion.div 
                  className="text-5xl font-bold mb-2 text-white"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                >
                  {isUnlimited ? '∞' : balance.toLocaleString()}
                </motion.div>
                <p className="text-gray-300 text-sm flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {isUnlimited ? 'Unlimited credits' : `${balance} minutes of footage`}
                </p>
                {!isUnlimited && (
                  <div className="mt-4">
                    <Progress value={usagePercentage} className="h-1.5 bg-white/20" />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <Card className="hover:shadow-lg transition-all duration-300 border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base font-medium">
                  <span>Total Used</span>
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    transition={{ type: "spring", stiffness: 400 }}
                    className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30"
                  >
                    <Activity className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </motion.div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <motion.div 
                  className="text-4xl font-bold mb-2"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4, type: "spring" }}
                >
                  {(stats?.totalUsed || 0).toLocaleString()}
                </motion.div>
                <p className="text-muted-foreground text-sm flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  Credits used all time
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <Card className="hover:shadow-lg transition-all duration-300 border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base font-medium">
                  <span>Transactions</span>
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    transition={{ type: "spring", stiffness: 400 }}
                    className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30"
                  >
                    <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </motion.div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <motion.div 
                  className="text-4xl font-bold mb-2"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                >
                  {(stats?.transactionCount || 0).toLocaleString()}
                </motion.div>
                <p className="text-muted-foreground text-sm flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Total transactions
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Redesigned Subscription Plans */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="mb-12 overflow-visible border-0 shadow-xl bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
            <CardHeader className="pb-8">
              <div className="flex items-center justify-between">
                <div>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <CardTitle className="text-2xl">Choose Your Plan</CardTitle>
                    <CardDescription className="mt-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Each credit = 1 minute of video processing. Upgrade anytime.
                    </CardDescription>
                  </motion.div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
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
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index, type: "spring", stiffness: 200 }}
                      whileHover={{ y: -8, transition: { duration: 0.2 } }}
                      className="relative group flex"
                    >
                      {/* Glow effect for premium */}
                      {isPremium && (
                        <motion.div
                          className="absolute -inset-0.5 bg-gradient-to-r from-gray-700 via-gray-500 to-white rounded-2xl opacity-75 blur group-hover:opacity-100 transition duration-300"
                          animate={{
                            opacity: [0.5, 0.8, 0.5]
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                      )}

                      <div className={`relative rounded-2xl p-6 w-full flex flex-col transition-all duration-300 ${
                        isPremium 
                          ? 'bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white shadow-2xl' 
                          : 'bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 hover:border-gray-500/50 dark:hover:border-gray-500/50 hover:shadow-xl'
                      } ${isCurrentPlan && !isPremium ? 'ring-2 ring-gray-500 border-gray-500' : ''}`}>
                        
                        {/* Current Plan Badge */}
                        {isCurrentPlan && (
                          <motion.div 
                            className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", delay: 0.2 + index * 0.1 }}
                          >
                            <div className="bg-green-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5" />
                              Active Plan
                            </div>
                          </motion.div>
                        )}

                        {/* Popular Badge for Premium */}
                        {isPremium && !isCurrentPlan && (
                          <motion.div 
                            className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", delay: 0.2 + index * 0.1 }}
                          >
                            <div className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              Most Popular
                            </div>
                          </motion.div>
                        )}

                        {/* Plan Icon */}
                        <motion.div 
                          className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4 ${
                            isPremium ? 'bg-white/20 backdrop-blur-sm' : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800/30 dark:to-gray-700/30'
                          }`}
                          whileHover={{ rotate: 360, scale: 1.1 }}
                          transition={{ type: "spring", stiffness: 200 }}
                        >
                          {plan.tier === 'free' && <Star className={`w-6 h-6 ${isPremium ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`} />}
                          {plan.tier === 'basic' && <Zap className={`w-6 h-6 ${isPremium ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`} />}
                          {plan.tier === 'premium' && <Crown className={`w-6 h-6 ${isPremium ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`} />}
                          {plan.tier === 'enterprise' && <Sparkles className={`w-6 h-6 ${isPremium ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`} />}
                        </motion.div>

                        {/* Plan Name */}
                        <h3 className={`text-2xl font-bold mb-2 ${isPremium ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                          {plan.name}
                        </h3>

                        {/* Plan Description */}
                        <p className={`text-sm mb-6 ${isPremium ? 'text-gray-300' : 'text-muted-foreground'}`}>
                          {plan.description}
                        </p>

                        {/* Price */}
                        <div className="mb-6">
                          <div className="flex items-baseline gap-2">
                            <motion.span 
                              className="text-5xl font-bold"
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: 0.3 + index * 0.1, type: "spring" }}
                            >
                              {isEnterprisePlan ? 'Custom' : isFreePlan ? '$0' : `$${price}`}
                            </motion.span>
                            {!isEnterprisePlan && (
                              <span className={`text-lg ${isPremium ? 'text-gray-400' : 'text-muted-foreground'}`}>
                                /mo
                              </span>
                            )}
                          </div>
                          <motion.p 
                            className={`text-sm mt-3 font-medium ${isPremium ? 'text-gray-300' : 'text-muted-foreground'}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 + index * 0.1 }}
                          >
                            {isUnlimitedPlan 
                              ? 'Custom credit allocation' 
                              : `${plan.credits.toLocaleString()} credits included`}
                          </motion.p>
                        </div>

                        {/* Divider */}
                        <div className={`h-px w-full mb-6 ${isPremium ? 'bg-white/30' : 'bg-gray-200 dark:bg-gray-800'}`} />

                        {/* Features */}
                        <ul className="space-y-3.5 mb-8 flex-grow">
                          {plan.features?.map((feature: string, idx: number) => (
                            <motion.li 
                              key={idx} 
                              className="flex items-start gap-3 text-sm"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.5 + index * 0.1 + idx * 0.05 }}
                            >
                              <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                                isPremium ? 'bg-white/30' : 'bg-gray-100 dark:bg-gray-800/30'
                              }`}>
                                <Check className={`w-3 h-3 ${isPremium ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`} strokeWidth={3} />
                              </div>
                              <span className={`leading-tight ${isPremium ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>{feature}</span>
                            </motion.li>
                          ))}
                        </ul>

                        {/* CTA Button */}
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            className={`w-full h-12 font-semibold text-base transition-all duration-300 ${
                              isPremium && !isCurrentPlan
                                ? 'bg-white text-black hover:bg-gray-100 shadow-lg hover:shadow-xl' 
                                : isCurrentPlan
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-not-allowed'
                                : 'shadow-md hover:shadow-lg'
                            }`}
                            variant={isCurrentPlan ? 'outline' : isPremium ? 'secondary' : 'default'}
                            disabled={isCurrentPlan || processingPlan === plan.tier || isFreePlan || isEnterprisePlan}
                            onClick={() => isEnterprisePlan ? window.location.href = 'mailto:smart@smartclips.net?subject=Enterprise Plan Inquiry' : handleUpgrade(plan.tier)}
                          >
                            <span className="flex items-center justify-center gap-2">
                              {processingPlan === plan.tier ? (
                                <>
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                  Processing...
                                </>
                              ) : isCurrentPlan ? (
                                <>
                                  <Check className="w-5 h-5" />
                                  Current Plan
                                </>
                              ) : isFreePlan ? (
                                'Current Plan'
                              ) : isEnterprisePlan ? (
                                <>
                                  Contact Sales
                                  <ArrowUpRight className="w-4 h-4" />
                                </>
                              ) : (
                                <>
                                  Get Started
                                  <ArrowUpRight className="w-5 h-5" />
                                </>
                              )}
                            </span>
                          </Button>
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Enhanced Transaction History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-0 shadow-xl bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Transactions
              </CardTitle>
              <CardDescription>Your credit usage and purchase history</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <motion.div 
                  className="text-center py-12"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No transactions yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Your transaction history will appear here</p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {transactions.map((transaction, idx) => (
                      <motion.div
                        key={transaction.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: 0.05 * idx }}
                        whileHover={{ x: 4, transition: { duration: 0.2 } }}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-center gap-4">
                          <motion.div 
                            className={`p-3 rounded-xl ${
                              transaction.amount > 0 
                                ? 'bg-green-100 dark:bg-green-900/30' 
                                : 'bg-red-100 dark:bg-red-900/30'
                            }`}
                            whileHover={{ rotate: 360, scale: 1.1 }}
                            transition={{ type: "spring", stiffness: 200 }}
                          >
                            {transaction.amount > 0 ? (
                              <ArrowUpRight className="w-5 h-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <ArrowDownRight className="w-5 h-5 text-red-600 dark:text-red-400" />
                            )}
                          </motion.div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">{transaction.description}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(transaction.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <motion.div 
                            className={`text-xl font-bold ${
                              transaction.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}
                            initial={{ scale: 0.5 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", delay: 0.1 * idx }}
                          >
                            {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()}
                          </motion.div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Balance: {transaction.balanceAfter.toLocaleString()}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
