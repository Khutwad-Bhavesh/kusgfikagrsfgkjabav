import React, { useState } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Alert,
  Switch,
  Image
} from 'react-native'
import { useUser, useAuth } from '@clerk/clerk-expo'
import { useDatabaseQuery, useDatabaseDoc, useDatabaseMutation } from "../../hooks/useDatabase";
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'


export default function ProfilePage() {
  const { user } = useUser()
  const { signOut } = useAuth()
  const router = useRouter()
  
  const convexUser = useDatabaseQuery('users', 
    user ? { clerkId: user.id } : "skip"
  )
  
  const updateUserProfile = useDatabaseMutation('users')
  
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    city: '',
    district: ''
  })
  
  const [settings, setSettings] = useState({
    notifications: true,
    emailUpdates: true,
    smsAlerts: false,
    locationTracking: true
  })

  React.useEffect(() => {
    if (convexUser) {
      setFormData({
        phone: convexUser.phone || '',
        address: convexUser.address || '',
        city: convexUser.city || '',
        district: convexUser.district || ''
      })
    }
  }, [convexUser])

  const handleSaveProfile = async () => {
    if (!user || !convexUser) return
    
    try {
      await updateUserProfile({
        clerkId: user.id,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        district: formData.district.trim() || undefined,
      })
      setIsEditing(false)
      Alert.alert('Success', 'Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      Alert.alert('Error', 'Failed to update profile. Please try again.')
    }
  }

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut()
              router.replace('/(auth)/sign-in')
            } catch (error) {
              console.error('Error signing out:', error)
              Alert.alert('Error', 'Failed to sign out. Please try again.')
            }
          }
        }
      ]
    )
  }

  if (!user || !convexUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
          <Ionicons name={isEditing ? "close" : "create"} size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {user.imageUrl ? (
              <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color="#16a34a" />
              </View>
            )}
            <TouchableOpacity style={styles.avatarEditButton}>
              <Ionicons name="camera" size={16} color="white" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.userName}>
            {user.firstName} {user.lastName}
          </Text>
          <Text style={styles.userEmail}>{user.emailAddresses[0]?.emailAddress}</Text>
          
          <View style={styles.roleContainer}>
            <Ionicons name="shield-checkmark" size={16} color="#16a34a" />
            <Text style={styles.roleText}>{convexUser.role.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            {isEditing && (
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                <Ionicons name="checkmark" size={16} color="white" />
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData({...formData, phone: text})}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.value}>{formData.phone || 'Not provided'}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            {isEditing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.address}
                onChangeText={(text) => setFormData({...formData, address: text})}
                placeholder="Enter your address"
                multiline
                numberOfLines={2}
              />
            ) : (
              <Text style={styles.value}>{formData.address || 'Not provided'}</Text>
            )}
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>City</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={formData.city}
                  onChangeText={(text) => setFormData({...formData, city: text})}
                  placeholder="City"
                />
              ) : (
                <Text style={styles.value}>{formData.city || 'Not provided'}</Text>
              )}
            </View>
            
            <View style={styles.halfInput}>
              <Text style={styles.label}>District</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={formData.district}
                  onChangeText={(text) => setFormData({...formData, district: text})}
                  placeholder="District"
                />
              ) : (
                <Text style={styles.value}>{formData.district || 'Not provided'}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="document-text" size={24} color="#16a34a" />
              <Text style={styles.statNumber}>{convexUser.stats?.totalIssues || 0}</Text>
              <Text style={styles.statLabel}>Issues Reported</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time" size={24} color="#f59e0b" />
              <Text style={styles.statNumber}>{convexUser.stats?.pendingIssues || 0}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.statNumber}>{convexUser.stats?.resolvedIssues || 0}</Text>
              <Text style={styles.statLabel}>Resolved</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications" size={20} color="#6b7280" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Push Notifications</Text>
                <Text style={styles.settingDescription}>Receive updates about your issues</Text>
              </View>
            </View>
            <Switch
              value={settings.notifications}
              onValueChange={(value) => setSettings({...settings, notifications: value})}
              trackColor={{ false: '#f3f4f6', true: '#bbf7d0' }}
              thumbColor={settings.notifications ? '#16a34a' : '#9ca3af'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="mail" size={20} color="#6b7280" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Email Updates</Text>
                <Text style={styles.settingDescription}>Get important updates via email</Text>
              </View>
            </View>
            <Switch
              value={settings.emailUpdates}
              onValueChange={(value) => setSettings({...settings, emailUpdates: value})}
              trackColor={{ false: '#f3f4f6', true: '#bbf7d0' }}
              thumbColor={settings.emailUpdates ? '#16a34a' : '#9ca3af'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(tabs)/track')}>
            <View style={styles.actionInfo}>
              <Ionicons name="list" size={20} color="#16a34a" />
              <Text style={styles.actionTitle}>My Issues</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionInfo}>
              <Ionicons name="help-circle" size={20} color="#16a34a" />
              <Text style={styles.actionTitle}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out" size={20} color="#ef4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Jharkhand Civic Portal v1.0{'\n'}
            सेवा में, समाधान में
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
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
  content: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: 'white',
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#16a34a',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#16a34a',
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16a34a',
    marginLeft: 4,
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  value: {
    fontSize: 16,
    color: '#4b5563',
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  settingDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  actionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  signOutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
})
