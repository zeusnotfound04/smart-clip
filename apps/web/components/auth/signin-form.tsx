'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { scaleIn, staggerContainer, staggerItem } from '@/lib/utils';

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type SignInFormValues = z.infer<typeof signInSchema>;

export function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered');
  const { signIn } = useAuth();

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = useCallback(async (data: SignInFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      await signIn(data.email, data.password);
      router.push('/dashboard');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, [signIn, router]);

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
          <CardTitle className="text-2xl font-bold text-white">Welcome back</CardTitle>
          <CardDescription className="text-gray-300">
            {registered
              ? 'Account created successfully. Sign in below.'
              : 'Sign in to your account to continue'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <motion.form 
              onSubmit={form.handleSubmit(onSubmit)} 
              className="space-y-4"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {error && (
                <motion.div 
                  className="bg-red-900/30 border border-red-600/50 text-red-200 px-4 py-3 rounded-lg text-sm"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {error}
                </motion.div>
              )}

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
                            placeholder="Enter your password"
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
                    'Sign In'
                  )}
                </Button>
              </motion.div>
            </motion.form>
          </Form>

          <div className="mt-6 text-center text-sm text-gray-400">
            Don't have an account?{' '}
            <Link 
              href="/auth/signup" 
              className="font-medium text-white hover:text-gray-300 transition-colors"
            >
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
