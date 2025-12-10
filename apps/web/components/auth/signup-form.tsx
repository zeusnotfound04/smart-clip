'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAuth } from '@/lib/auth-context';
import { fadeInUp, scaleIn, staggerContainer, staggerItem } from '@/lib/utils';

const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

export function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();
  const { signUp } = useAuth();

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = useCallback(async (data: SignUpFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      await signUp(data.name, data.email, data.password);
      router.push('/dashboard');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, [signUp, router]);

  const handleGoogleSignIn = useCallback(() => {
    setIsGoogleLoading(true);
    setError(null);
    // Redirect to backend OAuth endpoint
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/google`;
  }, []);

  return (
    <motion.div
      variants={scaleIn}
      initial="initial"
      animate="animate"
      transition={{ delay: 0.3 }}
      className="w-full"
    >
      <Card className="shadow-2xl border border-white/20 bg-black/20 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-white">Create your account</CardTitle>
          <CardDescription className="text-gray-300">
            Join thousands of creators using AI to make amazing videos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <motion.div 
              className="bg-red-900/30 border border-red-600/50 text-red-200 px-4 py-3 rounded-lg text-sm mb-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}

          <motion.div
            variants={staggerItem}
            initial="initial"
            animate="animate"
            className="mb-6"
          >
            <Button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
              className="w-full h-12 bg-white hover:bg-gray-100 text-gray-900 font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-3"
            >
              <FcGoogle className="h-5 w-5" />
              {isGoogleLoading ? 'Signing up...' : 'Continue with Google'}
            </Button>
          </motion.div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-black/50 px-2 text-gray-400">
                Or continue with email
              </span>
            </div>
          </div>

          <Form {...form}>
            <motion.form 
              onSubmit={form.handleSubmit(onSubmit)} 
              className="space-y-4"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >

              <motion.div variants={staggerItem}>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Full Name</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-white transition-colors" />
                          <Input
                            placeholder="John Doe"
                            className="pl-10 h-12 border-2 border-gray-600 bg-black/50 text-white placeholder:text-gray-400 focus:border-white transition-all duration-200 hover:border-gray-400"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div variants={staggerItem}>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Email</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-white transition-colors" />
                          <Input
                            type="email"
                            placeholder="john@example.com"
                            className="pl-10 h-12 border-2 border-gray-600 bg-black/50 text-white placeholder:text-gray-400 focus:border-white transition-all duration-200 hover:border-gray-400"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div variants={staggerItem}>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Password</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-white transition-colors" />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Create a secure password"
                            className="pl-10 pr-12 h-12 border-2 border-gray-600 bg-black/50 text-white placeholder:text-gray-400 focus:border-white transition-all duration-200 hover:border-gray-400"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-white transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div variants={staggerItem}>
                <Button
                  type="submit"
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <motion.div
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </motion.div>
            </motion.form>
          </Form>

          <div className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link 
              href="/auth/signin" 
              className="font-medium text-white hover:text-gray-300 transition-colors"
            >
              Sign in
            </Link>
          </div>

          <div className="mt-4 text-center text-xs text-gray-400">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-white">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-white">
              Privacy Policy
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
