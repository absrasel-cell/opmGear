'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Ban,
  UserCheck,
  UserX,
  Crown,
  Shield,
  User,
  Building,
  Truck,
  ShoppingBag,
  Mail,
  Phone,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

import {
  DashboardShell,
  DashboardContent,
  GlassCard,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  StatusBadge
} from '@/components/ui/dashboard';
import Sidebar from '@/components/ui/dashboard/Sidebar';
import DashboardHeader from '@/components/ui/dashboard/DashboardHeader';

// Types
interface User {
  id: string;
  email: string;
  name: string;
  accessRole: string;
  customerRole: string;
  adminLevel?: string;
  phone?: string;
  company?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  isBanned?: boolean;
  lastLoginAt?: string;
}

interface UserFilters {
  accessRole: string;
  customerRole: string;
  status: string;
  search: string;
}

const ACCESS_ROLES = [
  { value: 'MASTER_ADMIN', label: 'Master Admin', icon: Crown, color: 'text-red-400' },
  { value: 'SUPER_ADMIN', label: 'Super Admin', icon: Shield, color: 'text-orange-400' },
  { value: 'STAFF', label: 'Staff', icon: User, color: 'text-green-400' },
  { value: 'CUSTOMER', label: 'Customer', icon: ShoppingBag, color: 'text-slate-400' }
];

const CUSTOMER_ROLES = [
  { value: 'RETAIL', label: 'Retail', icon: User, color: 'text-blue-400' },
  { value: 'WHOLESALE', label: 'Wholesale', icon: Building, color: 'text-purple-400' },
  { value: 'SUPPLIER', label: 'Supplier', icon: Truck, color: 'text-cyan-400' }
];

