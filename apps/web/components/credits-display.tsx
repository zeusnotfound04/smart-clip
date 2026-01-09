'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Crown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import { motion } from 'framer-motion';

export function CreditsDisplay() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState('free');
  const [planName, setPlanName] = useState('Free');

  useEffect(() => {
    setMounted(true);
    loadSubscriptionDetails();
  }, []);

  const loadSubscriptionDetails = async () => {
    try {
      const subRes = await apiClient.getSubscriptionDetails();
      if (subRes.success && subRes.data) {
        const subscriptionTier = subRes.data.subscriptionTier || 'free';
        setTier(subscriptionTier);
        
        // Map tier to display name
        const tierMap: Record<string, string> = {
          'free': 'Free',
          'basic': 'Basic',
          'premium': 'Executive Premium',
          'enterprise': 'Enterprise'
        };
        setPlanName(tierMap[subscriptionTier] || 'Free');
      }
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanColor = () => {
    switch (tier) {
      case 'enterprise': return 'text-purple-600 bg-purple-50 dark:bg-purple-950 border-purple-300 dark:border-purple-700';
      case 'premium': return 'text-amber-600 bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700';
      case 'basic': return 'text-blue-600 bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700';
    }
  };

  const getPlanIcon = () => {
    switch (tier) {
      case 'enterprise': 
      case 'premium': return <Crown className="w-4 h-4" />;
      default: return <CreditCard className="w-4 h-4" />;
    }
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="w-32 h-9 bg-gray-100 dark:bg-gray-800 rounded-md animate-pulse" />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-3"
    >
      <Link href="/credits">
        <Button 
          variant="outline" 
          size="sm" 
          className={`gap-2 ${getPlanColor()} border-2 hover:shadow-md transition-all`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              {getPlanIcon()}
              <span className="text-sm font-semibold">
                {planName}
              </span>
              <span className="text-sm opacity-70">
                Plan
              </span>
            </>
          )}
        </Button>
      </Link>
    </motion.div>
  );
}
