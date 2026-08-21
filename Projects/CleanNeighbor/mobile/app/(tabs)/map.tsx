import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Dimensions
} from 'react-native'
import { useDatabaseQuery, useDatabaseDoc, useDatabaseMutation } from "../hooks/useDatabase";
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { WebView } from 'react-native-webview'
import * as Location from 'expo-location'
import { SafeAreaView } from 'react-native-safe-area-context'


const { width, height } = Dimensions.get('window')

// Jharkhand coordinates for initial map region
const JHARKHAND_CENTER = {
  lat: 23.6102,
  lng: 85.2799,
}

// Mock coordinates for issues without GPS data (distributed across Jharkhand)
const MOCK_COORDINATES = [
  { lat: 23.3441, lng: 85.3096 }, // Ranchi
  { lat: 22.8046, lng: 86.2029 }, // Jamshedpur  
  { lat: 23.7957, lng: 86.4304 }, // Dhanbad
  { lat: 23.6693, lng: 86.1511 }, // Bokaro
  { lat: 24.4869, lng: 86.6998 }, // Deoghar
  { lat: 23.9441, lng: 85.6700 }, // Hazaribagh
  { lat: 24.1854, lng: 86.3005 }, // Giridih
  { lat: 23.6315, lng: 85.9709 }, // Ramgarh
]

export default function MapViewPage() {
  const router = useRouter()
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [userLocation, setUserLocation] = useState<any>(null)
  const [mapHtml, setMapHtml] = useState<string>('')

  const issues = useDatabaseQuery('wasteReports', { limit: 100 })

  useEffect(() => {
    getCurrentLocation()
  }, [])

  useEffect(() => {
    if (issues) {
      generateMapHtml()
    }
  }, [issues, filterStatus, userLocation])

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        })
        setUserLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        })
      }
    } catch (error) {
      console.error('Error getting location:', error)
    }
  }

  const filteredIssues = issues?.filter(issue => {
    if (filterStatus === 'all') return true
    return issue.status === filterStatus
  }) || []

  // Add coordinates to issues that don't have them
  const issuesWithCoordinates = filteredIssues.map((issue, index) => {
    if (issue.location.coordinates) {
      return {
        ...issue,
        coordinates: {
          lat: issue.location.coordinates.lat,
          lng: issue.location.coordinates.lng,
        }
      }
    } else {
      // Use mock coordinates based on city/district or cycle through mock locations
      const mockCoord = MOCK_COORDINATES[index % MOCK_COORDINATES.length]
      return {
        ...issue,
        coordinates: {
          lat: mockCoord.lat + (Math.random() - 0.5) * 0.1, // Add small random offset
          lng: mockCoord.lng + (Math.random() - 0.5) * 0.1,
        }
      }
    }
  })

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

  const generateMapHtml = () => {
    const markers = issuesWithCoordinates.map((issue, index) => {
      const color = getStatusColor(issue.status)
      const title = issue.title.replace(/'/g, "\\'")
      const description = issue.description.slice(0, 100).replace(/'/g, "\\'")
      
      return `
        L.circleMarker([${issue.coordinates.lat}, ${issue.coordinates.lng}], {
          radius: 8,
          fillColor: '${color}',
          color: 'white',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        }).addTo(map)
        .bindPopup(\`
          <div style="min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 14px;">${title}</h3>
            <p style="margin: 0 0 4px 0; color: #16a34a; font-size: 12px; font-weight: 600;">${issue.category}</p>
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px;">Status: ${issue.status.replace('_', ' ').toUpperCase()}</p>
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">${description}...</p>
            <p style="margin: 0; color: #9ca3af; font-size: 11px;">${new Date(issue.createdAt).toLocaleDateString()}</p>
            <button onclick="window.ReactNativeWebView.postMessage('${issue._id}')" 
                    style="background: #16a34a; color: white; border: none; padding: 4px 8px; 
                           border-radius: 4px; font-size: 12px; cursor: pointer; margin-top: 8px;">
              View Details →
            </button>
          </div>
        \`)
      `
    }).join('')

    // const userMarker = userLocation ? `
    //   L.circleMarker([${userLocation.lat}, ${userLocation.lng}], {
    //     radius: 10,
    //     fillColor: '#3b82f6',
    //     color: 'white',
    //     weight: 3,
    //     opacity: 1,
    //     fillOpacity: 1
    //   }).addTo(map)
    //   .bindPopup('<div style="text-align: center; font-weight: bold; color: #3b82f6;">📍 Your Location</div>')
    // ` : ''

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <title>Jharkhand Issues Map</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <style>
            body { margin: 0; padding: 0; }
            #map { height: 100vh; width: 100%; }
            .leaflet-popup-content-wrapper {
              border-radius: 8px;
            }
            .leaflet-popup-content {
              margin: 12px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui;
            }
          </style>
      </head>
      <body>
          <div id="map"></div>
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <script>
              // Initialize map centered on Jharkhand
              const map = L.map('map').setView([${JHARKHAND_CENTER.lat}, ${JHARKHAND_CENTER.lng}], 8);

              // Add OpenStreetMap tiles (FREE!)
              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                  attribution: '© OpenStreetMap contributors',
                  maxZoom: 18,
              }).addTo(map);

              // Add issue markers
              ${markers}

              // Add user location marker
              
              // Handle popup clicks
              window.addEventListener('message', function(event) {
                  if (event.data && typeof event.data === 'string') {
                      window.ReactNativeWebView.postMessage(event.data);
                  }
              });
          </script>
      </body>
      </html>
    `

    setMapHtml(html)
  }

  const handleWebViewMessage = (event: any) => {
    const issueId = event.nativeEvent.data
    if (issueId) {
      router.push(`/(issues)/${issueId}`)
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short'
    })
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Issues Map</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/create')}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Status Filter */}
      <View style={styles.controlsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          <View style={styles.filterChips}>
            {[
              { key: 'all', label: 'All', count: issues?.length || 0 },
              { key: 'pending', label: 'Pending', count: issues?.filter(i => i.status === 'pending').length || 0 },
              { key: 'in_progress', label: 'Active', count: issues?.filter(i => i.status === 'in_progress').length || 0 },
              { key: 'resolved', label: 'Resolved', count: issues?.filter(i => i.status === 'resolved').length || 0 }
            ].map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterChip,
                  filterStatus === filter.key && styles.activeFilterChip
                ]}
                onPress={() => setFilterStatus(filter.key)}
              >
                <View style={[
                  styles.statusDot, 
                  { backgroundColor: getStatusColor(filter.key === 'all' ? 'pending' : filter.key) }
                ]} />
                <Text style={[
                  styles.filterChipText,
                  filterStatus === filter.key && styles.activeFilterChipText
                ]}>
                  {filter.label} ({filter.count})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* FREE Map using WebView + OpenStreetMap */}
      <View style={styles.mapContainer}>
        {mapHtml ? (
          <WebView
            source={{ html: mapHtml }}
            style={styles.map}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
          />
        ) : (
          <View style={styles.loadingContainer}>
            <Ionicons name="map" size={48} color="#16a34a" />
            <Text style={styles.loadingText}>Loading Map...</Text>
          </View>
        )}
      </View>
  
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
  controlsContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterContainer: {
    marginTop: 8,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activeFilterChip: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeFilterChipText: {
    color: 'white',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    fontWeight: '600',
  },
  legend: {
    backgroundColor: 'white',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  legendLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  statsFooter: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
})
