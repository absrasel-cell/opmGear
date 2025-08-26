'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import {
  User,
  Camera,
  Save,
  X,
  Edit3,
  Mail,
  Phone,
  Building,
  MapPin,
  Shield,
  Bell,
  Eye,
  EyeOff,
  ArrowLeft,
  Crown,
  Settings,
  Database,
  Users,
  Activity
} from 'lucide-react';

// Import dashboard components
import {
  DashboardShell,
  DashboardContent,
  GlassCard,
  Button
} from '@/components/ui/dashboard';
import Sidebar from '@/components/ui/dashboard/Sidebar';
import DashboardHeader from '@/components/ui/dashboard/DashboardHeader';

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  accessRole: string;
  customerRole: string;
  adminLevel?: string;
  phone?: string;
  company?: string;
  avatarUrl?: string;
  privileges?: string[];
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  preferences?: {
    notifications: boolean;
    emailUpdates: boolean;
    marketingEmails: boolean;
    adminNotifications: boolean;
    systemAlerts: boolean;
    accountType?: string;
    wholesale?: {
      companyName?: string;
      businessType?: string;
      interestedProducts?: string;
      estAnnualPurchase?: string;
      website?: string;
      taxId?: string;
    };
    supplier?: {
      factoryName?: string;
      location?: string;
      productCategories?: string;
      website?: string;
      monthlyCapacity?: string;
      certifications?: string;
    };
  };
  createdAt: string;
  lastLoginAt?: string;
}

interface AdminStats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  adminSince: string;
  lastLoginAt?: string;
  actionsToday: number;
}