export default function UsersPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Filters
  const [filters, setFilters] = useState<UserFilters>({
    accessRole: '',
    customerRole: '',
    status: '',
    search: ''
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const usersPerPage = 20;

  // Check admin access
  useEffect(() => {
    if (loading) return;
    
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    
    const isMasterAdmin = user.email === 'absrasel@gmail.com';
    if (user.accessRole !== 'SUPER_ADMIN' && user.accessRole !== 'MASTER_ADMIN' && !isMasterAdmin) {
      router.push('/dashboard/member');
      return;
    }
    
    fetchUsers();
  }, [user, loading, isAuthenticated, router, currentPage]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/users?limit=${usersPerPage}&offset=${(currentPage - 1) * usersPerPage}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setTotalUsers(data.totalCount || 0);
        setTotalPages(Math.ceil((data.totalCount || 0) / usersPerPage));
      } else {
        console.error('Failed to fetch users:', response.status);
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Failed to load users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Database connection failed. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter users
  useEffect(() => {
    let filtered = [...users];
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(user => 
        user.name?.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.company?.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.accessRole) {
      filtered = filtered.filter(user => user.accessRole === filters.accessRole);
    }
    
    if (filters.customerRole) {
      filtered = filtered.filter(user => user.customerRole === filters.customerRole);
    }
    
    if (filters.status) {
      if (filters.status === 'banned') {
        filtered = filtered.filter(user => user.isBanned);
      } else if (filters.status === 'active') {
        filtered = filtered.filter(user => !user.isBanned);
      }
    }
    
    setFilteredUsers(filtered);
  }, [users, filters]);

  const handleAccessRoleChange = async (userId: string, newAccessRole: string) => {
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          updates: { accessRole: newAccessRole }
        })
      });

      if (response.ok) {
        // Update local state
        setUsers(prev => prev.map(user => 
          user.id === userId ? { ...user, accessRole: newAccessRole } : user
        ));
        
        // Show success message
        const updatedUser = users.find(u => u.id === userId);
        setSuccessMessage(`Access role updated successfully for ${updatedUser?.name || updatedUser?.email} to ${newAccessRole}`);
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        console.error('Failed to update user access role');
      }
    } catch (error) {
      console.error('Error updating user access role:', error);
    }
  };

  const handleCustomerRoleChange = async (userId: string, newCustomerRole: string) => {
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          updates: { customerRole: newCustomerRole }
        })
      });

      if (response.ok) {
        // Update local state
        setUsers(prev => prev.map(user => 
          user.id === userId ? { ...user, customerRole: newCustomerRole } : user
        ));
        
        // Show success message
        const updatedUser = users.find(u => u.id === userId);
        setSuccessMessage(`Customer role updated successfully for ${updatedUser?.name || updatedUser?.email} to ${newCustomerRole}`);
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        console.error('Failed to update user customer role');
      }
    } catch (error) {
      console.error('Error updating user customer role:', error);
    }
  };

  const handleBanUser = async (userId: string, ban: boolean) => {
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          updates: { isBanned: ban }
        })
      });

      if (response.ok) {
        setUsers(prev => prev.map(user => 
          user.id === userId ? { ...user, isBanned: ban } : user
        ));
        setBanModalOpen(false);
        setSelectedUser(null);
      } else {
        console.error('Failed to update user ban status');
      }
    } catch (error) {
      console.error('Error updating user ban status:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setUsers(prev => prev.filter(user => user.id !== userId));
        setDeleteModalOpen(false);
        setSelectedUser(null);
      } else {
        const errorData = await response.json();
        console.error('Failed to delete user:', errorData.error);
        alert(`Failed to delete user: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    }
  };

  const getAccessRoleIcon = (accessRole: string) => {
    const roleConfig = ACCESS_ROLES.find(r => r.value === accessRole);
    if (roleConfig) {
      const IconComponent = roleConfig.icon;
      return <IconComponent className={`w-4 h-4 ${roleConfig.color}`} />;
    }
    return <User className="w-4 h-4 text-slate-400" />;
  };

  const getCustomerRoleIcon = (customerRole: string) => {
    const roleConfig = CUSTOMER_ROLES.find(r => r.value === customerRole);
    if (roleConfig) {
      const IconComponent = roleConfig.icon;
      return <IconComponent className={`w-4 h-4 ${roleConfig.color}`} />;
    }
    return <User className="w-4 h-4 text-slate-400" />;
  };

  const getAccessRoleLabel = (accessRole: string) => {
    const roleConfig = ACCESS_ROLES.find(r => r.value === accessRole);
    return roleConfig ? roleConfig.label : accessRole;
  };

  const getCustomerRoleLabel = (customerRole: string) => {
    const roleConfig = CUSTOMER_ROLES.find(r => r.value === customerRole);
    return roleConfig ? roleConfig.label : customerRole;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto"></div>
            <p className="mt-4 text-slate-300">Loading Users Management...</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (!isAuthenticated || !user || (user.accessRole !== 'SUPER_ADMIN' && user.accessRole !== 'MASTER_ADMIN' && user.email !== 'absrasel@gmail.com')) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-400 text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-slate-300 mb-4">You need admin privileges to access this page.</p>
            <Link href="/dashboard/member">
              <Button variant="primary">Go to Member Dashboard</Button>
            </Link>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="flex">
        {/* Sidebar */}
        <Sidebar 
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main Content */}
        <DashboardContent>
          <DashboardHeader
            title="Users Management"
            subtitle="Manage user accounts, roles, and permissions across the platform"
            onSearch={(query) => setFilters(prev => ({ ...prev, search: query }))}
            titleActions={
              <div className="flex items-center gap-3">
                <Link href="/dashboard/admin/quote-request">
                  <Button variant="primary">
                    New Quote
                  </Button>
                </Link>
                <Link href="/dashboard/admin">
                  <Button variant="secondary">
                    ← Back to Dashboard
                  </Button>
                </Link>
              </div>
            }
          />
          
          {/* Content wrapper with proper spacing */}
          <div className="mt-10">
            {/* Success Message */}
          {successMessage && (
            <div className="px-6 md:px-10 mt-4">
              <div className="overflow-hidden rounded-2xl border border-lime-300/20 bg-lime-300/15 p-4 text-lime-100 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5" />
                  <div>
                    <p className="font-medium">{successMessage}</p>
                    <p className="text-sm text-lime-200/80 mt-1">Note: Users will see the role change after refreshing their session or logging out and back in.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <section className="px-6 md:px-10 mt-4">
              <GlassCard className="p-4 border-red-400/20 bg-red-400/5">
                <div className="flex items-center gap-3">
                  <div className="text-red-400">⚠️</div>
                  <div>
                    <div className="text-red-200 font-medium">Error Loading Users</div>
                    <div className="text-red-300 text-sm">{error}</div>
                  </div>
                  <Button 
                    variant="ghost" 
                    className="ml-auto text-red-300 hover:text-red-200"
                    onClick={fetchUsers}
                  >
                    Retry
                  </Button>
                </div>
              </GlassCard>
            </section>
          )}

          {/* Filters */}
          <section className="px-6 md:px-10 mt-6">
            <GlassCard className="p-5">
              <div className="flex flex-wrap gap-3 items-center justify-center">
                {/* Role and Status Filters */}
                <select
                  className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                  value={filters.accessRole}
                  onChange={(e) => setFilters(prev => ({ ...prev, accessRole: e.target.value }))}
                >
                  <option value="">All Access Roles</option>
                  {ACCESS_ROLES.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
                
                <select
                  className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                  value={filters.customerRole}
                  onChange={(e) => setFilters(prev => ({ ...prev, customerRole: e.target.value }))}
                >
                  <option value="">All Customer Roles</option>
                  {CUSTOMER_ROLES.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
                
                <select
                  className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="banned">Banned</option>
                </select>
                
                <Button 
                  variant="ghost" 
                  className="px-3 py-2 bg-slate-800/50 border border-slate-700"
                  onClick={() => setFilters({ accessRole: '', customerRole: '', status: '', search: '' })}
                >
                  Clear
                </Button>
              </div>
            </GlassCard>
          </section>

          {/* Users Table */}
          <section className="px-6 md:px-10 mt-6">
            <GlassCard className="overflow-hidden">
              <div className="p-5 flex items-center justify-between border-b border-white/10">
                <div>
                  <h2 className="text-2xl tracking-tight font-extrabold text-white">Users</h2>
                  <p className="text-sm text-slate-400">
                    {totalUsers} total users • {filteredUsers.length} filtered
                  </p>
                </div>
                                 <div className="flex items-center gap-2">
                   <Button 
                     variant="ghost" 
                     className="px-3 py-1.5 text-xs"
                     onClick={async () => {
                       try {
                         const response = await fetch('/api/test-auth');
                         const data = await response.json();
                         console.log('Auth test result:', data);
                         if (data.success) {
                           alert(`Auth successful!\nUser: ${data.user.name}\nRole: ${data.user.role}\nAdmin: ${data.user.isAdmin}`);
                         } else {
                           alert(`Auth failed: ${data.error}\nDetails: ${data.details}`);
                         }
                       } catch (error) {
                         console.error('Auth test failed:', error);
                         alert('Auth test failed. Check console for details.');
                       }
                     }}
                   >
                     Test Auth
                   </Button>
                   <Button 
                     variant="ghost" 
                     className="px-3 py-1.5 text-xs bg-orange-400/10 text-orange-200 border-orange-400/20"
                     onClick={async () => {
                       try {
                         const response = await fetch('/api/fix-admin-role', { method: 'POST' });
                         const data = await response.json();
                         console.log('Fix admin role result:', data);
                         if (data.success) {
                           alert(`Admin role fixed!\nUser: ${data.user.name}\nRole: ${data.user.role}`);
                           // Refresh the page to reload user data
                           window.location.reload();
                         } else {
                           alert(`Failed to fix admin role: ${data.error}`);
                         }
                       } catch (error) {
                         console.error('Fix admin role failed:', error);
                         alert('Failed to fix admin role. Check console for details.');
                       }
                     }}
                   >
                     Fix Admin Role
                   </Button>
                   <Button 
                     variant="ghost" 
                     className="px-3 py-1.5 text-xs bg-blue-400/10 text-blue-200 border-blue-400/20"
                     onClick={async () => {
                       try {
                         const response = await fetch('/api/test-db-connection');
                         const data = await response.json();
                         console.log('Database connection test result:', data);
                         if (data.success) {
                           alert(`Database connection successful!\nUser count: ${data.userCount}\nFirst user: ${data.firstUser?.email || 'None'}`);
                         } else {
                           alert(`Database connection failed: ${data.error}\nDetails: ${data.details}`);
                         }
                       } catch (error) {
                         console.error('Database connection test failed:', error);
                         alert('Database connection test failed. Check console for details.');
                       }
                     }}
                   >
                     Test DB
                   </Button>
                   <Button variant="ghost" className="px-3 py-1.5 text-xs">Export</Button>
                   <Button variant="primary" className="px-3 py-1.5 text-xs">Invite User</Button>
                 </div>
              </div>
              
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400 mx-auto"></div>
                  <p className="mt-4 text-slate-300">Loading users...</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableHeaderCell>User</TableHeaderCell>
                      <TableHeaderCell>Contact</TableHeaderCell>
                      <TableHeaderCell>Access Role</TableHeaderCell>
                      <TableHeaderCell>Customer Role</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Joined</TableHeaderCell>
                      <TableHeaderCell align="right">Actions</TableHeaderCell>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((userItem) => (
                        <TableRow key={userItem.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                                {userItem.avatarUrl ? (
                                  <img 
                                    src={userItem.avatarUrl} 
                                    className="w-10 h-10 rounded-full object-cover" 
                                    alt="" 
                                  />
                                ) : (
                                  <User className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                              <div>
                                <div className="text-white font-medium">{userItem.name || 'Unknown User'}</div>
                                <div className="text-xs text-slate-400">ID: {userItem.id.slice(-8)}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span className="text-white">{userItem.email}</span>
                              </div>
                              {userItem.phone && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span className="text-slate-300">{userItem.phone}</span>
                                </div>
                              )}
                              {userItem.company && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Building className="w-3 h-3 text-slate-400" />
                                  <span className="text-slate-300">{userItem.company}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getAccessRoleIcon(userItem.accessRole)}
                              <select
                                className="bg-slate-800/50 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-lime-400/50"
                                style={{ backgroundColor: 'rgb(30 41 59 / 0.5)', color: 'white' }}
                                value={userItem.accessRole}
                                onChange={(e) => handleAccessRoleChange(userItem.id, e.target.value)}
                              >
                                {ACCESS_ROLES.map(role => (
                                  <option key={role.value} value={role.value} style={{ backgroundColor: 'rgb(30 41 59)', color: 'white' }}>{role.label}</option>
                                ))}
                              </select>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getCustomerRoleIcon(userItem.customerRole)}
                              <select
                                className="bg-slate-800/50 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-lime-400/50"
                                style={{ backgroundColor: 'rgb(30 41 59 / 0.5)', color: 'white' }}
                                value={userItem.customerRole}
                                onChange={(e) => handleCustomerRoleChange(userItem.id, e.target.value)}
                              >
                                {CUSTOMER_ROLES.map(role => (
                                  <option key={role.value} value={role.value} style={{ backgroundColor: 'rgb(30 41 59)', color: 'white' }}>{role.label}</option>
                                ))}
                              </select>
                            </div>
                          </TableCell>
                          <TableCell>
                            {userItem.isBanned ? (
                              <StatusBadge status="Banned" className="bg-red-400/10 text-red-300 border-red-400/20" />
                            ) : (
                              <StatusBadge status="Active" className="bg-green-400/10 text-green-300 border-green-400/20" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-300">{formatDate(userItem.createdAt)}</span>
                            </div>
                          </TableCell>
                          <TableCell align="right">
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                className="p-1.5 hover:bg-slate-700/50"
                                onClick={() => {
                                  setSelectedUser(userItem);
                                  setEditModalOpen(true);
                                }}
                              >
                                <Edit className="w-4 h-4 text-blue-400" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                className="p-1.5 hover:bg-slate-700/50"
                                onClick={() => {
                                  setSelectedUser(userItem);
                                  setBanModalOpen(true);
                                }}
                              >
                                {userItem.isBanned ? (
                                  <UserCheck className="w-4 h-4 text-green-400" />
                                ) : (
                                  <Ban className="w-4 h-4 text-orange-400" />
                                )}
                              </Button>
                              <Button 
                                variant="ghost" 
                                className="p-1.5 hover:bg-slate-700/50"
                                onClick={() => {
                                  setSelectedUser(userItem);
                                  setDeleteModalOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {filteredUsers.length === 0 && (
                    <div className="p-8 text-center">
                      <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-300">No users found matching your criteria</p>
                    </div>
                  )}
                </>
              )}
            </GlassCard>
          </section>

          {/* Pagination */}
          {totalPages > 1 && (
            <section className="px-6 md:px-10 mt-6">
              <GlassCard className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-400">
                    Showing {((currentPage - 1) * usersPerPage) + 1} to {Math.min(currentPage * usersPerPage, totalUsers)} of {totalUsers} users
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-slate-300">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="ghost"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </section>
          )}

          </div>
          {/* End content wrapper */}
        </DashboardContent>
      </div>

      {/* Edit User Modal */}
      {editModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Edit User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  defaultValue={selectedUser.name || ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  defaultValue={selectedUser.email}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  defaultValue={selectedUser.phone || ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Company</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  defaultValue={selectedUser.company || ''}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => setEditModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  // Handle save logic here
                  setEditModalOpen(false);
                }}
                className="flex-1"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Ban/Unban User Modal */}
      {banModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              {selectedUser.isBanned ? (
                <UserCheck className="w-6 h-6 text-green-400" />
              ) : (
                <Ban className="w-6 h-6 text-orange-400" />
              )}
              <h3 className="text-xl font-bold text-white">
                {selectedUser.isBanned ? 'Unban User' : 'Ban User'}
              </h3>
            </div>
            <p className="text-slate-300 mb-6">
              Are you sure you want to {selectedUser.isBanned ? 'unban' : 'ban'} <strong>{selectedUser.name || selectedUser.email}</strong>?
              {selectedUser.isBanned ? ' They will be able to access the platform again.' : ' They will lose access to the platform.'}
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setBanModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant={selectedUser.isBanned ? "primary" : "destructive"}
                onClick={() => handleBanUser(selectedUser.id, !selectedUser.isBanned)}
                className="flex-1"
              >
                {selectedUser.isBanned ? 'Unban User' : 'Ban User'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deleteModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <h3 className="text-xl font-bold text-white">Delete User</h3>
            </div>
            <p className="text-slate-300 mb-6">
              Are you sure you want to permanently delete <strong>{selectedUser.name || selectedUser.email}</strong>? 
              This action cannot be undone and will remove all associated data.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteUser(selectedUser.id)}
                className="flex-1"
              >
                Delete User
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
