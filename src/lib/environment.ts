// Environment detection utilities
export function getEnvironment(): 'development' | 'preview' | 'production' {
  // Check Vercel environment variables first
  if (process.env.VERCEL_ENV) {
    switch (process.env.VERCEL_ENV) {
      case 'production':
        return 'production';
      case 'preview':
        return 'preview';
      case 'development':
        return 'development';
      default:
        return 'development';
    }
  }
  
  // Fallback to Next.js environment
  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }
  
  return 'development';
}

export function getAppUrl(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  return 'http://localhost:3000';
}

export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

export function isPreview(): boolean {
  return getEnvironment() === 'preview';
}

export function isDevelopment(): boolean {
  return getEnvironment() === 'development';
}