export default function AdminProfilePage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'admin-settings'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [profileData, setProfileData] = useState<AdminProfile | null>(null);
  const [formData, setFormData] = useState<Partial<AdminProfile>>({});
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (loading) return;
    
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    // Check admin access
    const isMasterAdmin = user.email === 'absrasel@gmail.com' || user.email === 'vic@onpointmarketing.com';
    if (user.accessRole !== 'SUPER_ADMIN' && user.accessRole !== 'MASTER_ADMIN' && !isMasterAdmin) {
      router.push('/dashboard/member');
      return;
    }

    fetchAdminProfile();
    fetchAdminStats();
  }, [user, loading, isAuthenticated, router]);

  const fetchAdminProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setProfileData(data.profile);
        setFormData(data.profile);
      }
    } catch (error) {
      console.error('Error fetching admin profile:', error);
    }
  };

  const fetchAdminStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setAdminStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData(data.profile);
        setIsEditing(false);
      } else {
        console.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        
        const updateResponse = await fetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarUrl: data.file.url }),
        });

        if (updateResponse.ok) {
          const updatedProfile = await updateResponse.json();
          setProfileData(updatedProfile.profile);
          setFormData(updatedProfile.profile);
        }
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const keys = field.split('.');
      
      if (keys.length === 2) {
        const [parent, child] = keys;
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...((prev as any)[parent] || {}),
            [child]: value
          }
        }));
      } else if (keys.length === 3) {
        // Handle nested preferences like preferences.wholesale.companyName
        const [parent, subParent, child] = keys;
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...((prev as any)[parent] || {}),
            [subParent]: {
              ...((prev as any)[parent]?.[subParent] || {}),
              [child]: value
            }
          }
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto"></div>
            <p className="mt-4 text-slate-300">Loading admin profile...</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (!user || !isAuthenticated) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-white mb-2">Access Required</h1>
            <p className="text-slate-300 mb-6">Please log in to view your profile.</p>
            <Button onClick={() => router.push('/login')}>Go to Login</Button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  // Check admin access
  const isMasterAdmin = user.email === 'absrasel@gmail.com' || user.email === 'vic@onpointmarketing.com';
  if (user.accessRole !== 'SUPER_ADMIN' && user.accessRole !== 'MASTER_ADMIN' && !isMasterAdmin) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-400 text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-slate-300 mb-4">You need admin privileges to access this page.</p>
            <Button onClick={() => router.push('/dashboard/member')}>Go to Member Dashboard</Button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <div className="mt-6">
          <Sidebar 
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Main Content */}
        <DashboardContent>
          <DashboardHeader
            title="Admin Profile"
            subtitle="Manage your administrator account settings and preferences"
            onSearch={(query) => console.log('Search:', query)}
            titleActions={
              <button
                onClick={() => router.push('/dashboard/admin')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to Admin Dashboard
              </button>
            }
          />
          
          {/* Content wrapper with proper spacing */}
          <div className="mt-10">

          {/* Main Content Area */}
          <div className="flex-1 px-6 md:px-10 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Admin Profile Sidebar */}
              <div className="lg:col-span-1">
                <GlassCard className="p-0 overflow-hidden">
                  {/* Profile Header */}
                  <div className="relative p-6 text-center bg-gradient-to-br from-red-400/20 to-orange-400/20">
                    {/* Profile Photo */}
                    <div className="relative inline-block mb-4">
                      <div className="w-24 h-24 rounded-2xl border-2 border-white/20 overflow-hidden bg-white/10 flex items-center justify-center">
                        {profileData?.avatarUrl ? (
                          <img 
                            src={profileData.avatarUrl} 
                            alt="Admin Profile" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-10 h-10 text-white/60" />
                        )}
                      </div>
                      
                      {/* Upload Button */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="absolute -bottom-1 -right-1 w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center shadow-lg hover:bg-orange-300 transition-colors disabled:opacity-50"
                        title="Upload Photo"
                      >
                        {isUploadingPhoto ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                        ) : (
                          <Camera className="w-4 h-4 text-black" />
                        )}
                      </button>
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </div>
                    
                    <h2 className="text-xl font-bold text-white">{profileData?.name || user.name}</h2>
                    <p className="text-orange-200 text-sm mt-1">{profileData?.email || user.email}</p>
                    
                    {/* Access Role Badge */}
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mt-3 mr-2 ${
                      user.accessRole === 'MASTER_ADMIN' 
                        ? 'bg-red-400/20 text-red-200 border border-red-400/30'
                        : user.accessRole === 'SUPER_ADMIN'
                        ? 'bg-orange-400/20 text-orange-200 border border-orange-400/30'
                        : user.accessRole === 'STAFF'
                        ? 'bg-blue-400/20 text-blue-200 border border-blue-400/30'
                        : 'bg-lime-400/20 text-lime-200 border border-lime-400/30'
                    }`}>
                      {user.accessRole === 'MASTER_ADMIN' ? '👑 Master Admin' : 
                       user.accessRole === 'SUPER_ADMIN' ? '🛡️ Super Admin' :
                       user.accessRole === 'STAFF' ? '👔 Staff' : '👤 Customer'}
                    </div>
                    
                    {/* Customer Role Badge */}
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mt-1 ${
                      user.customerRole === 'WHOLESALE'
                        ? 'bg-purple-400/20 text-purple-200 border border-purple-400/30'
                        : user.customerRole === 'SUPPLIER'
                        ? 'bg-cyan-400/20 text-cyan-200 border border-cyan-400/30'
                        : 'bg-green-400/20 text-green-200 border border-green-400/30'
                    }`}>
                      {user.customerRole === 'WHOLESALE' ? '🏢 Wholesale' :
                       user.customerRole === 'SUPPLIER' ? '🚛 Supplier' : '🛒 Retail'}
                    </div>
                  </div>

                  {/* Admin Stats */}
                  {adminStats && (
                    <div className="p-6 border-b border-white/10">
                      <h3 className="text-sm font-semibold text-white mb-4">Admin Stats</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-300">Total Users</span>
                          <span className="font-semibold text-white">{adminStats.totalUsers}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-300">Total Orders</span>
                          <span className="font-semibold text-white">{adminStats.totalOrders}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-300">Actions Today</span>
                          <span className="font-semibold text-white">{adminStats.actionsToday}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-300">Admin Since</span>
                          <span className="font-semibold text-white">{formatDate(adminStats.adminSince)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="p-3">
                    <nav className="space-y-1">
                      {[
                        { id: 'profile', label: 'Profile Info', icon: User },
                        { id: 'security', label: 'Security', icon: Shield },
                        { id: 'preferences', label: 'Preferences', icon: Bell },
                        { id: 'admin-settings', label: 'Admin Settings', icon: Settings },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setActiveTab(item.id as any)}
                          className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center space-x-3 ${
                            activeTab === item.id
                              ? 'bg-orange-400/10 text-orange-400 border border-orange-400/20'
                              : 'text-slate-300 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.label}</span>
                        </button>
                      ))}
                    </nav>
                  </div>
                </GlassCard>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-3">
                <GlassCard className="p-8">
                  {/* Profile Info Tab */}
                  {activeTab === 'profile' && (
                    <div>
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h2 className="text-2xl font-bold text-white">Admin Profile Information</h2>
                          <p className="text-slate-300 mt-1">Manage your personal information and admin details</p>
                        </div>
                        {!isEditing ? (
                          <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
                            <Edit3 className="w-4 h-4" />
                            Edit Profile
                          </Button>
                        ) : (
                          <div className="flex gap-3">
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setIsEditing(false);
                                setFormData(profileData || {});
                              }}
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </Button>
                            <Button
                              onClick={handleSaveProfile}
                              disabled={isSaving}
                              className="flex items-center gap-2"
                            >
                              {isSaving ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                              {isSaving ? 'Saving...' : 'Save Changes'}
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Personal Information */}
                        <div className="space-y-6">
                          <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Personal Information</h3>
                          
                          {/* Full Name */}
                          <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                              <User className="w-4 h-4" />
                              Full Name
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={formData.name || ''}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all"
                                placeholder="Enter your full name"
                              />
                            ) : (
                              <div className="px-4 py-3 bg-white/5 rounded-xl text-white border border-white/10">
                                {profileData?.name || 'Not provided'}
                              </div>
                            )}
                          </div>

                          {/* Email */}
                          <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                              <Mail className="w-4 h-4" />
                              Email Address
                            </label>
                            <div className="px-4 py-3 bg-black/20 rounded-xl text-slate-300 border border-white/10 relative">
                              {profileData?.email || user.email}
                              <span className="absolute right-3 top-3 text-xs text-slate-500">Cannot be changed</span>
                            </div>
                          </div>

                          {/* Roles */}
                          <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                              <Crown className="w-4 h-4" />
                              Access & Customer Roles
                            </label>
                            <div className="space-y-2">
                              <div className="px-4 py-3 bg-black/20 rounded-xl text-slate-300 border border-white/10 relative">
                                Access Role: {user.accessRole}
                                <span className="absolute right-3 top-3 text-xs text-slate-500">Managed by System</span>
                              </div>
                              <div className="px-4 py-3 bg-black/20 rounded-xl text-slate-300 border border-white/10 relative">
                                Customer Role: {user.customerRole}
                                <span className="absolute right-3 top-3 text-xs text-slate-500">Managed by System</span>
                              </div>
                            </div>
                          </div>

                          {/* Phone */}
                          <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                              <Phone className="w-4 h-4" />
                              Phone Number
                            </label>
                            {isEditing ? (
                              <input
                                type="tel"
                                value={formData.phone || ''}
                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all"
                                placeholder="Enter your phone number"
                              />
                            ) : (
                              <div className="px-4 py-3 bg-white/5 rounded-xl text-white border border-white/10">
                                {profileData?.phone || 'Not provided'}
                              </div>
                            )}
                          </div>

                          {/* Company */}
                          <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                              <Building className="w-4 h-4" />
                              Company
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={formData.company || ''}
                                onChange={(e) => handleInputChange('company', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all"
                                placeholder="Enter your company name"
                              />
                            ) : (
                              <div className="px-4 py-3 bg-white/5 rounded-xl text-white border border-white/10">
                                {profileData?.company || 'Not provided'}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Address Information */}
                        <div className="space-y-6">
                          <h3 className="flex items-center gap-2 text-lg font-semibold text-white border-b border-white/10 pb-2">
                            <MapPin className="w-5 h-5" />
                            Address Information
                          </h3>
                          
                          {/* Street Address */}
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Street Address</label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={formData.address?.street || ''}
                                onChange={(e) => handleInputChange('address.street', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all"
                                placeholder="Enter your street address"
                              />
                            ) : (
                              <div className="px-4 py-3 bg-white/5 rounded-xl text-white border border-white/10">
                                {profileData?.address?.street || 'Not provided'}
                              </div>
                            )}
                          </div>

                          {/* City & State */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">City</label>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={formData.address?.city || ''}
                                  onChange={(e) => handleInputChange('address.city', e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all"
                                  placeholder="City"
                                />
                              ) : (
                                <div className="px-4 py-3 bg-white/5 rounded-xl text-white border border-white/10">
                                  {profileData?.address?.city || 'Not provided'}
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">State</label>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={formData.address?.state || ''}
                                  onChange={(e) => handleInputChange('address.state', e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all"
                                  placeholder="State"
                                />
                              ) : (
                                <div className="px-4 py-3 bg-white/5 rounded-xl text-white border border-white/10">
                                  {profileData?.address?.state || 'Not provided'}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* ZIP & Country */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">ZIP Code</label>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={formData.address?.zipCode || ''}
                                  onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all"
                                  placeholder="ZIP"
                                />
                              ) : (
                                <div className="px-4 py-3 bg-white/5 rounded-xl text-white border border-white/10">
                                  {profileData?.address?.zipCode || 'Not provided'}
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">Country</label>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={formData.address?.country || ''}
                                  onChange={(e) => handleInputChange('address.country', e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all"
                                  placeholder="Country"
                                />
                              ) : (
                                <div className="px-4 py-3 bg-white/5 rounded-xl text-white border border-white/10">
                                  {profileData?.address?.country || 'Not provided'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Account-Specific Information */}
                        {user.customerRole !== 'RETAIL' && (
                          <div className="md:col-span-2 space-y-6">
                            <h3 className="flex items-center gap-2 text-lg font-semibold text-white border-b border-white/10 pb-2">
                              <Building className="w-5 h-5" />
                              {user.customerRole === 'WHOLESALE' ? 'Wholesale Information' : 'Supplier Information'}
                            </h3>
                            
                            {user.customerRole === 'WHOLESALE' && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Company Name */}
                                <div>
                                  <label className="block text-sm font-medium text-slate-300 mb-2">Company Name</label>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={formData.preferences?.wholesale?.companyName || ''}
                                      onChange={(e) => handleInputChange('preferences.wholesale.companyName', e.target.value)}
                                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all"
                                      placeholder="Enter company name"
                                    />
                                  ) : (
                                    <div className="px-4 py-3 bg-white/5 rounded-xl text-white border border-white/10">
                                      {profileData?.preferences?.wholesale?.companyName || 'Not provided'}
                                    </div>
                                  )}
                                </div>

                                {/* Business Type */}
                                <div>
                                  <label className="block text-sm font-medium text-slate-300 mb-2">Business Type</label>
                                  {isEditing ? (
                                    <select
                                      value={formData.preferences?.wholesale?.businessType || ''}
                                      onChange={(e) => handleInputChange('preferences.wholesale.businessType', e.target.value)}
                                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all"
                                    >
                                      <option value="">Select business type</option>
                                      <option value="Retailer">Retailer</option>
                                      <option value="Team / Booster Club">Team / Booster Club</option>
                                      <option value="Distributor">Distributor</option>
                                      <option value="Agency">Agency</option>
                                      <option value="Other">Other</option>
                                    </select>
                                  ) : (
                                    <div className="px-4 py-3 bg-white/5 rounded-xl text-white border border-white/10">
                                      {profileData?.preferences?.wholesale?.businessType || 'Not provided'}
                                    </div>
                                  )}
                                </div>

                                {/* Interested Products */}
                                <div>
                                  <label className="block text-sm font-medium text-slate-300 mb-2">Interested Products</label>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={formData.preferences?.wholesale?.interestedProducts || ''}
                                      onChange={(e) => handleInputChange('preferences.wholesale.interestedProducts', e.target.value)}
                                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all"
                                      placeholder="Product categories"
                                    />
                                  ) : (
                                    <div className="px-4 py-3 bg-white/5 rounded-xl text-white border border-white/10">
                                      {profileData?.preferences?.wholesale?.interestedProducts || 'Not provided'}
                                    </div>
                                  )}
                                </div>

                                {/* Annual Purchase */}
                                <div>
                                  <label className="block text-sm font-medium text-slate-300 mb-2">Est. Annual Purchase</label>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={formData.preferences?.wholesale?.estAnnualPurchase || ''}
                                      onChange={(e) => handleInputChange('preferences.wholesale.estAnnualPurchase', e.target.value)}
                                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all"
                                      placeholder="Annual volume"
                                    />
                                  ) : (
                                    <div className="px-4 py-3 bg-white/5 rounded-xl text-white border border-white/10">
                                      {profileData?.preferences?.wholesale?.estAnnualPurchase || 'Not provided'}
                                    </div>
                                  )}
                                </div>

                                {/* Tax ID */}
                                <div>
                                  <label className="block text-sm font-medium text-slate-300 mb-2">Tax ID</label>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={formData.preferences?.wholesale?.taxId || ''}
                                      onChange={(e) => handleInputChange('preferences.wholesale.taxId', e.target.value)}
                                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all"
                                      placeholder="Resale/Tax ID"
                                    />
                                  ) : (
                                    <div className="px-4 py-3 bg-white/5 rounded-xl text-white border border-white/10">
                                      {profileData?.preferences?.wholesale?.taxId || 'Not provided'}
                                    </div>
                                  )}
                                </div>

                                {/* Website */}
                                <div>
                                  <label className="block text-sm font-medium text-slate-300 mb-2">Website</label>
                                  {isEditing ? (
                                    <input
                                      type="url"
                                      value={formData.preferences?.wholesale?.website || ''}
                                      onChange={(e) => handleInputChange('preferences.wholesale.website', e.target.value)}
                                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all"
                                      placeholder="https://example.com"
                                    />
                                  ) : (
                                    <div className="px-4 py-3 bg-white/5 rounded-xl text-white border border-white/10">
                                      {profileData?.preferences?.wholesale?.website || 'Not provided'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {user.customerRole === 'SUPPLIER' && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Factory Name */}
                                <div>
                                  <label className="block text-sm font-medium text-slate-300 mb-2">Factory/Manufacturer Name</label>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={formData.preferences?.supplier?.factoryName || ''}
                                      onChange={(e) => handleInputChange('preferences.supplier.factoryName', e.target.value)}
                                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all"
                                      placeholder="Enter factory name"
                                    />
                                  ) : (
                                    <div className="px-4 py-3 bg-white/5 rounded-xl text-white border border-white/10">
                                      {profileData?.preferences?.supplier?.factoryName || 'Not provided'}
                                    </div>
                                  )}
                                </div>

                                {/* Location */}
                                <div>
                                  <label className="block text-sm font-medium text-slate-300 mb-2">Primary Location</label>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={formData.preferences?.supplier?.location || ''}
                                      onChange={(e) => handleInputChange('preferences.supplier.location', e.target.value)}
                                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all"
                                      placeholder="City, Country"
                                    />
                                  ) : (
                                    <div className="px-4 py-3 bg-white/5 rounded-xl text-white border border-white/10">
                                      {profileData?.preferences?.supplier?.location || 'Not provided'}
                                    </div>
                                  )}
                                </div>

                                {/* Product Categories */}
                                <div>
                                  <label className="block text-sm font-medium text-slate-300 mb-2">Product Categories</label>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={formData.preferences?.supplier?.productCategories || ''}
                                      onChange={(e) => handleInputChange('preferences.supplier.productCategories', e.target.value)}
                                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all"
                                      placeholder="Primary products"
                                    />
                                  ) : (
                                    <div className="px-4 py-3 bg-white/5 rounded-xl text-white border border-white/10">
                                      {profileData?.preferences?.supplier?.productCategories || 'Not provided'}
                                    </div>
                                  )}
                                </div>

                                {/* Monthly Capacity */}
                                <div>
                                  <label className="block text-sm font-medium text-slate-300 mb-2">Monthly Capacity</label>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={formData.preferences?.supplier?.monthlyCapacity || ''}
                                      onChange={(e) => handleInputChange('preferences.supplier.monthlyCapacity', e.target.value)}
                                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all"
                                      placeholder="Production capacity"
                                    />
                                  ) : (
                                    <div className="px-4 py-3 bg-white/5 rounded-xl text-white border border-white/10">
                                      {profileData?.preferences?.supplier?.monthlyCapacity || 'Not provided'}
                                    </div>
                                  )}
                                </div>

                                {/* Certifications */}
                                <div>
                                  <label className="block text-sm font-medium text-slate-300 mb-2">Certifications</label>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={formData.preferences?.supplier?.certifications || ''}
                                      onChange={(e) => handleInputChange('preferences.supplier.certifications', e.target.value)}
                                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all"
                                      placeholder="Certifications held"
                                    />
                                  ) : (
                                    <div className="px-4 py-3 bg-white/5 rounded-xl text-white border border-white/10">
                                      {profileData?.preferences?.supplier?.certifications || 'Not provided'}
                                    </div>
                                  )}
                                </div>

                                {/* Website */}
                                <div>
                                  <label className="block text-sm font-medium text-slate-300 mb-2">Website</label>
                                  {isEditing ? (
                                    <input
                                      type="url"
                                      value={formData.preferences?.supplier?.website || ''}
                                      onChange={(e) => handleInputChange('preferences.supplier.website', e.target.value)}
                                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all"
                                      placeholder="https://factory.com"
                                    />
                                  ) : (
                                    <div className="px-4 py-3 bg-white/5 rounded-xl text-white border border-white/10">
                                      {profileData?.preferences?.supplier?.website || 'Not provided'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Security Tab */}
                  {activeTab === 'security' && (
                    <div>
                      <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white">Security Settings</h2>
                        <p className="text-slate-300 mt-1">Manage your password and security preferences</p>
                      </div>

                      <div className="max-w-md space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Current Password</label>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              value={passwordData.currentPassword}
                              onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all pr-12"
                              placeholder="Enter current password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-3 text-slate-400 hover:text-white transition-colors"
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
                          <input
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all"
                            placeholder="Enter new password"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Confirm New Password</label>
                          <input
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all"
                            placeholder="Confirm new password"
                          />
                        </div>

                        <Button
                          disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                          className="w-full"
                        >
                          Change Password
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Preferences Tab */}
                  {activeTab === 'preferences' && (
                    <div>
                      <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white">Preferences</h2>
                        <p className="text-slate-300 mt-1">Customize your admin experience and notification settings</p>
                      </div>

                      <div className="space-y-6">
                        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                          <h3 className="text-lg font-semibold text-white mb-4">Notification Preferences</h3>
                          <div className="space-y-4">
                            {[
                              { key: 'notifications', label: 'Push Notifications', description: 'Receive notifications about system updates' },
                              { key: 'emailUpdates', label: 'Email Updates', description: 'Get important updates via email' },
                              { key: 'adminNotifications', label: 'Admin Notifications', description: 'Receive admin-specific alerts' },
                              { key: 'systemAlerts', label: 'System Alerts', description: 'Get notified about system issues' },
                            ].map((pref) => (
                              <div key={pref.key} className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-white">{pref.label}</div>
                                  <div className="text-sm text-slate-300">{pref.description}</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.preferences?.[pref.key as keyof typeof formData.preferences] || false}
                                    onChange={(e) => handleInputChange(`preferences.${pref.key}`, e.target.checked)}
                                    className="sr-only peer"
                                  />
                                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-400/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-400"></div>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Admin Settings Tab */}
                  {activeTab === 'admin-settings' && (
                    <div>
                      <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white">Admin Settings</h2>
                        <p className="text-slate-300 mt-1">Manage your administrative privileges and settings</p>
                      </div>

                      <div className="space-y-6">
                        <div className="bg-orange-400/5 rounded-xl p-6 border border-orange-400/20">
                          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-orange-400" />
                            Administrative Information
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">Admin Level</label>
                              <div className="px-4 py-3 bg-black/20 rounded-xl text-slate-300 border border-white/10">
                                {profileData?.adminLevel || 'Not set'}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">Access Level</label>
                              <div className="px-4 py-3 bg-black/20 rounded-xl text-slate-300 border border-white/10">
                                {user.accessRole}
                              </div>
                            </div>
                          </div>
                        </div>

                        {profileData?.privileges && profileData.privileges.length > 0 && (
                          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                            <h3 className="text-lg font-semibold text-white mb-4">Current Privileges</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {profileData.privileges.map((privilege, index) => (
                                <div key={index} className="px-3 py-2 bg-lime-400/10 text-lime-200 border border-lime-400/20 rounded-lg text-sm">
                                  {privilege}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="bg-red-400/5 rounded-xl p-6 border border-red-400/20">
                          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Database className="w-5 h-5 text-red-400" />
                            Admin Actions
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Button variant="ghost" className="justify-start bg-white/5 border border-white/10">
                              <Users className="w-4 h-4 mr-2" />
                              Manage Users
                            </Button>
                            <Button variant="ghost" className="justify-start bg-white/5 border border-white/10">
                              <Activity className="w-4 h-4 mr-2" />
                              View System Logs
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </GlassCard>
              </div>
            </div>
          </div>

          </div>
          {/* End content wrapper */}
        </DashboardContent>
      </div>
    </DashboardShell>
  );
}