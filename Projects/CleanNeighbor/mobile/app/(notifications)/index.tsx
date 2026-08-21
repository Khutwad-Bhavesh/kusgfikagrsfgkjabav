import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  Alert
} from 'react-native'
import { useUser } from '@clerk/clerk-expo'
import { useDatabaseQuery, useDatabaseDoc, useDatabaseMutation } from "../hooks/useDatabase";
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'


import { useNotifications } from '@/hooks/useNotifications'

export default function NotificationsPage() {
  const { user } = useUser()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'issue_update' | 'system'>('all')
  const { setBadgeCount } = useNotifications()

  // Get user data from Convex
  const userData = useDatabaseQuery('users', 
    user?.id ? { clerkId: user.id } : "skip"
  )

  // Get notifications from Convex
  const notifications = useDatabaseQuery('notifications', 
    userData ? { 
      userId: userData._id,
      filter: filter,
      limit: 100
    } : "skip"
  )

  // Get notification counts
  const notificationCounts = useDatabaseQuery('notifications',
    userData ? { userId: userData._id } : "skip"
  )

  // Mutations
  const markAsRead = useDatabaseMutation('notifications')
  const markAllAsRead = useDatabaseMutation('notifications')
  const deleteNotification = useDatabaseMutation('notifications')

  // Update badge count when notifications change
  useEffect(() => {
    if (notificationCounts?.unread !== undefined) {
      setBadgeCount(notificationCounts.unread)
    }
  }, [notificationCounts?.unread, setBadgeCount])

  const onRefresh = async () => {
    setRefreshing(true)
    // Convex will automatically refetch the data
    setTimeout(() => setRefreshing(false), 1000)
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead({ notificationId })
    } catch (error) {
      console.error('Error marking notification as read:', error)
      Alert.alert('Error', 'Failed to mark notification as read')
    }
  }

  const handleMarkAllAsRead = () => {
    if (!userData) return
    
    Alert.alert(
      'Mark All as Read',
      'Are you sure you want to mark all notifications as read?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark All',
          onPress: async () => {
            try {
              await markAllAsRead({ userId: userData._id })
            } catch (error) {
              console.error('Error marking all notifications as read:', error)
              Alert.alert('Error', 'Failed to mark all notifications as read')
            }
          }
        }
      ]
    )
  }

  const handleDeleteNotification = (notificationId: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNotification({ notificationId })
            } catch (error) {
              console.error('Error deleting notification:', error)
              Alert.alert('Error', 'Failed to delete notification')
            }
          }
        }
      ]
    )
  }

  const handleNotificationPress = async (notification: any) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id)
    }

    // Navigate to related issue if available
    if (notification.relatedIssueId) {
      router.push(`/(issues)/${notification.relatedIssueId}`)
    }
  }

  const unreadCount = notificationCounts?.unread || 0

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays <= 7) return `${diffDays} days ago`
    
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short'
    })
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'issue_created':
        return 'add-circle'
      case 'issue_update':
        return 'refresh-circle'
      case 'issue_resolved':
        return 'checkmark-circle'
      case 'new_comment':
        return 'chatbubble'
      case 'system':
        return 'settings'
      default:
        return 'notifications'
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'issue_created':
        return '#3b82f6'
      case 'issue_update':
        return '#f59e0b'
      case 'issue_resolved':
        return '#10b981'
      case 'new_comment':
        return '#8b5cf6'
      case 'system':
        return '#6b7280'
      default:
        return '#6b7280'
    }
  }

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b'
      case 'acknowledged': return '#3b82f6'
      case 'in_progress': return '#8b5cf6'
      case 'resolved': return '#10b981'
      case 'rejected': return '#ef4444'
      default: return '#6b7280'
    }
  }

  // Show loading state
  if (!notifications || !notificationCounts) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={handleMarkAllAsRead} disabled={unreadCount === 0}>
          <Ionicons 
            name="checkmark-done" 
            size={24} 
            color={unreadCount > 0 ? "white" : "rgba(255,255,255,0.5)"} 
          />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterTabs}>
            {[
              { key: 'all', label: 'All', count: notificationCounts.total },
              { key: 'unread', label: 'Unread', count: notificationCounts.unread },
              { key: 'issue_update', label: 'Issues', count: notificationCounts.issueUpdates },
              { key: 'system', label: 'System', count: notificationCounts.system }
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterTab,
                  filter === tab.key && styles.activeFilterTab
                ]}
                onPress={() => setFilter(tab.key as any)}
              >
                <Text style={[
                  styles.filterTabText,
                  filter === tab.key && styles.activeFilterTabText
                ]}>
                  {tab.label} ({tab.count})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Notifications List */}
      <ScrollView 
        style={styles.notificationsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {notifications && notifications.length > 0 ? (
          notifications.map((notification) => (
            <TouchableOpacity 
              key={notification._id} 
              style={[
                styles.notificationCard,
                !notification.isRead && styles.unreadNotification
              ]}
              onPress={() => handleNotificationPress(notification)}
            >
              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <View style={styles.notificationIcon}>
                    <Ionicons 
                      name={getNotificationIcon(notification.type) as any} 
                      size={20} 
                      color={getNotificationColor(notification.type)} 
                    />
                  </View>
                  
                  <View style={styles.notificationInfo}>
                    <Text style={[
                      styles.notificationTitle,
                      !notification.isRead && styles.unreadTitle
                    ]}>
                      {notification.title}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {formatDate(notification.createdAt)}
                    </Text>
                  </View>

                  <View style={styles.notificationActions}>
                    {!notification.isRead && (
                      <View style={styles.unreadDot} />
                    )}
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleDeleteNotification(notification._id)}
                    >
                      <Ionicons name="close" size={16} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.notificationMessage}>
                  {notification.message}
                </Text>

                {/* {notification.relatedIssueId && notification.relatedIssue && (
                  <View style={styles.issueInfo}>
                    <Text style={styles.issueTitle}>
                      {notification.relatedIssue.title}
                    </Text>
                    <View style={styles.issueMeta}>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(notification.relatedIssue.status) }
                      ]}>
                        <Text style={styles.statusText}>
                          {notification.relatedIssue.status.replace('_', ' ').toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.issueCategory}>
                        {notification.relatedIssue.category}
                      </Text>
                    </View>
                  </View>
                )} */}

                {notification.relatedIssueId && (
                  <View style={styles.actionButton}>
                    <Ionicons name="arrow-forward" size={14} color="#16a34a" />
                    <Text style={styles.actionText}>View Issue</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyStateText}>No notifications</Text>
            <Text style={styles.emptyStateSubtext}>
              {filter === 'unread' 
                ? "You're all caught up! No unread notifications."
                : "No notifications match the selected filter."
              }
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Quick Actions */}
      {unreadCount > 0 && (
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleMarkAllAsRead}>
            <Ionicons name="checkmark-done" size={20} color="#16a34a" />
            <Text style={styles.quickActionText}>Mark All Read</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  filterContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activeFilterTab: {
    backgroundColor: '#16a34a',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeFilterTabText: {
    color: 'white',
  },
  notificationsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  notificationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
  },
  notificationContent: {
    padding: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  unreadTitle: {
    color: '#1f2937',
    fontWeight: 'bold',
  },
  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16a34a',
    marginRight: 8,
  },
  deleteButton: {
    padding: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  issueInfo: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  issueTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  issueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  issueCategory: {
    fontSize: 12,
    color: '#6b7280',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  actionText: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  quickActions: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  quickActionText: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
})
