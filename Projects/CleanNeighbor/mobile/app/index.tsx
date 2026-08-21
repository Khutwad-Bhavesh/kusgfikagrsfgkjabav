// Update your mobile/app/index.tsx for better handling

import { Redirect } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { View, ActivityIndicator, Text } from 'react-native';
import { useEffect, useState } from 'react';

export default function Index() {
  const { isSignedIn, isLoaded } = useUser();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    // Give Clerk a moment to check stored tokens
    if (isLoaded) {
      const timer = setTimeout(() => {
        setHasCheckedAuth(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoaded]);

  // Show loading while Clerk is initializing
  if (!isLoaded || !hasCheckedAuth) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={{ marginTop: 10, color: '#64748b' }}>Loading...</Text>
      </View>
    );
  }
  
  if (isSignedIn) {
    return <Redirect href="/(tabs)" />;
  }
  
  return <Redirect href="/(auth)/sign-in" />;
}