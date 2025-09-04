'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import {
  User,
  Lock,
  Bell,
  Palette,
  Globe,
  Shield,
  Eye,
  EyeOff,
  Save,
  ArrowLeft,
  Moon,
  Sun,
  Smartphone,
  Mail,
  Volume2,
  VolumeX,
  Trash2,
  Download,
  Upload
} from 'lucide-react';

// Import dashboard components
import {
  DashboardShell,
  DashboardContent,
  GlassCard,
  Button
} from '@/components/ui/dashboard';
import Sidebar from '@/components/ui/dashboard/Sidebar';

interface UserPreferences {
  theme: 'system' | 'dark' | 'light';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    marketing: boolean;
    orderUpdates: boolean;
    systemAlerts: boolean;
  };
  privacy: {
    showProfile: boolean;
    showActivity: boolean;
    allowDataCollection: boolean;
  };
  accessibility: {
    reducedMotion: boolean;
    highContrast: boolean;
    fontSize: 'small' | 'medium' | 'large';
  };
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  loginNotifications: boolean;
  deviceTracking: boolean;
}

export default function MemberSettingsPage() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  
  // State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'account' | 'security' | 'notifications' | 'privacy' | 'accessibility'>('account');
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'system',
    notifications: {
      email: true,
      push: true,
      sms: false,
      marketing: false,
      orderUpdates: true,
      systemAlerts: true,
    },
    privacy: {
      showProfile: true,
      showActivity: false,
      allowDataCollection: true,
    },
    accessibility: {
      reducedMotion: false,
      highContrast: false,
      fontSize: 'medium',
    },
  });

  const [security, setSecurity] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    sessionTimeout: 60, // minutes
    loginNotifications: true,
    deviceTracking: false,
  });

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

    fetchUserSettings();
  }, [user, loading, isAuthenticated, router]);

  const fetchUserSettings = async () => {
    try {
      const response = await fetch('/api/user/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.preferences) {
          setPreferences(data.preferences);
        }
        if (data.security) {
          setSecurity(data.security);
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences,
          security,
        }),
      });

      if (response.ok) {
        // Settings saved successfully
      } else {
        console.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

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
        alert('Password changed successfully');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      alert('An error occurred while changing password');
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = confirm(
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.'
    );
    
    if (confirmed) {
      try {
        const response = await fetch('/api/user/delete-account', {
          method: 'DELETE',
        });

        if (response.ok) {
          await logout();
          router.push('/');
        } else {
          alert('Failed to delete account');
        }
      } catch (error) {
        console.error('Error deleting account:', error);
        alert('An error occurred while deleting account');
      }
    }
  };

  const exportData = async () => {
    try {
      const response = await fetch('/api/user/export-data');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `user-data-${Date.now()}.json`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto"></div>
            <p className="mt-4 text-slate-300">Loading settings...</p>
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
            <p className="text-slate-300 mb-6">Please log in to access settings.</p>
            <Button onClick={() => router.push('/login')}>Go to Login</Button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const tabItems = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'accessibility', label: 'Accessibility', icon: Palette },
  ];

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
          {/* Header */}
          <header className="sticky top-0 z-20 backdrop-blur-xl mt-6">
            <div className="px-6 md:px-10 pt-4">
              <GlassCard className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => router.push('/dashboard/member')}
                      className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5" />
                      Back to Dashboard
                    </button>
                  </div>
                  <h1 className="text-3xl font-bold text-white">Settings</h1>
                  <div className="w-32"></div>
                </div>
              </GlassCard>
            </div>
          </header>

          {/* Main Content Area */}
          <div className="flex-1 px-6 md:px-10 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              
              {/* Settings Navigation */}
              <div className="lg:col-span-1">
                <GlassCard className="p-4">
                  <nav className="space-y-2">
                    {tabItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center space-x-3 ${
                          activeTab === item.id
                            ? 'bg-lime-400/10 text-lime-400 border border-lime-400/20'
                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    ))}
                  </nav>
                </GlassCard>
              </div>

              {/* Settings Content */}
              <div className="lg:col-span-4">
                <GlassCard className="p-8">
                  
                  {/* Account Settings */}
                  {activeTab === 'account' && (
                    <div>
                      <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white">Account Settings</h2>
                        <p className="text-slate-300 mt-1">Manage your account preferences and basic information</p>
                      </div>

                      <div className="space-y-8">
                        {/* Theme Settings */}
                        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Palette className="w-5 h-5" />
                            Appearance
                          </h3>
                          <div className="grid grid-cols-3 gap-4">
                            {[
                              { value: 'system', label: 'System', icon: Smartphone },
                              { value: 'dark', label: 'Dark', icon: Moon },
                              { value: 'light', label: 'Light', icon: Sun },
                            ].map((theme) => (
                              <button
                                key={theme.value}
                                onClick={() => setPreferences(prev => ({ ...prev, theme: theme.value as any }))}
                                className={`p-4 rounded-lg border transition-all ${
                                  preferences.theme === theme.value
                                    ? 'border-lime-400/50 bg-lime-400/10 text-lime-400'
                                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                                }`}
                              >
                                <theme.icon className="w-6 h-6 mx-auto mb-2" />
                                <div className="text-sm font-medium">{theme.label}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Language & Region */}
                        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Globe className="w-5 h-5" />
                            Language & Region
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">Language</label>
                              <select className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white">
                                <option>English (US)</option>
                                <option>Spanish</option>
                                <option>French</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">Timezone</label>
                              <select className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white">
                                <option>Eastern Time (US & Canada)</option>
                                <option>Pacific Time (US & Canada)</option>
                                <option>Central Time (US & Canada)</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Data Management */}
                        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                          <h3 className="text-lg font-semibold text-white mb-4">Data Management</h3>
                          <div className="flex flex-wrap gap-4">
                            <Button 
                              variant="secondary" 
                              onClick={exportData}
                              className="flex items-center gap-2"
                            >
                              <Download className="w-4 h-4" />
                              Export My Data
                            </Button>
                            <Button 
                              variant="secondary" 
                              className="flex items-center gap-2 opacity-50 cursor-not-allowed"
                            >
                              <Upload className="w-4 h-4" />
                              Import Data (Coming Soon)
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Security Settings */}
                  {activeTab === 'security' && (
                    <div>
                      <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white">Security Settings</h2>
                        <p className="text-slate-300 mt-1">Protect your account with advanced security options</p>
                      </div>

                      <div className="space-y-8">
                        {/* Change Password */}
                        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                          <h3 className="text-lg font-semibold text-white mb-4">Change Password</h3>
                          <div className="max-w-md space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">Current Password</label>
                              <div className="relative">
                                <input
                                  type={showCurrentPassword ? "text" : "password"}
                                  value={passwordData.currentPassword}
                                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-lime-400/50 focus:ring-2 focus:ring-lime-400/20 transition-all pr-12"
                                  placeholder="Enter current password"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                  className="absolute right-3 top-3 text-slate-400 hover:text-white transition-colors"
                                >
                                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
                              <div className="relative">
                                <input
                                  type={showNewPassword ? "text" : "password"}
                                  value={passwordData.newPassword}
                                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-lime-400/50 focus:ring-2 focus:ring-lime-400/20 transition-all pr-12"
                                  placeholder="Enter new password"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                  className="absolute right-3 top-3 text-slate-400 hover:text-white transition-colors"
                                >
                                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">Confirm New Password</label>
                              <input
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-lime-400/50 focus:ring-2 focus:ring-lime-400/20 transition-all"
                                placeholder="Confirm new password"
                              />
                            </div>

                            <Button
                              onClick={handleChangePassword}
                              disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                              className="flex items-center gap-2"
                            >
                              <Lock className="w-4 h-4" />
                              Change Password
                            </Button>
                          </div>
                        </div>

                        {/* Two-Factor Authentication */}
                        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                          <h3 className="text-lg font-semibold text-white mb-4">Two-Factor Authentication</h3>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-medium">Enable 2FA</p>
                              <p className="text-sm text-slate-300">Add an extra layer of security to your account</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={security.twoFactorEnabled}
                                onChange={(e) => setSecurity(prev => ({ ...prev, twoFactorEnabled: e.target.checked }))}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-400/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-400"></div>
                            </label>
                          </div>
                        </div>

                        {/* Session Management */}
                        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                          <h3 className="text-lg font-semibold text-white mb-4">Session Management</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">
                                Session Timeout (minutes)
                              </label>
                              <select
                                value={security.sessionTimeout}
                                onChange={(e) => setSecurity(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                                className="w-full max-w-xs px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white"
                              >
                                <option value={15}>15 minutes</option>
                                <option value={30}>30 minutes</option>
                                <option value={60}>1 hour</option>
                                <option value={120}>2 hours</option>
                                <option value={480}>8 hours</option>
                              </select>
                            </div>

                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-white font-medium">Login Notifications</p>
                                <p className="text-sm text-slate-300">Get notified when someone logs into your account</p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={security.loginNotifications}
                                  onChange={(e) => setSecurity(prev => ({ ...prev, loginNotifications: e.target.checked }))}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-400/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-400"></div>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notifications Settings */}
                  {activeTab === 'notifications' && (
                    <div>
                      <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white">Notification Settings</h2>
                        <p className="text-slate-300 mt-1">Choose how and when you want to be notified</p>
                      </div>

                      <div className="space-y-6">
                        {[
                          { key: 'email', label: 'Email Notifications', description: 'Receive notifications via email', icon: Mail },
                          { key: 'push', label: 'Push Notifications', description: 'Browser and mobile push notifications', icon: Bell },
                          { key: 'sms', label: 'SMS Notifications', description: 'Text message notifications for urgent updates', icon: Smartphone },
                          { key: 'marketing', label: 'Marketing Communications', description: 'Promotional offers and product updates', icon: Volume2 },
                          { key: 'orderUpdates', label: 'Order Updates', description: 'Notifications about your order status', icon: Bell },
                          { key: 'systemAlerts', label: 'System Alerts', description: 'Important system and security notifications', icon: Shield },
                        ].map((notification) => (
                          <div key={notification.key} className="bg-white/5 rounded-xl p-6 border border-white/10">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <notification.icon className="w-6 h-6 text-lime-400" />
                                <div>
                                  <div className="font-medium text-white">{notification.label}</div>
                                  <div className="text-sm text-slate-300">{notification.description}</div>
                                </div>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={preferences.notifications[notification.key as keyof typeof preferences.notifications]}
                                  onChange={(e) => setPreferences(prev => ({
                                    ...prev,
                                    notifications: {
                                      ...prev.notifications,
                                      [notification.key]: e.target.checked
                                    }
                                  }))}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-400/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-400"></div>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Privacy Settings */}
                  {activeTab === 'privacy' && (
                    <div>
                      <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white">Privacy Settings</h2>
                        <p className="text-slate-300 mt-1">Control your privacy and data sharing preferences</p>
                      </div>

                      <div className="space-y-6">
                        {[
                          { key: 'showProfile', label: 'Public Profile', description: 'Make your profile visible to other users' },
                          { key: 'showActivity', label: 'Activity Status', description: 'Show when you were last active' },
                          { key: 'allowDataCollection', label: 'Data Collection', description: 'Allow collection of analytics data to improve services' },
                        ].map((privacy) => (
                          <div key={privacy.key} className="bg-white/5 rounded-xl p-6 border border-white/10">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-white">{privacy.label}</div>
                                <div className="text-sm text-slate-300">{privacy.description}</div>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={preferences.privacy[privacy.key as keyof typeof preferences.privacy]}
                                  onChange={(e) => setPreferences(prev => ({
                                    ...prev,
                                    privacy: {
                                      ...prev.privacy,
                                      [privacy.key]: e.target.checked
                                    }
                                  }))}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-400/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-400"></div>
                              </label>
                            </div>
                          </div>
                        ))}

                        {/* Account Deletion */}
                        <div className="bg-red-900/20 rounded-xl p-6 border border-red-500/20">
                          <h3 className="text-lg font-semibold text-red-200 mb-4 flex items-center gap-2">
                            <Trash2 className="w-5 h-5" />
                            Danger Zone
                          </h3>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-red-200">Delete Account</div>
                              <div className="text-sm text-red-300/80">Permanently delete your account and all associated data</div>
                            </div>
                            <Button 
                              onClick={handleDeleteAccount}
                              className="bg-red-600 hover:bg-red-700 border-red-500"
                            >
                              Delete Account
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Accessibility Settings */}
                  {activeTab === 'accessibility' && (
                    <div>
                      <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white">Accessibility Settings</h2>
                        <p className="text-slate-300 mt-1">Customize the interface for better accessibility</p>
                      </div>

                      <div className="space-y-6">
                        {/* Motion Preferences */}
                        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-white">Reduced Motion</div>
                              <div className="text-sm text-slate-300">Minimize animations and transitions</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={preferences.accessibility.reducedMotion}
                                onChange={(e) => setPreferences(prev => ({
                                  ...prev,
                                  accessibility: {
                                    ...prev.accessibility,
                                    reducedMotion: e.target.checked
                                  }
                                }))}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-400/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-400"></div>
                            </label>
                          </div>
                        </div>

                        {/* High Contrast */}
                        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-white">High Contrast</div>
                              <div className="text-sm text-slate-300">Increase contrast for better visibility</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={preferences.accessibility.highContrast}
                                onChange={(e) => setPreferences(prev => ({
                                  ...prev,
                                  accessibility: {
                                    ...prev.accessibility,
                                    highContrast: e.target.checked
                                  }
                                }))}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-400/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-400"></div>
                            </label>
                          </div>
                        </div>

                        {/* Font Size */}
                        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                          <h3 className="text-lg font-semibold text-white mb-4">Font Size</h3>
                          <div className="grid grid-cols-3 gap-4">
                            {[
                              { value: 'small', label: 'Small' },
                              { value: 'medium', label: 'Medium' },
                              { value: 'large', label: 'Large' },
                            ].map((size) => (
                              <button
                                key={size.value}
                                onClick={() => setPreferences(prev => ({
                                  ...prev,
                                  accessibility: {
                                    ...prev.accessibility,
                                    fontSize: size.value as any
                                  }
                                }))}
                                className={`p-4 rounded-lg border transition-all ${
                                  preferences.accessibility.fontSize === size.value
                                    ? 'border-lime-400/50 bg-lime-400/10 text-lime-400'
                                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                                }`}
                              >
                                <div className={`font-medium ${
                                  size.value === 'small' ? 'text-sm' :
                                  size.value === 'large' ? 'text-lg' : 'text-base'
                                }`}>
                                  {size.label}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="mt-8 pt-6 border-t border-white/10">
                    <Button
                      onClick={handleSaveSettings}
                      disabled={isSaving}
                      className="flex items-center gap-2"
                    >
                      {isSaving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {isSaving ? 'Saving...' : 'Save Settings'}
                    </Button>
                  </div>

                </GlassCard>
              </div>
            </div>
          </div>
        </DashboardContent>
      </div>
    </DashboardShell>
  );
}