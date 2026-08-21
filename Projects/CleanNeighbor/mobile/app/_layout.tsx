import { Slot } from 'expo-router';
import { ClerkProvider } from '@clerk/clerk-expo';

import Constants from 'expo-constants';
import  NotificationProvider from './components/NotificationProvider';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import createTokenCache from '@/utils/tokenCache';
import ErrorBoundary from './components/ErrorBoundary';
import React, { useEffect } from 'react';
import SyncUser from './components/SyncUser';

// Safely get environment variables with proper error handling
const clerkKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || Constants.expoConfig?.extra?.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Validate required environment variables
if (!clerkKey) {
  throw new Error('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not defined. Please check your app.json or .env.local file.');
}

console.log('🔧 Initializing app with:', { clerkKey: clerkKey.substring(0, 20) + '...' });

export default function RootLayout() {
  // Add memory management
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (global.gc) {
        global.gc();
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <ClerkProvider 
        publishableKey={clerkKey}
        tokenCache={createTokenCache()}
      >
        <SafeAreaProvider>
          <ErrorBoundary>
            <NotificationProvider>
              <SyncUser />
              <Slot />
            </NotificationProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </ClerkProvider>
    </ErrorBoundary>
  );
}