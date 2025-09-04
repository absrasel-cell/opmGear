/**
 * React Query configuration and client setup
 * Optimized for dashboard performance with intelligent caching
 */

import { QueryClient, QueryCache } from '@tanstack/react-query';

// Create a custom query cache with error handling
const queryCache = new QueryCache({
  onError: (error, query) => {
    console.error('Query error:', error, 'Query key:', query.queryKey);
  },
  onSuccess: (data, query) => {
    // Optional: Log successful queries in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Query success:', query.queryKey, 'Data:', data);
    }
  },
});

// Create and configure the query client
export const queryClient = new QueryClient({
  queryCache,
  defaultOptions: {
    queries: {
      // Cache for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep unused data for 10 minutes
      gcTime: 10 * 60 * 1000, 
      // Retry failed requests 2 times with exponential backoff
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus only for critical data
      refetchOnWindowFocus: false,
      // Disable automatic refetch on reconnect by default
      refetchOnReconnect: false,
      // Enable network mode to handle offline scenarios
      networkMode: 'online',
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      // Show loading states for at least 500ms to prevent flicker
      networkMode: 'online',
    },
  },
});

// Query key factory for consistent key generation
export const queryKeys = {
  // Orders
  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.orders.lists(), filters] as const,
    details: () => [...queryKeys.orders.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.orders.details(), id] as const,
  },
  // Users
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },
  // Messages
  messages: {
    all: ['messages'] as const,
    lists: () => [...queryKeys.messages.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.messages.lists(), filters] as const,
  },
  // Shipments
  shipments: {
    all: ['shipments'] as const,
    lists: () => [...queryKeys.shipments.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.shipments.lists(), filters] as const,
  },
  // Stats/Analytics
  stats: {
    all: ['stats'] as const,
    dashboard: () => [...queryKeys.stats.all, 'dashboard'] as const,
    orders: () => [...queryKeys.stats.all, 'orders'] as const,
    revenue: () => [...queryKeys.stats.all, 'revenue'] as const,
  },
} as const;

// Utility functions for cache management
export const cacheUtils = {
  // Invalidate orders cache when orders are updated
  invalidateOrders: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
  },
  
  // Invalidate specific order
  invalidateOrder: (orderId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
  },

  // Invalidate users cache
  invalidateUsers: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
  },

  // Invalidate messages cache
  invalidateMessages: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.messages.all });
  },

  // Clear all cache
  clearAll: () => {
    queryClient.clear();
  },

  // Prefetch orders for better UX
  prefetchOrders: (filters: Record<string, any> = {}) => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.orders.list(filters),
      queryFn: () => fetchOrders(filters),
      staleTime: 2 * 60 * 1000, // Consider fresh for 2 minutes
    });
  },
};

// API functions
export const fetchOrders = async (params: Record<string, any> = {}) => {
  const searchParams = new URLSearchParams();
  
  // Handle pagination
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
  if (params.all) searchParams.set('all', 'true');
  
  // Handle filters
  if (params.status) searchParams.set('status', params.status);
  if (params.search) searchParams.set('search', params.search);
  if (params.userId) searchParams.set('userId', params.userId);
  if (params.email) searchParams.set('email', params.email);
  
  const response = await fetch(`/api/orders?${searchParams}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch orders: ${response.status}`);
  }
  
  return response.json();
};

export const fetchOrderDetails = async (orderId: string) => {
  const response = await fetch(`/api/orders/${orderId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch order details: ${response.status}`);
  }
  
  return response.json();
};

export const fetchUsers = async (params: Record<string, any> = {}) => {
  const searchParams = new URLSearchParams(params);
  const response = await fetch(`/api/admin/users?${searchParams}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.status}`);
  }
  
  return response.json();
};

export const fetchMessages = async (params: Record<string, any> = {}) => {
  const searchParams = new URLSearchParams(params);
  const response = await fetch(`/api/admin/messages?${searchParams}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.status}`);
  }
  
  return response.json();
};

// React Query hooks for common operations
export const useOrdersQuery = (params: Record<string, any> = {}) => {
  return {
    queryKey: queryKeys.orders.list(params),
    queryFn: () => fetchOrders(params),
    staleTime: 2 * 60 * 1000, // 2 minutes for orders list
    refetchOnWindowFocus: true, // Orders are critical data
  };
};

export const useOrderDetailsQuery = (orderId: string) => {
  return {
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => fetchOrderDetails(orderId),
    staleTime: 5 * 60 * 1000, // 5 minutes for order details
    enabled: !!orderId, // Only fetch if orderId is provided
  };
};

export const useUsersQuery = (params: Record<string, any> = {}) => {
  return {
    queryKey: queryKeys.users.list(params),
    queryFn: () => fetchUsers(params),
    staleTime: 10 * 60 * 1000, // 10 minutes for users
  };
};

export const useMessagesQuery = (params: Record<string, any> = {}) => {
  return {
    queryKey: queryKeys.messages.list(params),
    queryFn: () => fetchMessages(params),
    staleTime: 30 * 1000, // 30 seconds for messages (more dynamic)
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  };
};