import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { useDatabaseQuery, useDatabaseDoc, useDatabaseMutation } from "../../hooks/useDatabase";

import { useNotifications, NotificationHelpers } from '../../hooks/useNotifications';

interface NotificationContextType {
  unreadCount: number;
  sendLocalNotificationForIssue: (issueTitle: string, issueNumber: string) => void;
  sendLocalNotificationForStatus: (issueTitle: string, newStatus: string, note?: string) => void;
  sendLocalNotificationForComment: (issueTitle: string, commenterName: string, isOfficial: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  sendLocalNotificationForIssue: () => {},
  sendLocalNotificationForStatus: () => {},
  sendLocalNotificationForComment: () => {},
});

export const useNotificationContext = () => useContext(NotificationContext);

function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { sendLocalNotification, setBadgeCount } = useNotifications();
  const [lastNotificationCount, setLastNotificationCount] = useState(0);
  const [lastNotificationTime, setLastNotificationTime] = useState(0);

  // Get user data from Convex
  const userData = useDatabaseQuery('users', 
    user?.id ? { clerkId: user.id } : "skip"
  );

  // Get notification counts
  const notificationCounts = useDatabaseQuery('notifications',
    userData ? { userId: userData._id } : "skip"
  );

  // Get latest notifications to detect new ones
  const latestNotifications = useDatabaseQuery('notifications',
    userData ? { userId: userData._id, limit: 5 } : "skip"
  );

  // Watch for new notifications and send local notifications
  useEffect(() => {
    if (latestNotifications && latestNotifications.length > 0) {
      const mostRecentNotification = latestNotifications[0];
      
      // If this is a newer notification than we've seen, send local notification
      if (mostRecentNotification.createdAt > lastNotificationTime && lastNotificationTime > 0) {
        console.log(`🔔 New notification detected:`, mostRecentNotification.title);
        
        // Send local notification with the actual notification details
        sendLocalNotification({
          title: mostRecentNotification.title,
          body: mostRecentNotification.message,
          data: {
            type: mostRecentNotification.type,
            issueId: mostRecentNotification.relatedIssueId || undefined,
          }
        });
        console.log('✅ Local notification sent for:', mostRecentNotification.title);
      }
      
      // Update the last notification time
      setLastNotificationTime(mostRecentNotification.createdAt);
    }
  }, [latestNotifications, lastNotificationTime, sendLocalNotification]);

  // Watch for notification counts and update badge
  useEffect(() => {
    if (notificationCounts?.unread !== undefined) {
      setBadgeCount(notificationCounts.unread);
      
      if (notificationCounts.unread > lastNotificationCount && lastNotificationCount > 0) {
        console.log(`📢 Notification count increased: ${notificationCounts.unread - lastNotificationCount}`);
      }
      
      setLastNotificationCount(notificationCounts.unread);
    }
  }, [notificationCounts?.unread, setBadgeCount, lastNotificationCount]);

  const sendLocalNotificationForIssue = (issueTitle: string, issueNumber: string) => {
    try {
      console.log('🔔 Sending local notification for issue creation');
      const { title, body } = NotificationHelpers.formatIssueCreatedNotification(issueTitle, issueNumber);
      sendLocalNotification({ 
        title, 
        body,
        data: {
          type: 'issue_created',
          issueNumber,
        }
      });
      console.log('✅ Local notification sent for issue creation');
    } catch (error) {
      console.error('❌ Error sending local notification:', error);
    }
  };

  const sendLocalNotificationForStatus = (issueTitle: string, newStatus: string, note?: string) => {
    try {
      console.log('📢 Sending local notification for status update');
      const { title, body } = NotificationHelpers.formatStatusUpdateNotification(issueTitle, newStatus, note);
      sendLocalNotification({ 
        title, 
        body,
        data: {
          type: 'status_update',
          status: newStatus,
        }
      });
      console.log('✅ Local notification sent for status update');
    } catch (error) {
      console.error('Error sending status local notification:', error);
    }
  };

  const sendLocalNotificationForComment = (issueTitle: string, commenterName: string, isOfficial: boolean) => {
    try {
      console.log('💬 Sending local notification for comment');
      const { title, body } = NotificationHelpers.formatCommentNotification(issueTitle, commenterName, isOfficial);
      sendLocalNotification({ 
        title, 
        body,
        data: {
          type: 'new_comment',
          isOfficial: isOfficial.toString(),
        }
      });
      console.log('✅ Local notification sent for comment');
    } catch (error) {
      console.error('Error sending comment local notification:', error);
    }
  };

  const contextValue: NotificationContextType = {
    unreadCount: notificationCounts?.unread || 0,
    sendLocalNotificationForIssue,
    sendLocalNotificationForStatus,
    sendLocalNotificationForComment,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export default NotificationProvider ;