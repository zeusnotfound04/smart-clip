'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { 
  ArrowLeft,
  User,
  Settings,
  Bell,
  Shield,
  CreditCard,
  Download,
  Trash2,
  Upload,
  Camera,
  Mail,
  Phone,
  Globe,
  Eye,
  EyeOff,
  Save,
  Key,
  Database,
  Zap,
  Check
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/lib/auth-context';
import { staggerContainer, staggerItem } from '@/lib/utils';
import { useUserProfile, useUserStats, useUpdateProfile, useUploadProfilePicture } from '@/hooks/use-user-queries';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Email change state
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  
  // 🔥 Tanstack Query hooks with automatic caching
  const { data: profileData, isLoading: profileLoading } = useUserProfile();
  const { data: stats, isLoading: statsLoading } = useUserStats();
  const updateProfileMutation = useUpdateProfile();
  const uploadPictureMutation = useUploadProfilePicture();
  
  const [profile, setProfile] = useState({
    name: '',
    email: '',
  });

  // Update local state when profile data loads
  React.useEffect(() => {
    if (profileData) {
      setProfile({
        name: profileData.name || '',
        email: profileData.email || '',
      });
    }
  }, [profileData]);

  const handleProfileUpdate = () => {
    updateProfileMutation.mutate({
      name: profile.name,
      email: profile.email,
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadPictureMutation.mutate(file);
    }
  };

  const handleSendEmailOTP = async () => {
    if (!newEmail) {
      toast.error('Please enter a new email address');
      return;
    }

    if (newEmail === profileData?.email) {
      toast.error('New email is the same as current email');
      return;
    }

    try {
      setSendingOtp(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/email/request-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('smartclips_token')}`,
        },
        body: JSON.stringify({ newEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setOtpSent(true);
      toast.success('Verification code sent to your new email!');
    } catch (error: any) {
      console.error('Send OTP error:', error);
      toast.error(error.message || 'Failed to send verification code');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyEmailOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }

    try {
      setVerifyingOtp(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/email/verify-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('smartclips_token')}`,
        },
        body: JSON.stringify({ newEmail, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify code');
      }

      // Reset state
      setIsChangingEmail(false);
      setOtpSent(false);
      setNewEmail('');
      setOtp('');
      
      // Refresh profile data
      window.location.reload();
      
      toast.success('Email updated successfully!');
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      toast.error(error.message || 'Failed to verify code');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleCancelEmailChange = () => {
    setIsChangingEmail(false);
    setOtpSent(false);
    setNewEmail('');
    setOtp('');
  };

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    processingUpdates: true,
    weeklyDigest: false,
    marketingEmails: false
  });

  const [privacy, setPrivacy] = useState({
    profileVisibility: 'public',
    showEmail: false,
    showPhone: false,
    dataCollection: true,
    analytics: true
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'data', label: 'Data & Storage', icon: Database },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-6"
          >
            {/* Header */}
            <motion.div variants={staggerItem}>
              <div className="flex items-center gap-4 mb-6">
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Settings</h1>
                  <p className="text-muted-foreground">Manage your account and preferences</p>
                </div>
              </div>
            </motion.div>

            <div className="grid lg:grid-cols-4 gap-6">
              {/* Sidebar Navigation */}
              <motion.div variants={staggerItem} className="lg:col-span-1">
                <Card>
                  <CardContent className="p-0">
                    <nav className="space-y-1">
                      {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                              activeTab === tab.id
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="font-medium">{tab.label}</span>
                          </button>
                        );
                      })}
                    </nav>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Main Content */}
              <div className="lg:col-span-3 space-y-6">
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <motion.div
                    variants={staggerItem}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>Update your personal information and profile settings</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Profile Picture */}
                        <div className="flex items-center gap-6">
                          <Avatar className="w-20 h-20">
                            <AvatarImage src={profileData?.image || '/api/placeholder/80/80'} />
                            <AvatarFallback className="text-lg">
                              {profileData?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-2">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleImageUpload}
                            />
                            <Button 
                              variant="outline" 
                              className="gap-2"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploadPictureMutation.isPending}
                            >
                              <Upload className="w-4 h-4" />
                              {uploadPictureMutation.isPending ? 'Uploading...' : 'Upload Photo'}
                            </Button>
                            <p className="text-xs text-muted-foreground">
                              JPG, PNG or WebP. Max 5MB
                            </p>
                          </div>
                        </div>

                        <Separator />

                        {/* Profile Form */}
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                              id="name"
                              value={profile.name}
                              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                            />
                          </div>
                          
                          {/* Email Change Section */}
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="email">Email Address</Label>
                              {!isChangingEmail ? (
                                <div className="space-y-2">
                                  <Input
                                    id="email"
                                    type="email"
                                    value={profileData?.email || ''}
                                    disabled
                                    className="bg-muted"
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsChangingEmail(true)}
                                    className="w-full sm:w-auto"
                                  >
                                    <Mail className="w-4 h-4 mr-2" />
                                    Change Email Address
                                  </Button>
                                </div>
                              ) : (
                                <Card className="p-4 border-2 border-blue-500/20 bg-blue-500/5">
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="newEmail">New Email Address</Label>
                                      <Input
                                        id="newEmail"
                                        type="email"
                                        placeholder="Enter new email"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        disabled={otpSent}
                                      />
                                    </div>

                                    {!otpSent ? (
                                      <div className="flex gap-2">
                                        <Button
                                          onClick={handleSendEmailOTP}
                                          disabled={sendingOtp || !newEmail}
                                          className="flex-1"
                                        >
                                          <Mail className="w-4 h-4 mr-2" />
                                          {sendingOtp ? 'Sending...' : 'Send Verification Code'}
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          onClick={handleCancelEmailChange}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="space-y-3">
                                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                          <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                                            <Check className="w-4 h-4" />
                                            Verification code sent to {newEmail}
                                          </p>
                                        </div>
                                        
                                        <div className="space-y-2">
                                          <Label htmlFor="otp">Enter Verification Code</Label>
                                          <Input
                                            id="otp"
                                            type="text"
                                            placeholder="Enter 6-digit code"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            maxLength={6}
                                            className="text-center text-2xl tracking-widest font-mono"
                                          />
                                          <p className="text-xs text-muted-foreground">
                                            Code expires in 10 minutes
                                          </p>
                                        </div>

                                        <div className="flex gap-2">
                                          <Button
                                            onClick={handleVerifyEmailOTP}
                                            disabled={verifyingOtp || otp.length !== 6}
                                            className="flex-1"
                                          >
                                            {verifyingOtp ? 'Verifying...' : 'Verify & Update Email'}
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            onClick={handleCancelEmailChange}
                                          >
                                            Cancel
                                          </Button>
                                        </div>

                                        <Button
                                          variant="link"
                                          size="sm"
                                          onClick={() => {
                                            setOtpSent(false);
                                            setOtp('');
                                          }}
                                          className="w-full"
                                        >
                                          Didn't receive code? Try again
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </Card>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button 
                            className="gap-2"
                            onClick={handleProfileUpdate}
                            disabled={updateProfileMutation.isPending}
                          >
                            <Save className="w-4 h-4" />
                            {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                  <motion.div
                    variants={staggerItem}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>Notification Preferences</CardTitle>
                        <CardDescription>Choose how you want to be notified about updates and activities</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <Label>Email Notifications</Label>
                              <p className="text-sm text-muted-foreground">Receive updates via email</p>
                            </div>
                            <Switch
                              checked={notifications.emailNotifications}
                              onCheckedChange={(checked) => 
                                setNotifications({ ...notifications, emailNotifications: checked })
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <Label>Push Notifications</Label>
                              <p className="text-sm text-muted-foreground">Browser push notifications</p>
                            </div>
                            <Switch
                              checked={notifications.pushNotifications}
                              onCheckedChange={(checked) => 
                                setNotifications({ ...notifications, pushNotifications: checked })
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <Label>Processing Updates</Label>
                              <p className="text-sm text-muted-foreground">Notifications when videos are processed</p>
                            </div>
                            <Switch
                              checked={notifications.processingUpdates}
                              onCheckedChange={(checked) => 
                                setNotifications({ ...notifications, processingUpdates: checked })
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <Label>Weekly Digest</Label>
                              <p className="text-sm text-muted-foreground">Weekly summary of your activity</p>
                            </div>
                            <Switch
                              checked={notifications.weeklyDigest}
                              onCheckedChange={(checked) => 
                                setNotifications({ ...notifications, weeklyDigest: checked })
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <Label>Marketing Emails</Label>
                              <p className="text-sm text-muted-foreground">Product updates and tips</p>
                            </div>
                            <Switch
                              checked={notifications.marketingEmails}
                              onCheckedChange={(checked) => 
                                setNotifications({ ...notifications, marketingEmails: checked })
                              }
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Privacy & Security Tab */}
                {activeTab === 'privacy' && (
                  <motion.div
                    variants={staggerItem}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>Privacy Settings</CardTitle>
                        <CardDescription>Control your privacy and data sharing preferences</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Profile Visibility</Label>
                            <Select 
                              value={privacy.profileVisibility} 
                              onValueChange={(value) => setPrivacy({ ...privacy, profileVisibility: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="public">Public</SelectItem>
                                <SelectItem value="private">Private</SelectItem>
                                <SelectItem value="friends">Friends Only</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <Label>Show Email Address</Label>
                              <p className="text-sm text-muted-foreground">Make your email visible to others</p>
                            </div>
                            <Switch
                              checked={privacy.showEmail}
                              onCheckedChange={(checked) => setPrivacy({ ...privacy, showEmail: checked })}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <Label>Show Phone Number</Label>
                              <p className="text-sm text-muted-foreground">Make your phone visible to others</p>
                            </div>
                            <Switch
                              checked={privacy.showPhone}
                              onCheckedChange={(checked) => setPrivacy({ ...privacy, showPhone: checked })}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <Label>Data Collection</Label>
                              <p className="text-sm text-muted-foreground">Allow collection of usage data for improvements</p>
                            </div>
                            <Switch
                              checked={privacy.dataCollection}
                              onCheckedChange={(checked) => setPrivacy({ ...privacy, dataCollection: checked })}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <Label>Analytics</Label>
                              <p className="text-sm text-muted-foreground">Share anonymized analytics data</p>
                            </div>
                            <Switch
                              checked={privacy.analytics}
                              onCheckedChange={(checked) => setPrivacy({ ...privacy, analytics: checked })}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Security</CardTitle>
                        <CardDescription>Manage your account security settings</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="current-password">Current Password</Label>
                          <div className="relative">
                            <Input
                              id="current-password"
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Enter current password"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="new-password">New Password</Label>
                          <Input id="new-password" type="password" placeholder="Enter new password" />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirm-password">Confirm New Password</Label>
                          <Input id="confirm-password" type="password" placeholder="Confirm new password" />
                        </div>

                        <div className="flex gap-2">
                          <Button className="gap-2">
                            <Key className="w-4 h-4" />
                            Update Password
                          </Button>
                          <Button variant="outline">
                            Enable 2FA
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Billing Tab */}
                {activeTab === 'billing' && (
                  <motion.div
                    variants={staggerItem}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>Current Plan</CardTitle>
                        <CardDescription>Manage your subscription and billing</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-700">
                          <div>
                            <h3 className="font-semibold text-lg capitalize">{stats?.subscriptionTier || 'Free'} Plan</h3>
                            <p className="text-muted-foreground">
                              {stats?.subscriptionTier === 'premium' ? 'Unlimited features' : 
                               stats?.subscriptionTier === 'pro' ? 'Perfect for content creators' : 
                               'Get started with basic features'}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">
                              {stats?.subscriptionTier === 'premium' ? '$99/month' : 
                               stats?.subscriptionTier === 'pro' ? '$29/month' : 
                               'Free'}
                            </div>
                            <Badge variant={stats?.subscriptionTier === 'free' ? 'secondary' : 'default'}>
                              Active
                            </Badge>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Credits Available</Label>
                            <p className="text-sm font-medium">{stats?.creditsAvailable || 0} credits</p>
                          </div>
                          <div className="space-y-2">
                            <Label>Videos Processed</Label>
                            <p className="text-sm font-medium">{stats?.videosProcessed || 0} videos</p>
                          </div>
                        </div>

                        <Separator />

                        <div className="flex gap-2 flex-wrap">
                          {stats?.subscriptionTier === 'free' && (
                            <Button>
                              <CreditCard className="w-4 h-4 mr-2" />
                              Upgrade Plan
                            </Button>
                          )}
                          {stats?.subscriptionTier !== 'free' && (
                            <>
                              <Button variant="outline">
                                <CreditCard className="w-4 h-4 mr-2" />
                                Update Payment Method
                              </Button>
                              <Button variant="outline">
                                <Download className="w-4 h-4 mr-2" />
                                Download Invoices
                              </Button>
                              <Button variant="destructive">
                                Cancel Subscription
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Usage Statistics</CardTitle>
                        <CardDescription>Track your usage and activity</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Videos Processed</span>
                            <span className="font-medium">{stats?.videosProcessed || 0} total</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Projects Created</span>
                            <span className="font-medium">{stats?.projectsCreated || 0} projects</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Credits Remaining</span>
                            <span className="font-medium">{stats?.creditsAvailable || 0} credits</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Data & Storage Tab */}
                {activeTab === 'data' && (
                  <motion.div
                    variants={staggerItem}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>Data Management</CardTitle>
                        <CardDescription>Export, backup, or delete your data</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <Download className="w-8 h-8 text-blue-500" />
                                <div>
                                  <h3 className="font-semibold">Export Data</h3>
                                  <p className="text-sm text-muted-foreground">Download all your projects and data</p>
                                </div>
                              </div>
                              <Button className="w-full mt-4" variant="outline">
                                Export All Data
                              </Button>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <Trash2 className="w-8 h-8 text-red-500" />
                                <div>
                                  <h3 className="font-semibold">Delete Account</h3>
                                  <p className="text-sm text-muted-foreground">Permanently delete your account</p>
                                </div>
                              </div>
                              <Button className="w-full mt-4" variant="destructive">
                                Delete Account
                              </Button>
                            </CardContent>
                          </Card>
                        </div>

                        <Separator />

                        <div>
                          <h3 className="font-semibold mb-4">Storage Breakdown</h3>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Videos</span>
                              <span className="text-sm font-medium">1.8 GB</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Generated Content</span>
                              <span className="text-sm font-medium">0.4 GB</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Thumbnails & Cache</span>
                              <span className="text-sm font-medium">0.2 GB</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center font-semibold">
                              <span>Total Used</span>
                              <span>2.4 GB</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  );
}