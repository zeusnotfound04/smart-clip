'use client';

import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search, Zap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <div className="container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
              >
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Zap className="w-10 h-10 text-blue-600" />
                </div>
              </motion.div>
              
              <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h2>
              <p className="text-gray-600 mb-6">
                Sorry, the page you're looking for doesn't exist or has been moved.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/dashboard">
                  <Button className="gap-2">
                    <Home className="w-4 h-4" />
                    Go to Dashboard
                  </Button>
                </Link>
                <Button variant="outline" onClick={() => window.history.back()} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Go Back
                </Button>
              </div>
              
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-gray-500 mb-3">Looking for something specific?</p>
                <div className="flex flex-col gap-2 text-sm">
                  <Link href="/videos" className="text-blue-600 hover:underline">
                    Video Library
                  </Link>
                  <Link href="/projects" className="text-blue-600 hover:underline">
                    Projects
                  </Link>
                  <Link href="/help" className="text-blue-600 hover:underline">
                    Help & Support
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}