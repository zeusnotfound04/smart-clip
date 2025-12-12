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
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState('free');

  useEffect(() => {
    setMounted(true);
    loadBalance();
  }, []);

  const loadBalance = async () => {
    try {
      const response = await apiClient.getCreditsBalance();
      if (response.success && response.data) {
        setBalance(response.data.balance);
        // Get tier from subscription details
        const subRes = await apiClient.getSubscriptionDetails();
        if (subRes.success && subRes.data) {
          setTier(subRes.data.subscriptionTier || 'free');
        }
      }
    } catch (error) {
      console.error('Failed to load credits:', error);
    } finally {
      setLoading(false);
    }
  };

  const isUnlimited = tier === 'premium';

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
        <Button variant="outline" size="sm" className="gap-2">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              {isUnlimited ? (
                <Crown className="w-4 h-4 text-amber-500" />
              ) : (
                <CreditCard className="w-4 h-4 text-blue-500" />
              )}
              <span className="font-semibold">
                {isUnlimited ? '∞' : balance || 0}
              </span>
              <span className="text-xs text-muted-foreground">
                {isUnlimited ? 'Unlimited' : 'Credits'}
              </span>
            </>
          )}
        </Button>
      </Link>
    </motion.div>
  );
}
