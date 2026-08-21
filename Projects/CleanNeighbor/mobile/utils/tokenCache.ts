// Create a new file: mobile/app/utils/tokenCache.ts

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { TokenCache } from '@clerk/clerk-expo/';

// Create a custom token cache using Expo SecureStore for Native and localStorage for Web
const createTokenCache = (): TokenCache => {
  if (Platform.OS === 'web') {
    return {
      async getToken(key: string) {
        try {
          return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
        } catch (err) {
          return null;
        }
      },
      async saveToken(key: string, value: string) {
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, value);
          }
        } catch (err) {}
      },
    };
  }

  return {
    async getToken(key: string) {
      try {
        const item = await SecureStore.getItemAsync(key);
        if (item) {
          console.log(`${key} was used 🔐 \n`);
        } else {
          console.log('No values stored under key: ' + key);
        }
        return item;
      } catch (error) {
        console.error('SecureStore get item error: ', error);
        await SecureStore.deleteItemAsync(key);
        return null;
      }
    },
    async saveToken(key: string, value: string) {
      try {
        return SecureStore.setItemAsync(key, value);
      } catch (err) {
        console.error('SecureStore save item error: ', err);
        return;
      }
    },
  };
};

export default createTokenCache;