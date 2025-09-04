'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  Home
} from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  accessRole: string;
  customerRole: string;
  adminLevel?: string;
  phone?: string;
  company?: string;
  avatarUrl?: string;
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
    accountType?: string;
    wholesale?: {
      interestedProducts: string;
      businessType: string;
      companyName: string;
      estAnnualPurchase: string;
      website: string;
      taxId: string;
    };
    supplier?: {
      factoryName: string;
      location: string;
      productCategories: string;
      website: string;
      monthlyCapacity: string;
      certifications: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

interface UserStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalMessages: number;
  unreadMessages: number;
  totalQuantity: number;
  totalSpent: number;
  memberSince: string;
  lastLoginAt?: string;
}

export default function ProfilePage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loading) return;
    
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    fetchUserProfile();
    fetchUserStats();
  }, [user, loading, isAuthenticated, router]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setProfileData(data.profile);
        setFormData(data.profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/user/stats');
      if (response.ok) {
        const data = await response.json();
        setUserStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    
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
        setSuccessMessage('Profile updated successfully!');
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long');
      return;
    }

    setIsChangingPassword(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setSuccessMessage('Password changed successfully!');
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        const error = await response.json();
        setErrorMessage(error.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File size must be less than 5MB');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update profile with new avatar URL
        const updateResponse = await fetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarUrl: data.file.url }),
        });

        if (updateResponse.ok) {
          const updatedProfile = await updateResponse.json();
          setProfileData(updatedProfile.profile);
          setFormData(updatedProfile.profile);
          setSuccessMessage('Profile photo updated successfully!');
          setTimeout(() => setSuccessMessage(''), 5000);
        } else {
          setErrorMessage('Failed to update profile with new photo');
        }
      } else {
        const error = await response.json();
        setErrorMessage(error.error || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      setErrorMessage('Error uploading photo');
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...((prev as any)[parent] || {}),
          [child]: value
        }
      }));
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-[#05070e] to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-lime-400 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-slate-300 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-[#05070e] to-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Access Required</h1>
          <p className="text-slate-300 mb-6">Please log in to view your profile.</p>
          <Link
            href="/login"
            className="inline-flex items-center px-6 py-3 bg-lime-500/90 text-slate-900 font-medium rounded-xl hover:bg-lime-400 transition-all duration-300 hover:scale-105 shadow-lg backdrop-blur-sm"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#05070e] to-black">
      {/* Background: dark gradient + accent glows */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#000,rgba(5,7,14,1)_40%,#000)]" />
        <div className="absolute inset-x-0 top-0 h-[40vh] bg-[radial-gradient(60%_30%_at_50%_0%,rgba(255,255,255,0.06),transparent)]" />
        <div className="absolute -top-10 -left-20 h-80 w-80 rounded-full bg-lime-400/10 blur-3xl" />
        <div className="absolute top-40 -right-24 h-96 w-96 rounded-full bg-orange-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-purple-500/10 blur-3xl" />
      </div>


      {/* Success/Error Messages */}
      {successMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="rounded-xl bg-lime-500/10 border border-lime-400/30 text-lime-400 px-4 py-3 text-sm backdrop-blur-sm">
            {successMessage}
          </div>
        </div>
      )}
      {errorMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="rounded-xl bg-red-500/10 border border-red-400/30 text-red-400 px-4 py-3 text-sm backdrop-blur-sm">
            {errorMessage}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Profile Sidebar */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl ring-1 ring-white/5 shadow-xl overflow-hidden">
              {/* Profile Header */}
              <div className="relative bg-gradient-to-br from-lime-500/20 via-purple-500/20 to-slate-500/20 p-6 border-b border-white/10">
                <div className="relative z-10 text-center">
                  {/* Profile Photo Section */}
                  <div className="relative inline-block mb-4">
                    <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20 overflow-hidden">
                      {profileData?.avatarUrl ? (
                        <img 
                          src={profileData.avatarUrl} 
                          alt="Profile" 
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
                          <User className="w-8 h-8 text-slate-300" />
                        </div>
                      )}
                    </div>
                    
                    {/* Upload Button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 w-8 h-8 bg-lime-400/90 rounded-full flex items-center justify-center shadow-lg hover:bg-lime-300 transition-all duration-300 hover:scale-110"
                      title="Upload Photo"
                    >
                      <Camera className="w-4 h-4 text-slate-900" />
                    </button>
                    
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>
                  
                  <h2 className="text-xl font-bold text-slate-100">{profileData?.name || user.name}</h2>
                  <p className="text-slate-300 text-sm mt-1">{profileData?.email || user.email}</p>
                  
                  {/* Access Role Badge */}
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mt-3 mr-2 border backdrop-blur-sm ${
                    profileData?.accessRole === 'MASTER_ADMIN' || user.accessRole === 'MASTER_ADMIN'
                      ? 'bg-red-500/20 text-red-300 border-red-400/30' 
                      : profileData?.accessRole === 'SUPER_ADMIN' || user.accessRole === 'SUPER_ADMIN'
                      ? 'bg-orange-500/20 text-orange-300 border-orange-400/30'
                      : profileData?.accessRole === 'STAFF' || user.accessRole === 'STAFF'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                      : 'bg-lime-500/20 text-lime-300 border-lime-400/30'
                  }`}>
                    {
                      profileData?.accessRole === 'MASTER_ADMIN' || user.accessRole === 'MASTER_ADMIN' ? '👑 Master Admin' :
                      profileData?.accessRole === 'SUPER_ADMIN' || user.accessRole === 'SUPER_ADMIN' ? '🛡️ Super Admin' :
                      profileData?.accessRole === 'STAFF' || user.accessRole === 'STAFF' ? '👔 Staff' :
                      '👤 Customer'
                    }
                  </div>
                  
                  {/* Customer Role Badge */}
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mt-1 border backdrop-blur-sm ${
                    profileData?.customerRole === 'WHOLESALE' || user.customerRole === 'WHOLESALE'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-400/30'
                      : profileData?.customerRole === 'SUPPLIER' || user.customerRole === 'SUPPLIER'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30'
                      : 'bg-green-500/20 text-green-300 border-green-400/30'
                  }`}>
                    {
                      profileData?.customerRole === 'WHOLESALE' || user.customerRole === 'WHOLESALE' ? '🏢 Wholesale' :
                      profileData?.customerRole === 'SUPPLIER' || user.customerRole === 'SUPPLIER' ? '🚛 Supplier' :
                      '🛒 Retail'
                    }
                  </div>
                </div>
              </div>

              {/* Stats */}
              {userStats && (
                <div className="p-6 border-b border-white/10">
                  <h3 className="text-sm font-semibold text-slate-200 mb-4">Account Stats</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Total Orders</span>
                      <span className="font-semibold text-slate-200">{userStats.totalOrders}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Pending Orders</span>
                      <span className="font-semibold text-lime-400">{userStats.pendingOrders}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Total Spent</span>
                      <span className="font-semibold text-slate-200">{formatPrice(userStats.totalSpent)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Messages</span>
                      <span className="font-semibold text-slate-200">{userStats.totalMessages}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Member Since</span>
                      <span className="font-semibold text-slate-200">{formatDate(userStats.memberSince)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="p-2">
                <nav className="space-y-1">
                  {[
                    { id: 'profile', label: 'Profile Info', icon: '👤' },
                    { id: 'security', label: 'Security', icon: '🔒' },
                    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as any)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 flex items-center space-x-3 backdrop-blur-sm ${
                        activeTab === item.id
                          ? 'bg-lime-500/20 text-lime-300 shadow-sm border border-lime-400/30'
                          : 'text-slate-300 hover:bg-white/10 hover:text-slate-200 border border-transparent hover:border-white/20'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl ring-1 ring-white/5 shadow-xl overflow-hidden">
              {/* Profile Info Tab */}
              {activeTab === 'profile' && (
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-100">Profile Information</h2>
                      <p className="text-slate-300 mt-1">Manage your personal information and contact details</p>
                    </div>
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="inline-flex items-center px-4 py-2 bg-lime-500/90 text-slate-900 font-medium rounded-xl hover:bg-lime-400 transition-all duration-300 hover:scale-105 shadow-lg backdrop-blur-sm"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit Profile
                      </button>
                    ) : (
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            setFormData(profileData || {});
                            setErrorMessage('');
                          }}
                          className="inline-flex items-center px-4 py-2 border border-white/20 text-slate-300 rounded-xl hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveProfile}
                          disabled={isSaving}
                          className="inline-flex items-center px-4 py-2 bg-lime-500/90 text-slate-900 font-medium rounded-xl hover:bg-lime-400 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 backdrop-blur-sm"
                        >
                          {isSaving ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-900 border-t-transparent mr-2"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Personal Information */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-slate-200 border-b border-white/20 pb-2 flex items-center">
                        <User className="w-5 h-5 mr-2 text-lime-400" />
                        Personal Information
                      </h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center">
                          <User className="w-4 h-4 mr-2 text-lime-400" />
                          Full Name
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.name || ''}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300 backdrop-blur-sm"
                            placeholder="Enter your full name"
                          />
                        ) : (
                          <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-200 backdrop-blur-sm">
                            {profileData?.name || 'Not provided'}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-lime-400" />
                          Email Address
                        </label>
                        <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-200 relative backdrop-blur-sm">
                          {profileData?.email || user.email}
                          <span className="absolute right-3 top-3 text-xs text-slate-500">Cannot be changed</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center">
                          <Phone className="w-4 h-4 mr-2 text-lime-400" />
                          Phone Number
                        </label>
                        {isEditing ? (
                          <input
                            type="tel"
                            value={formData.phone || ''}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300 backdrop-blur-sm"
                            placeholder="Enter your phone number"
                          />
                        ) : (
                          <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-200 backdrop-blur-sm">
                            {profileData?.phone || 'Not provided'}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center">
                          <Building className="w-4 h-4 mr-2 text-lime-400" />
                          Company
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.company || ''}
                            onChange={(e) => handleInputChange('company', e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300 backdrop-blur-sm"
                            placeholder="Enter your company name"
                          />
                        ) : (
                          <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-200 backdrop-blur-sm">
                            {profileData?.company || 'Not provided'}
                          </div>
                        )}
                      </div>

                      {/* Account Type Information */}
                      {profileData?.customerRole && profileData.customerRole !== 'RETAIL' && (
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Customer Type</label>
                          <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                              profileData.customerRole === 'WHOLESALE'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-400/30'
                                : profileData.customerRole === 'SUPPLIER'
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30'
                                : 'bg-lime-500/20 text-lime-300 border-lime-400/30'
                            }`}>
                              {profileData.customerRole === 'WHOLESALE' ? '🏢 Wholesale Account' :
                               profileData.customerRole === 'SUPPLIER' ? '🚛 Supplier Account' : '🛒 Retail Account'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Address Information */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-slate-200 border-b border-white/20 pb-2 flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-lime-400" />
                        Address Information
                      </h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Street Address</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.address?.street || ''}
                            onChange={(e) => handleInputChange('address.street', e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300 backdrop-blur-sm"
                            placeholder="Enter your street address"
                          />
                        ) : (
                          <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-200 backdrop-blur-sm">
                            {profileData?.address?.street || 'Not provided'}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">City</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={formData.address?.city || ''}
                              onChange={(e) => handleInputChange('address.city', e.target.value)}
                              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300 backdrop-blur-sm"
                              placeholder="City"
                            />
                          ) : (
                            <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-200 backdrop-blur-sm">
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
                              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300 backdrop-blur-sm"
                              placeholder="State"
                            />
                          ) : (
                            <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-200 backdrop-blur-sm">
                              {profileData?.address?.state || 'Not provided'}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">ZIP Code</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={formData.address?.zipCode || ''}
                              onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
                              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300 backdrop-blur-sm"
                              placeholder="ZIP"
                            />
                          ) : (
                            <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-200 backdrop-blur-sm">
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
                              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300 backdrop-blur-sm"
                              placeholder="Country"
                            />
                          ) : (
                            <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-200 backdrop-blur-sm">
                              {profileData?.address?.country || 'Not provided'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="p-8">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-100 flex items-center">
                      <Shield className="w-6 h-6 mr-3 text-lime-400" />
                      Security Settings
                    </h2>
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
                          className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/20 rounded-xl text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300 backdrop-blur-sm"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
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
                        className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300 backdrop-blur-sm"
                        placeholder="Enter new password"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/20 rounded-xl text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300 backdrop-blur-sm"
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleChangePassword}
                      disabled={isChangingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                      className="w-full px-4 py-3 bg-lime-500/90 text-slate-900 font-medium rounded-xl hover:bg-lime-400 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
                    >
                      {isChangingPassword ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-900 border-t-transparent mr-2 inline-block"></div>
                          Changing Password...
                        </>
                      ) : (
                        'Change Password'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div className="p-8">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-100 flex items-center">
                      <Bell className="w-6 h-6 mr-3 text-lime-400" />
                      Preferences
                    </h2>
                    <p className="text-slate-300 mt-1">Customize your experience and notification settings</p>
                  </div>

                  <div className="space-y-8">
                    {/* Notification Preferences */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                      <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center">
                        <Bell className="w-5 h-5 mr-2 text-lime-400" />
                        Notification Preferences
                      </h3>
                      <div className="space-y-4">
                        {[
                          { key: 'notifications', label: 'Push Notifications', description: 'Receive notifications about order updates' },
                          { key: 'emailUpdates', label: 'Email Updates', description: 'Get important updates via email' },
                          { key: 'marketingEmails', label: 'Marketing Emails', description: 'Receive promotional offers and news' },
                        ].map((pref) => (
                          <div key={pref.key} className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-slate-200">{pref.label}</div>
                              <div className="text-sm text-slate-400">{pref.description}</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(formData.preferences?.[pref.key as keyof typeof formData.preferences])}
                                onChange={(e) => handleInputChange(`preferences.${pref.key}`, e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-400/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-500"></div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Account Type Specific Information */}
                    {profileData?.preferences?.wholesale && (
                      <div className="bg-orange-500/5 border border-orange-400/20 rounded-xl p-6 backdrop-blur-sm">
                        <h3 className="text-lg font-semibold text-orange-300 mb-4 flex items-center">
                          🏢 Wholesale Account Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-400">Business Type:</span>
                            <div className="text-slate-200">{profileData.preferences.wholesale.businessType || 'Not specified'}</div>
                          </div>
                          <div>
                            <span className="text-slate-400">Company:</span>
                            <div className="text-slate-200">{profileData.preferences.wholesale.companyName || 'Not specified'}</div>
                          </div>
                          <div>
                            <span className="text-slate-400">Products of Interest:</span>
                            <div className="text-slate-200">{profileData.preferences.wholesale.interestedProducts || 'Not specified'}</div>
                          </div>
                          <div>
                            <span className="text-slate-400">Est. Annual Purchase:</span>
                            <div className="text-slate-200">{profileData.preferences.wholesale.estAnnualPurchase || 'Not specified'}</div>
                          </div>
                          {profileData.preferences.wholesale.website && (
                            <div>
                              <span className="text-slate-400">Website:</span>
                              <div className="text-lime-400 hover:text-lime-300">
                                <a href={profileData.preferences.wholesale.website} target="_blank" rel="noopener noreferrer">
                                  {profileData.preferences.wholesale.website}
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {profileData?.preferences?.supplier && (
                      <div className="bg-purple-500/5 border border-purple-400/20 rounded-xl p-6 backdrop-blur-sm">
                        <h3 className="text-lg font-semibold text-purple-300 mb-4 flex items-center">
                          🏭 Supplier Account Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-400">Factory Name:</span>
                            <div className="text-slate-200">{profileData.preferences.supplier.factoryName || 'Not specified'}</div>
                          </div>
                          <div>
                            <span className="text-slate-400">Location:</span>
                            <div className="text-slate-200">{profileData.preferences.supplier.location || 'Not specified'}</div>
                          </div>
                          <div>
                            <span className="text-slate-400">Product Categories:</span>
                            <div className="text-slate-200">{profileData.preferences.supplier.productCategories || 'Not specified'}</div>
                          </div>
                          <div>
                            <span className="text-slate-400">Monthly Capacity:</span>
                            <div className="text-slate-200">{profileData.preferences.supplier.monthlyCapacity || 'Not specified'}</div>
                          </div>
                          <div>
                            <span className="text-slate-400">Certifications:</span>
                            <div className="text-slate-200">{profileData.preferences.supplier.certifications || 'Not specified'}</div>
                          </div>
                          {profileData.preferences.supplier.website && (
                            <div>
                              <span className="text-slate-400">Website:</span>
                              <div className="text-lime-400 hover:text-lime-300">
                                <a href={profileData.preferences.supplier.website} target="_blank" rel="noopener noreferrer">
                                  {profileData.preferences.supplier.website}
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
