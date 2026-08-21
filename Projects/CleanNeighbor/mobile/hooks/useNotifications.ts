import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { router } from 'expo-router';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotifications() {
  const { user } = useUser();
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // Get user's Convex data to use in notifications
  const userData = useQuery(api.users.getUserByClerkId, 
    user?.id ? { clerkId: user.id } : "skip"
  );

  // Mutation to update user's push token
  const updatePushToken = useMutation(api.users.updateUserPushToken);

  // Register for push notifications
  useEffect(() => {
    if (!user?.id) return;

    registerForPushNotificationsAsync().then(async (token) => {
      if (token) {
        setExpoPushToken(token);
        
        // Save token to Convex database
        try {
          await updatePushToken({
            clerkId: user.id,
            expoPushToken: token,
          });
          console.log('✅ Push token registered successfully');
        } catch (error) {
          console.error('❌ Failed to register push token:', error);
        }
      }
    });

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // Listen for notification interactions (user taps notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      // Navigate to relevant screen based on notification data
      if (data?.issueId) {
        router.push(`/(issues)/${data.issueId}` as any);
      } else if (data?.screen) {
        router.push(data.screen as any);
      } else {
        router.push('/(notifications)/notifications');
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user?.id, updatePushToken]);

  // Send a local notification (for immediate feedback)
  const sendLocalNotification = async ({
    title,
    body,
    data = {},
  }: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  };

  // Schedule a notification for later
  const scheduleNotification = async ({
    title,
    body,
    data = {},
    seconds,
  }: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
    seconds: number;
  }) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
        },
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  // Set badge count
  const setBadgeCount = async (count: number) => {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  };

  return {
    expoPushToken,
    notification,
    sendLocalNotification,
    scheduleNotification,
    clearAllNotifications,
    setBadgeCount,
    userData,
  };
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('shuchithvam-notifications', {
        name: 'Shuchithvam Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#16a34a',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
    } catch (error) {
      console.error('Error setting notification channel:', error);
    }
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }
    
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'e7b433c9-4b7c-4b8e-bbfc-453d36608c00',
    });
    
    token = tokenData.data;
    console.log('🔔 Expo push token obtained:', token);
  } catch (e) {
    console.error('Error getting push token:', e);
    return null;
  }

  return token;
}

export const NotificationHelpers = {
  formatIssueCreatedNotification: (issueTitle: string, issueNumber: string) => ({
    title: '✅ Issue Reported Successfully',
    body: `Your issue "${issueTitle}" has been submitted with ID: ${issueNumber}`,
  }),

  formatStatusUpdateNotification: (issueTitle: string, newStatus: string, note?: string) => {
    const statusMessages = {
      pending: '⏳ Issue is pending review',
      acknowledged: '👀 Issue has been acknowledged',
      in_progress: '🔧 Work has started on your issue',
      resolved: '🎉 Issue has been resolved!',
      rejected: '❌ Issue has been rejected'
    };

    return {
      title: newStatus === 'resolved' ? '🎉 Issue Resolved!' : '📢 Issue Status Updated',
      body: `${issueTitle}: ${statusMessages[newStatus as keyof typeof statusMessages]}${note ? ` - ${note}` : ''}`,
    };
  },

  formatCommentNotification: (issueTitle: string, commenterName: string, isOfficial: boolean) => ({
    title: isOfficial ? '🏛️ Official Update' : '💬 New Comment',
    body: `${commenterName} ${isOfficial ? 'posted an official update' : 'commented'} on "${issueTitle}"`,
  }),

  formatSystemNotification: (title: string, message: string) => ({
    title: `🔔 ${title}`,
    body: message,
  }),
};
