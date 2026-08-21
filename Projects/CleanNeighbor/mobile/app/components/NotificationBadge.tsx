import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNotificationContext } from './NotificationProvider';

interface NotificationBadgeProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  backgroundColor?: string;
  showZero?: boolean;
}

export function NotificationBadge({ 
  size = 'medium', 
  color = 'white', 
  backgroundColor = '#ef4444',
  showZero = false 
}: NotificationBadgeProps) {
  const { unreadCount } = useNotificationContext();

  if (unreadCount === 0 && !showZero) {
    return null;
  }

  const sizeStyles = {
    small: { minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4 },
    medium: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6 },
    large: { minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 8 },
  };

  const textSizes = {
    small: 10,
    medium: 12,
    large: 14,
  };

  return (
    <View style={[
      styles.badge,
      sizeStyles[size],
      { backgroundColor }
    ]}>
      <Text style={[
        styles.badgeText,
        { color, fontSize: textSizes[size] }
      ]}>
        {unreadCount > 99 ? '99+' : unreadCount}
      </Text>
    </View>
  );
}

// Standalone notification indicator for use in headers or navigation
export function NotificationIndicator({ 
  size = 'medium',
  style,
}: { 
  size?: 'small' | 'medium' | 'large';
  style?: any;
}) {
  const { unreadCount } = useNotificationContext();

  if (unreadCount === 0) {
    return null;
  }

  const indicatorSizes = {
    small: 8,
    medium: 10,
    large: 12,
  };

  return (
    <View style={[
      styles.indicator,
      {
        width: indicatorSizes[size],
        height: indicatorSizes[size],
        borderRadius: indicatorSizes[size] / 2,
      },
      style
    ]} />
  );
}

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 10,
  },
  badgeText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  indicator: {
    backgroundColor: '#ef4444',
    position: 'absolute',
    top: 2,
    right: 2,
    zIndex: 10,
  },
});
