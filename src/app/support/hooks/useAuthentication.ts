import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';

interface UserProfile {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: any;
  company?: string;
}

interface GuestContactInfo {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  company?: string;
}

export function useAuthentication() {
  const { user: authUser, loading: authLoading, isAuthenticated } = useAuth();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [guestContactInfo, setGuestContactInfo] = useState<GuestContactInfo | null>(null);
  const [showGuestContactForm, setShowGuestContactForm] = useState(false);
  const [pendingQuoteMessage, setPendingQuoteMessage] = useState<string | null>(null);

  // Debug auth state changes
  useEffect(() => {
    console.log('🔄 SUPPORT PAGE: Auth state changed ->', {
      authLoading,
      isAuthenticated,
      userId: authUser?.id,
      userEmail: authUser?.email,
      timestamp: new Date().toISOString()
    });
  }, [authLoading, isAuthenticated, authUser?.id, authUser?.email]);

  // Load user profile when auth user changes
  useEffect(() => {
    if (authUser?.email) {
      loadUserProfile();
    }
  }, [authUser]);

  const loadUserProfile = async () => {
    if (!authUser?.email) {
      return;
    }

    try {
      // The authUser already contains profile data, use it directly
      setUserProfile({
        id: authUser.id || undefined,
        name: authUser.name || undefined,
        email: authUser.email || undefined,
        phone: authUser.phone || undefined,
        company: authUser.company || undefined,
        address: undefined // Not available in AuthContext
      });
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const handleGuestQuoteRequest = (message: string) => {
    setPendingQuoteMessage(message);
    setShowGuestContactForm(true);
  };

  const submitGuestQuote = async (contactInfo: GuestContactInfo) => {
    setGuestContactInfo(contactInfo);
    setShowGuestContactForm(false);

    // Return the pending quote message to be processed
    const message = pendingQuoteMessage;
    setPendingQuoteMessage(null);
    return message;
  };

  const resetGuestForm = () => {
    setShowGuestContactForm(false);
    setPendingQuoteMessage(null);
  };

  return {
    // Auth state
    authUser,
    authLoading,
    isAuthenticated,

    // User profile
    userProfile,
    setUserProfile,
    loadUserProfile,

    // Guest functionality
    guestContactInfo,
    setGuestContactInfo,
    showGuestContactForm,
    setShowGuestContactForm,
    pendingQuoteMessage,
    setPendingQuoteMessage,
    handleGuestQuoteRequest,
    submitGuestQuote,
    resetGuestForm
  };
}