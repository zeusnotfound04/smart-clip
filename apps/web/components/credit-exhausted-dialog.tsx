'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, CreditCard, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

interface CreditExhaustedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message?: string;
}

export function CreditExhaustedDialog({ open, onOpenChange, message }: CreditExhaustedDialogProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    onOpenChange(false);
    router.push('/credits');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
            </div>
            <DialogTitle className="text-xl">Credits Exhausted</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-4">
            {message || "Hey! You ran out of credits. Please upgrade to remove watermark and generate videos!"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="rounded-lg border border-yellow-200 dark:border-yellow-900/30 bg-yellow-50 dark:bg-yellow-900/10 p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                  Upgrade Benefits
                </p>
                <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                  <li>Remove watermarks from all videos</li>
                  <li>Generate unlimited high-quality content</li>
                  <li>Access to all premium features</li>
                  <li>Priority processing & support</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleUpgrade}
            className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Upgrade Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
