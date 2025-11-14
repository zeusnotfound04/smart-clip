'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
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

  async function onSubmit(data: SignUpFormValues) {
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
  }

  return (
    <motion.div
      variants={scaleIn}
      initial="initial"
      animate="animate"
      transition={{ delay: 0.3 }}
      className="w-full"
    >
      <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
          <CardDescription>
            Join thousands of creators using AI to make amazing videos
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
                  className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {error}
                </motion.div>
              )}

              <motion.div variants={staggerItem}>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input
                            placeholder="John Doe"
                            className="pl-10 h-12 border-2 focus:border-primary transition-all duration-200 hover:border-primary/50"
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input
                            type="email"
                            placeholder="john@example.com"
                            className="pl-10 h-12 border-2 focus:border-primary transition-all duration-200 hover:border-primary/50"
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Create a secure password"
                            className="pl-10 pr-12 h-12 border-2 focus:border-primary transition-all duration-200 hover:border-primary/50"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-primary transition-colors"
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
                  className="w-full h-12 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
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

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link 
              href="/auth/signin" 
              className="font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Sign in
            </Link>
          </div>

          <div className="mt-4 text-center text-xs text-muted-foreground">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-foreground">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
