'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  Search, 
  Loader2,
  ShieldCheck,
  Mail,
  Calendar,
  Video,
  FileText
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { motion } from 'framer-motion';

// API Base URL
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001').replace(/\/+$/, '');

interface User {
  id: string;
  name: string | null;
  email: string;
  credits: number;
  totalCreditsUsed: number;
  subscriptionTier: string;
  subscriptionStatus: string | null;
  isAdmin: boolean;
  _count: {
    projects: number;
    videos: number;
    scriptProjects: number;
  };
}

interface AdminStats {
  totalUsers: number;
  totalCreditsDistributed: number;
  totalCreditsUsed: number;
  activeSubscriptions: number;
  recentTransactions: any[];
}

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [topUpEmail, setTopUpEmail] = useState('');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpReason, setTopUpReason] = useState('');
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin, currentPage, searchQuery]);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/check`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('smartclips_token')}`,
        },
      });

      const data = await response.json();
      
      if (!data.success || !data.isAdmin) {
        toast({
          title: 'Access Denied',
          description: 'You do not have admin privileges',
          variant: 'destructive',
        });
        router.push('/dashboard');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin status:', error);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/stats`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('smartclips_token')}`,
          },
        }),
        fetch(`${API_BASE_URL}/api/admin/users?page=${currentPage}&limit=20${searchQuery ? `&search=${searchQuery}` : ''}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('smartclips_token')}`,
          },
        })
      ]);

      const statsData = await statsRes.json();
      const usersData = await usersRes.json();

      if (statsData.success) {
        setStats(statsData.stats);
      }

      if (usersData.success) {
        setUsers(usersData.users);
        setTotalPages(usersData.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load admin data',
        variant: 'destructive',
      });
    }
  };

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!topUpEmail || !topUpAmount) {
      toast({
        title: 'Validation Error',
        description: 'Email and credits amount are required',
        variant: 'destructive',
      });
      return;
    }

    const credits = parseInt(topUpAmount);
    if (isNaN(credits) || credits <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Credits must be a positive number',
        variant: 'destructive',
      });
      return;
    }

    setIsTopUpLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/credits/topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('smartclips_token')}`,
        },
        body: JSON.stringify({
          email: topUpEmail,
          credits,
          reason: topUpReason || `Admin top-up: ${credits} credits`
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to top up credits');
      }

      toast({
        title: 'Success!',
        description: `Added ${credits} credits to ${topUpEmail}`,
      });

      // Reset form
      setTopUpEmail('');
      setTopUpAmount('');
      setTopUpReason('');
      
      // Reload data
      loadAdminData();
    } catch (error) {
      console.error('Top up error:', error);
      toast({
        title: 'Top Up Failed',
        description: error instanceof Error ? error.message : 'Failed to top up credits',
        variant: 'destructive',
      });
    } finally {
      setIsTopUpLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadAdminData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          Manage users, credits, and view platform statistics
        </p>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credits Distributed</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCreditsDistributed.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCreditsUsed.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Top Up Credits Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Top Up User Credits</CardTitle>
            <CardDescription>Add credits to a user account by email</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTopUp} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="topup-email">User Email</Label>
                  <Input
                    id="topup-email"
                    type="email"
                    placeholder="user@example.com"
                    value={topUpEmail}
                    onChange={(e) => setTopUpEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="topup-amount">Credits Amount</Label>
                  <Input
                    id="topup-amount"
                    type="number"
                    placeholder="100"
                    min="1"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="topup-reason">Reason (Optional)</Label>
                  <Input
                    id="topup-reason"
                    type="text"
                    placeholder="Promotional credits"
                    value={topUpReason}
                    onChange={(e) => setTopUpReason(e.target.value)}
                  />
                </div>
              </div>
              
              <Button type="submit" disabled={isTopUpLoading}>
                {isTopUpLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Top Up Credits
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>View and manage all platform users</CardDescription>
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-64"
                />
                <Button onClick={handleSearch} size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {user.isAdmin && <ShieldCheck className="h-4 w-4 text-primary" />}
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>{user.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.credits}</Badge>
                    </TableCell>
                    <TableCell>{user.totalCreditsUsed}</TableCell>
                    <TableCell>
                      <Badge variant={user.subscriptionTier === 'free' ? 'outline' : 'default'}>
                        {user.subscriptionTier}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 text-sm text-muted-foreground">
                        <span title="Projects">{user._count.projects}P</span>
                        <span title="Videos">{user._count.videos}V</span>
                        <span title="Scripts">{user._count.scriptProjects}S</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                        {user.subscriptionStatus || 'inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
