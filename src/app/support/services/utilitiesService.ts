/**
 * Utilities Service
 * Collection of utility functions used throughout the support page
 */

export interface ConversationStatus {
  label: string;
  badgeClass: string;
}

export interface GuestContactInfo {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  address?: string;
}

export class UtilitiesService {
  /**
   * Format timestamp for conversation list display
   */
  static formatConversationTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Format cap colors in a simplified format
   * @param frontCrown - Front crown color
   * @param backCrown - Back crown color
   * @param bill - Bill color
   * @returns Simplified color format (e.g., "Bottomland/Black" instead of verbose format)
   */
  static formatCapColors(frontCrown: string, backCrown: string, bill: string): string {
    // Handle null/undefined values
    const front = frontCrown || '';
    const back = backCrown || '';
    const billColor = bill || '';

    // Create array of unique colors
    const colors: string[] = [];
    if (front && !colors.includes(front)) colors.push(front);
    if (back && !colors.includes(back)) colors.push(back);
    if (billColor && !colors.includes(billColor)) colors.push(billColor);

    // Return simplified format
    return colors.length > 1 ? colors.join('/') : (colors[0] || front || back || billColor || 'Standard');
  }

  /**
   * Generate a unique session ID
   */
  static generateSessionId(): string {
    return `support-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Generate a unique message ID
   */
  static generateMessageId(suffix?: string): string {
    const timestamp = Date.now().toString();
    return suffix ? `${timestamp}_${suffix}` : timestamp;
  }

  /**
   * Get conversation status with appropriate styling
   */
  static getConversationStatus(conversation: any): ConversationStatus {
    if (conversation.hasQuote || conversation.quoteData) {
      return {
        label: 'Quote Ready',
        badgeClass: 'bg-green-500/20 border-green-400/30 text-green-300'
      };
    } else if (conversation.messageCount > 5) {
      return {
        label: 'In Progress',
        badgeClass: 'bg-blue-500/20 border-blue-400/30 text-blue-300'
      };
    } else {
      return {
        label: 'New',
        badgeClass: 'bg-yellow-500/20 border-yellow-400/30 text-yellow-300'
      };
    }
  }

  /**
   * Truncate content to specified length
   */
  static truncateContent(content: string, maxLength: number = 100): string {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  }

  /**
   * Format file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number (basic validation)
   */
  static validatePhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Sanitize input string
   */
  static sanitizeInput(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(authUser: any): boolean {
    return !!(authUser && authUser.id);
  }

  /**
   * Get user display name
   */
  static getUserDisplayName(userProfile: any, guestContactInfo: GuestContactInfo | null): string {
    if (userProfile?.name) return userProfile.name;
    if (guestContactInfo?.name) return guestContactInfo.name;
    return 'Anonymous User';
  }

  /**
   * Get user email
   */
  static getUserEmail(userProfile: any, guestContactInfo: GuestContactInfo | null): string {
    if (userProfile?.email) return userProfile.email;
    if (guestContactInfo?.email) return guestContactInfo.email;
    return '';
  }

  /**
   * Format currency amount
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  /**
   * Calculate percentage
   */
  static calculatePercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  /**
   * Debounce function for search and other operations
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  /**
   * Deep clone an object
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
    if (obj instanceof Array) return obj.map(item => this.deepClone(item)) as unknown as T;
    if (typeof obj === 'object') {
      const clonedObj = {} as { [key: string]: any };
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone((obj as { [key: string]: any })[key]);
        }
      }
      return clonedObj as T;
    }
    return obj;
  }

  /**
   * Check if object is empty
   */
  static isEmpty(obj: any): boolean {
    if (obj === null || obj === undefined) return true;
    if (typeof obj === 'string') return obj.trim().length === 0;
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
  }

  /**
   * Generate random color for avatars/placeholders
   */
  static generateRandomColor(): string {
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308',
      '#84cc16', '#22c55e', '#10b981', '#14b8a6',
      '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
      '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Get initials from name
   */
  static getInitials(name: string): string {
    if (!name) return 'U';
    const words = name.trim().split(' ');
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  }

  /**
   * Convert string to URL-safe slug
   */
  static createSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Check if URL is valid
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Format date for display
   */
  static formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Format time for display
   */
  static formatTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Format date and time for display
   */
  static formatDateTime(date: Date | string): string {
    return `${this.formatDate(date)} ${this.formatTime(date)}`;
  }

  /**
   * Get localStorage item safely
   */
  static getFromLocalStorage(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  /**
   * Set localStorage item safely
   */
  static setToLocalStorage(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  /**
   * Remove localStorage item safely
   */
  static removeFromLocalStorage(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }

  /**
   * Get sessionStorage item safely
   */
  static getFromSessionStorage(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  /**
   * Set sessionStorage item safely
   */
  static setToSessionStorage(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(key, value);
    } catch (error) {
      console.warn('Failed to save to sessionStorage:', error);
    }
  }

  /**
   * Parse JSON safely
   */
  static parseJSON<T>(jsonString: string, fallback: T): T {
    try {
      return JSON.parse(jsonString);
    } catch {
      return fallback;
    }
  }

  /**
   * Stringify JSON safely
   */
  static stringifyJSON(obj: any): string {
    try {
      return JSON.stringify(obj);
    } catch {
      return '{}';
    }
  }

  /**
   * Wait for specified milliseconds
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry a function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (i === maxRetries) {
          throw lastError;
        }

        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }
}