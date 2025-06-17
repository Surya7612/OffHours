import CryptoJS from 'crypto-js';

const SECRET_KEY = 'offhours-secret-key-2024';

// Encrypt sensitive data
export const encryptData = (data: string): string => {
  return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
};

// Decrypt sensitive data
export const decryptData = (encryptedData: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
    
    // Check if decryption produced valid data
    if (bytes.sigBytes <= 0) {
      return '';
    }
    
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    // Return empty string if decryption fails
    return '';
  }
};

// Enhanced input sanitization to prevent XSS
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/expression\(/gi, '') // Remove CSS expressions
    .replace(/eval\(/gi, '') // Remove eval calls
    .replace(/script/gi, '') // Remove script tags
    .trim();
};

// Enhanced HTML sanitization
export const sanitizeHTML = (html: string): string => {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
};

// Validate email format with enhanced security
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254; // RFC 5321 limit
};

// Validate password strength
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Generate secure session token
export const generateSessionToken = (): string => {
  return CryptoJS.lib.WordArray.random(32).toString();
};

// Hash password (in production, use bcrypt on backend)
export const hashPassword = (password: string): string => {
  return CryptoJS.SHA256(password + SECRET_KEY).toString();
};

// Enhanced rate limiting for API calls
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private blockedIPs: Set<string> = new Set();

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(identifier: string): boolean {
    // Check if IP is blocked
    if (this.blockedIPs.has(identifier)) {
      return false;
    }

    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      // Block IP after repeated violations
      if (validRequests.length > this.maxRequests * 2) {
        this.blockedIPs.add(identifier);
        setTimeout(() => this.blockedIPs.delete(identifier), this.windowMs * 10); // Block for 10x window
      }
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    return true;
  }

  reset(identifier: string): void {
    this.requests.delete(identifier);
    this.blockedIPs.delete(identifier);
  }
}

export const rateLimiter = new RateLimiter();

// CSRF Token generation and validation
export const generateCSRFToken = (): string => {
  const token = CryptoJS.lib.WordArray.random(32).toString();
  sessionStorage.setItem('csrf_token', token);
  return token;
};

export const validateCSRFToken = (token: string): boolean => {
  const storedToken = sessionStorage.getItem('csrf_token');
  return storedToken === token;
};

// Content Security Policy headers (for production)
export const getCSPHeaders = () => ({
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: Remove unsafe-* in production
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.lu.ma https://api.qrserver.com https://chart.googleapis.com",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ')
});

// Secure localStorage wrapper
export class SecureStorage {
  private static encrypt(data: string): string {
    return encryptData(data);
  }

  private static decrypt(data: string): string {
    return decryptData(data);
  }

  static setItem(key: string, value: string): void {
    try {
      const encryptedValue = this.encrypt(value);
      localStorage.setItem(key, encryptedValue);
    } catch (error) {
      console.error('Error storing encrypted data:', error);
    }
  }

  static getItem(key: string): string | null {
    try {
      const encryptedValue = localStorage.getItem(key);
      if (!encryptedValue) return null;
      return this.decrypt(encryptedValue);
    } catch (error) {
      console.error('Error retrieving encrypted data:', error);
      return null;
    }
  }

  static removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  static clear(): void {
    localStorage.clear();
  }
}

// Input validation for different data types
export const validateInput = {
  name: (name: string): boolean => {
    return /^[a-zA-Z\s]{1,50}$/.test(name.trim());
  },
  
  phone: (phone: string): boolean => {
    return /^\+?[\d\s\-\(\)]{10,15}$/.test(phone);
  },
  
  url: (url: string): boolean => {
    try {
      new URL(url);
      return url.startsWith('https://') || url.startsWith('http://');
    } catch {
      return false;
    }
  },
  
  alphanumeric: (input: string): boolean => {
    return /^[a-zA-Z0-9]+$/.test(input);
  }
};

// SQL Injection prevention (for future backend integration)
export const escapeSQL = (input: string): string => {
  return input.replace(/'/g, "''").replace(/;/g, '');
};

// Session management
export class SessionManager {
  private static readonly SESSION_KEY = 'offhours_session';
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

  static createSession(userId: string): string {
    const sessionData = {
      userId,
      createdAt: Date.now(),
      token: generateSessionToken()
    };
    
    SecureStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
    return sessionData.token;
  }

  static validateSession(): boolean {
    const sessionData = SecureStorage.getItem(this.SESSION_KEY);
    if (!sessionData) return false;

    try {
      const session = JSON.parse(sessionData);
      const now = Date.now();
      
      // Check if session has expired
      if (now - session.createdAt > this.SESSION_TIMEOUT) {
        this.destroySession();
        return false;
      }
      
      return true;
    } catch {
      this.destroySession();
      return false;
    }
  }

  static destroySession(): void {
    SecureStorage.removeItem(this.SESSION_KEY);
  }

  static getUserId(): string | null {
    const sessionData = SecureStorage.getItem(this.SESSION_KEY);
    if (!sessionData) return null;

    try {
      const session = JSON.parse(sessionData);
      return session.userId;
    } catch {
      return null;
    }
  }
}

// Audit logging for security events
export class SecurityAudit {
  private static readonly AUDIT_KEY = 'security_audit_log';

  static log(event: string, details: any = {}): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    try {
      const existingLogs = JSON.parse(localStorage.getItem(this.AUDIT_KEY) || '[]');
      existingLogs.push(logEntry);
      
      // Keep only last 100 entries
      if (existingLogs.length > 100) {
        existingLogs.splice(0, existingLogs.length - 100);
      }
      
      localStorage.setItem(this.AUDIT_KEY, JSON.stringify(existingLogs));
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  static getLogs(): any[] {
    try {
      return JSON.parse(localStorage.getItem(this.AUDIT_KEY) || '[]');
    } catch {
      return [];
    }
  }

  static clearLogs(): void {
    localStorage.removeItem(this.AUDIT_KEY);
  }
}

// Initialize security measures
export const initializeSecurity = (): void => {
  // Log security initialization
  SecurityAudit.log('security_initialized');
  
  // Set up global error handling
  window.addEventListener('error', (event) => {
    SecurityAudit.log('javascript_error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno
    });
  });

  // Set up CSP violation reporting
  document.addEventListener('securitypolicyviolation', (event) => {
    SecurityAudit.log('csp_violation', {
      violatedDirective: event.violatedDirective,
      blockedURI: event.blockedURI,
      originalPolicy: event.originalPolicy
    });
  });

  // Validate session on page load
  if (!SessionManager.validateSession()) {
    console.log('Session validation failed');
  }
};

// Export security configuration
export const SECURITY_CONFIG = {
  PASSWORD_MIN_LENGTH: 8,
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  RATE_LIMIT_REQUESTS: 100,
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  CSRF_TOKEN_EXPIRY: 30 * 60 * 1000, // 30 minutes
  ENCRYPTION_ALGORITHM: 'AES',
  HASH_ALGORITHM: 'SHA256'
};