import React, { useState } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  RefreshControl
} from 'react-native'
import { useUser } from '@clerk/clerk-expo'
import { useDatabaseQuery, useDatabaseDoc, useDatabaseMutation } from "../../hooks/useDatabase";
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'


const FILTER_OPTIONS = [
  { key: 'all', label: 'All Issues' },
  { key: 'pending', label: 'Pending' },
  { key: 'acknowledged', label: 'Acknowledged' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'rejected', label: 'Rejected' }
]

const CATEGORY_FILTERS = [
  'All',
  'Infrastructure',
  'Roads',
  'Water Supply',
  'Sanitation',
  'Electricity',
  'Public Transport',
  'Parks & Recreation',
  'Waste Management',
  'Street Lighting',
  'Drainage',
  'Other'
]

export default function TrackIssuesPage() {
  const { user } = useUser()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [showMyIssues, setShowMyIssues] = useState(false)

  const convexUser = useDatabaseQuery('users', 
    user ? { clerkId: user.id } : "skip"
  )

  // Get issues based on filters
  const allIssues = useDatabaseQuery('wasteReports', {
    status: statusFilter === 'all' ? undefined : statusFilter,
    category: categoryFilter === 'All' ? undefined : categoryFilter,
    limit: 50
  })

  const myIssues = useDatabaseQuery('wasteReports', 
    convexUser ? { userId: convexUser._id } : "skip"
  )

  const toggleUpvote = useDatabaseMutation('wasteReports')

  const onRefresh = async () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1000)
  }

  const handleUpvote = async (issueId: string) => {
    if (!convexUser) return
    try {
      await toggleUpvote({
        issueId: issueId as any,
        userId: convexUser._id
      })
    } catch (error) {
      console.error('Error toggling upvote:', error)
    }
  }

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time-outline'
      case 'acknowledged': return 'checkmark-circle-outline'
      case 'in_progress': return 'construct-outline'
      case 'resolved': return 'checkmark-done-circle'
      case 'rejected': return 'close-circle-outline'
      default: return 'help-circle-outline'
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const displayIssues = showMyIssues ? myIssues : allIssues
  
  const filteredIssues = displayIssues?.filter(issue => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return issue.title.toLowerCase().includes(query) ||
             issue.description.toLowerCase().includes(query) ||
             issue.location.address.toLowerCase().includes(query) ||
             issue.location.city.toLowerCase().includes(query)
    }
    return true
  }) || []

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Issues</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/create')}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View style={styles.filtersSection}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search issues..."
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>

        {/* Toggle between All Issues and My Issues */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, !showMyIssues && styles.activeToggle]}
            onPress={() => setShowMyIssues(false)}
          >
            <Text style={[styles.toggleText, !showMyIssues && styles.activeToggleText]}>
              All Issues
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, showMyIssues && styles.activeToggle]}
            onPress={() => setShowMyIssues(true)}
          >
            <Text style={[styles.toggleText, showMyIssues && styles.activeToggleText]}>
              My Issues
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterContainer}>
            {FILTER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterChip,
                  statusFilter === option.key && styles.activeFilter
                ]}
                onPress={() => setStatusFilter(option.key)}
              >
                <Text style={[
                  styles.filterText,
                  statusFilter === option.key && styles.activeFilterText
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterContainer}>
            {CATEGORY_FILTERS.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.filterChip,
                  categoryFilter === category && styles.activeFilter
                ]}
                onPress={() => setCategoryFilter(category)}
              >
                <Text style={[
                  styles.filterText,
                  categoryFilter === category && styles.activeFilterText
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Issues List */}
      <ScrollView 
        style={styles.issuesList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredIssues.length > 0 ? (
          filteredIssues.map((issue) => (
            <TouchableOpacity 
              key={issue._id} 
              style={styles.issueCard}
              onPress={() => router.push(`/(issues)/${issue._id}`)}
            >
              {/* Issue Header */}
              <View style={styles.issueHeader}>
                <View style={styles.issueStatus}>
                  <Ionicons 
                    name={getStatusIcon(issue.status) as any} 
                    size={16} 
                    color={getStatusColor(issue.status)} 
                  />
                  <Text style={[styles.statusText, { color: getStatusColor(issue.status) }]}>
                    {issue.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.issueDate}>{formatDate(issue.createdAt)}</Text>
              </View>

              {/* Issue Content */}
              <Text style={styles.issueTitle}>{issue.title}</Text>
              <Text style={styles.issueDescription} numberOfLines={2}>
                {issue.description}
              </Text>

              {/* Issue Meta */}
              <View style={styles.issueMeta}>
                <View style={styles.categoryContainer}>
                  <Text style={styles.categoryTag}>{issue.category}</Text>
                  <Text style={[styles.priorityTag, { 
                    backgroundColor: issue.priority === 'urgent' ? '#fef2f2' : 
                                    issue.priority === 'high' ? '#fff7ed' : 
                                    issue.priority === 'medium' ? '#fef3c7' : '#f0fdf4',
                    color: issue.priority === 'urgent' ? '#dc2626' : 
                           issue.priority === 'high' ? '#ea580c' : 
                           issue.priority === 'medium' ? '#d97706' : '#16a34a'
                  }]}>
                    {issue.priority.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Issue Footer */}
              <View style={styles.issueFooter}>
                <View style={styles.locationContainer}>
                  <Ionicons name="location-outline" size={14} color="#6b7280" />
                  <Text style={styles.locationText}>
                    {issue.location.city}, {issue.location.district}
                  </Text>
                </View>
                
                {/* <View style={styles.engagementContainer}>
                  <TouchableOpacity 
                    style={styles.upvoteButton}
                    onPress={() => handleUpvote(issue._id)}
                  >
                    <Ionicons 
                      name={issue.upvotedBy?.includes(convexUser?._id!) ? "heart" : "heart-outline"} 
                      size={16} 
                      color={issue.upvotedBy?.includes(convexUser?._id!) ? "#ef4444" : "#6b7280"} 
                    />
                    <Text style={styles.upvoteText}>{issue.upvotes}</Text>
                  </TouchableOpacity>
                  
                 
                </View> */}
              </View>

              {/* Reporter Info */}
              {issue.reporter && !showMyIssues && (
                <View style={styles.reporterInfo}>
                  <Text style={styles.reporterText}>
                    Reported by {issue.reporter.firstName} {issue.reporter.lastName}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyStateTitle}>No Issues Found</Text>
            <Text style={styles.emptyStateText}>
              {showMyIssues ? 
                "You haven't reported any issues yet." :
                searchQuery ? 
                  "No issues match your search criteria." :
                  "No issues found with the selected filters."
              }
            </Text>
            {showMyIssues && (
              <TouchableOpacity 
                style={styles.reportButton}
                onPress={() => router.push('/(tabs)/create')}
              >
                <Ionicons name="add" size={20} color="white" />
                <Text style={styles.reportButtonText}>Report First Issue</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
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
  filtersSection: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1f2937',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeToggle: {
    backgroundColor: '#16a34a',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeToggleText: {
    color: 'white',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  filterChip: {
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  activeFilter: {
    backgroundColor: '#16a34a',
  },
  filterText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  activeFilterText: {
    color: 'white',
  },
  issuesList: {
    flex: 1,
    padding: 16,
  },
  issueCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  issueStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  issueDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  issueTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  issueDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  issueMeta: {
    marginBottom: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryTag: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  priorityTag: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  issueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  engagementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upvoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  upvoteText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  viewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewsText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  reporterInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  reporterText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  reportButton: {
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  reportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
})
