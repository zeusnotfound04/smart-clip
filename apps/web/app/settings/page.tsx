'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
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
  Zap
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

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  
  const [profile, setProfile] = useState({
    name: user?.name || 'John Doe',
    email: user?.email || 'john@example.com',
    phone: '+1 (555) 123-4567',
    bio: 'Content creator and video enthusiast. Love using AI to create amazing videos.',
    website: 'https://johndoe.com',
    location: 'San Francisco, CA'
  });

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

  const usageStats = {
    videosProcessed: 147,
    storageUsed: 2.4,
    storageLimit: 10,
    apiCalls: 1250,
    apiLimit: 5000
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
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
                                : 'hover:bg-slate-100'
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
                            <AvatarImage src="/api/placeholder/80/80" />
                            <AvatarFallback className="text-lg">
                              {profile.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-2">
                            <Button variant="outline" className="gap-2">
                              <Upload className="w-4 h-4" />
                              Upload Photo
                            </Button>
                            <Button variant="ghost" className="gap-2">
                              <Camera className="w-4 h-4" />
                              Take Photo
                            </Button>
                          </div>
                        </div>

                        <Separator />

                        {/* Profile Form */}
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                              id="name"
                              value={profile.name}
                              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                              id="email"
                              type="email"
                              value={profile.email}
                              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                              id="phone"
                              value={profile.phone}
                              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="website">Website</Label>
                            <Input
                              id="website"
                              type="url"
                              value={profile.website}
                              onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                              id="location"
                              value={profile.location}
                              onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="bio">Bio</Label>
                          <Textarea
                            id="bio"
                            rows={3}
                            value={profile.bio}
                            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                            placeholder="Tell us about yourself..."
                          />
                        </div>

                        <div className="flex justify-end">
                          <Button className="gap-2">
                            <Save className="w-4 h-4" />
                            Save Changes
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
                        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                          <div>
                            <h3 className="font-semibold text-lg">Pro Plan</h3>
                            <p className="text-muted-foreground">Perfect for content creators</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">$29/month</div>
                            <Badge variant="secondary">Active</Badge>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Next Billing Date</Label>
                            <p className="text-sm">December 15, 2025</p>
                          </div>
                          <div className="space-y-2">
                            <Label>Payment Method</Label>
                            <p className="text-sm">**** **** **** 4242</p>
                          </div>
                        </div>

                        <Separator />

                        <div className="flex gap-2">
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
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Usage Statistics</CardTitle>
                        <CardDescription>Track your plan usage and limits</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Videos Processed</span>
                            <span>{usageStats.videosProcessed} this month</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Storage Used</span>
                            <span>{usageStats.storageUsed}GB / {usageStats.storageLimit}GB</span>
                          </div>
                          <Progress value={(usageStats.storageUsed / usageStats.storageLimit) * 100} />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>API Calls</span>
                            <span>{usageStats.apiCalls} / {usageStats.apiLimit}</span>
                          </div>
                          <Progress value={(usageStats.apiCalls / usageStats.apiLimit) * 100} />
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