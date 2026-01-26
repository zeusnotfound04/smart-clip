'use client';

import { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, CheckCircle, ArrowLeft } from 'lucide-react';
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
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/lib/auth-context';
import { fadeInUp, scaleIn, staggerContainer, staggerItem } from '@/lib/utils';
import { TermsOfServiceModal } from '@/components/terms-of-service-modal';

// Step 1: Request OTP
const requestOTPSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
});

// Step 2: Verify OTP and Complete Signup
const completeSignUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  tosAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the Terms of Service to continue',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RequestOTPFormValues = z.infer<typeof requestOTPSchema>;
type CompleteSignUpFormValues = z.infer<typeof completeSignUpSchema>;

type SignUpStep = 'initial' | 'verify-otp' | 'complete';

export function SignUpForm() {
  const [step, setStep] = useState<SignUpStep>('initial');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const [formData, setFormData] = useState<{ name: string; email: string }>({ name: '', email: '' });
  const [showTosModal, setShowTosModal] = useState(false);
  const router = useRouter();
  const { signUp } = useAuth();

  const requestOTPForm = useForm<RequestOTPFormValues>({
    resolver: zodResolver(requestOTPSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  const completeSignUpForm = useForm<CompleteSignUpFormValues>({
    resolver: zodResolver(completeSignUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      otp: '',
      tosAccepted: false,
    },
  });

  // Timer for OTP expiration
  useEffect(() => {
    if (step === 'verify-otp' && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
        if (timeLeft <= 1) {
          setCanResend(true);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [step, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const requestOTP = useCallback(async (data: RequestOTPFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send verification code');
      }

      setFormData(data);
      setStep('verify-otp');
      setTimeLeft(600);
      setCanResend(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyOTPAndContinue = useCallback(async () => {
    if (otpValue.length !== 6) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp: otpValue }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Invalid verification code');
      }

      // OTP verified, move to password step
      completeSignUpForm.setValue('name', formData.name);
      completeSignUpForm.setValue('email', formData.email);
      completeSignUpForm.setValue('otp', otpValue);
      setStep('complete');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, [otpValue, formData, completeSignUpForm]);

  const completeSignUp = useCallback(async (data: CompleteSignUpFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      await signUp(data.name, data.email, data.password, data.otp, data.tosAccepted);
      router.push('/dashboard');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, [signUp, router]);

  const handleResendOTP = useCallback(async () => {
    await requestOTP(formData);
  }, [formData, requestOTP]);

  const handleGoogleSignIn = useCallback(() => {
    setIsGoogleLoading(true);
    setError(null);
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/google`;
  }, []);

  const goBack = useCallback(() => {
    if (step === 'verify-otp') {
      setStep('initial');
      setOtpValue('');
      setError(null);
    } else if (step === 'complete') {
      setStep('verify-otp');
      setError(null);
    }
  }, [step]);

  return (
    <motion.div
      variants={scaleIn}
      initial="initial"
      animate="animate"
      transition={{ delay: 0.3 }}
      className="w-full"
    >
      <Card className="shadow-2xl border border-white/20 bg-black/20 backdrop-blur-sm">
        {/* Sign Up Badge */}
        {step === 'initial' && (
          <div className="bg-gradient-to-r from-primary/20 to-purple-600/20 border-b border-primary/30 px-6 py-3 text-center">
            <span className="text-primary font-semibold text-sm uppercase tracking-wide">New Account Registration</span>
          </div>
        )}
        
        <CardHeader className="space-y-1 text-center">
          {/* Step Indicator */}
          {step === 'initial' && (
            <div className="flex justify-center gap-2 mb-4">
              <div className="h-2 w-8 rounded-full bg-primary"></div>
              <div className="h-2 w-8 rounded-full bg-gray-600"></div>
              <div className="h-2 w-8 rounded-full bg-gray-600"></div>
            </div>
          )}
          {step === 'verify-otp' && (
            <div className="flex justify-center gap-2 mb-4">
              <div className="h-2 w-8 rounded-full bg-primary"></div>
              <div className="h-2 w-8 rounded-full bg-primary"></div>
              <div className="h-2 w-8 rounded-full bg-gray-600"></div>
            </div>
          )}
          {step === 'complete' && (
            <div className="flex justify-center gap-2 mb-4">
              <div className="h-2 w-8 rounded-full bg-primary"></div>
              <div className="h-2 w-8 rounded-full bg-primary"></div>
              <div className="h-2 w-8 rounded-full bg-primary"></div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            {step !== 'initial' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goBack}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            <div className={step === 'initial' ? 'w-full' : 'flex-1'}>
              <CardTitle className="text-2xl font-bold text-white">
                {step === 'initial' && 'Create your account'}
                {step === 'verify-otp' && 'Verify your email'}
                {step === 'complete' && 'Complete your profile'}
              </CardTitle>
            </div>
          </div>
          <CardDescription className="text-gray-300">
            {step === 'initial' && 'Join thousands of creators using AI to make amazing videos'}
            {step === 'verify-otp' && `We sent a verification code to ${formData.email}`}
            {step === 'complete' && 'Almost done! Just set a password'}
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

          <AnimatePresence mode="wait">
            {step === 'initial' && (
              <motion.div
                key="initial"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <motion.div variants={staggerItem} className="mb-6">
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
                    <span className="bg-black/50 px-2 text-gray-400">Or continue with email</span>
                  </div>
                </div>

                <Form {...requestOTPForm}>
                  <motion.form 
                    onSubmit={requestOTPForm.handleSubmit(requestOTP)} 
                    className="space-y-4"
                    variants={staggerContainer}
                  >
                    <motion.div variants={staggerItem}>
                      <FormField
                        control={requestOTPForm.control}
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
                        control={requestOTPForm.control}
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
                          'Continue'
                        )}
                      </Button>
                    </motion.div>
                  </motion.form>
                </Form>
              </motion.div>
            )}

            {step === 'verify-otp' && (
              <motion.div
                key="verify-otp"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="relative">
                      <Mail className="h-16 w-16 text-primary" />
                      <motion.div
                        className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                      >
                        <CheckCircle className="h-4 w-4 text-white" />
                      </motion.div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-400">
                    Enter the 6-digit code we sent to your email
                  </p>

                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otpValue}
                      onChange={setOtpValue}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <div className="text-sm">
                    {!canResend ? (
                      <p className="text-gray-400">
                        Code expires in <span className="font-semibold text-white">{formatTime(timeLeft)}</span>
                      </p>
                    ) : (
                      <p className="text-gray-400">
                        Didn't receive the code?{' '}
                        <button
                          onClick={handleResendOTP}
                          disabled={isLoading}
                          className="text-primary hover:text-primary/80 font-semibold underline"
                        >
                          Resend
                        </button>
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  onClick={verifyOTPAndContinue}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-all duration-200"
                  disabled={isLoading || otpValue.length !== 6}
                >
                  {isLoading ? (
                    <motion.div
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    'Verify Code'
                  )}
                </Button>
              </motion.div>
            )}

            {step === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Form {...completeSignUpForm}>
                  <motion.form 
                    onSubmit={completeSignUpForm.handleSubmit(completeSignUp)} 
                    className="space-y-4"
                  >
                    <FormField
                      control={completeSignUpForm.control}
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

                    <FormField
                      control={completeSignUpForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Confirm Password</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-white transition-colors" />
                              <Input
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="Confirm your password"
                                className="pl-10 pr-12 h-12 border-2 border-gray-600 bg-black/50 text-white placeholder:text-gray-400 focus:border-white transition-all duration-200 hover:border-gray-400"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-white transition-colors"
                              >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={completeSignUpForm.control}
                      name="tosAccepted"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm text-white cursor-pointer">
                              I agree to the{' '}
                              <button
                                type="button"
                                onClick={() => setShowTosModal(true)}
                                className="text-primary hover:text-primary/80 underline font-semibold"
                              >
                                Terms of Service
                              </button>
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />

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
                  </motion.form>
                </Form>
              </motion.div>
            )}
          </AnimatePresence>

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

      <TermsOfServiceModal 
        open={showTosModal} 
        onOpenChange={setShowTosModal}
      />
    </motion.div>
  );
}
