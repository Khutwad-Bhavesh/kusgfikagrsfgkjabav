"use client"

import React, { useState, useRef, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Linking,
  ActivityIndicator,
  Image,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"

const { width } = Dimensions.get("window")
const CARD_WIDTH = width * 0.8
const CARD_SPACING = 16

interface NewsArticle {
  id: string
  title: string
  content: string
  category: string
  publishedAt: number
  link: string
  icon: string
  imageUrl: string | null
}

export default function NewsCarousel() {
  const router = useRouter()
  const flatListRef = useRef<FlatList>(null)

  const [newsData, setNewsData] = useState<NewsArticle[]>([])
  const [infiniteData, setInfiniteData] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  const initialIndex = React.useMemo(() => newsData.length, [newsData.length])

  const fetchNews = async () => {
    const API_KEY = "f9c5d7c1c44d488fb8e592f26ef10ea8"
    const query = "Jharkhand"
    const url = `https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&language=en&apiKey=${API_KEY}`

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(url)
      const data = await response.json()

      if (data.status === "ok") {
        const formattedData = data.articles
          // UPDATED: Now includes articles even if they don't have an image
          .filter((article: any) => article.title && article.description)
          .slice(0, 10)
          .map((article: any, index: number) => ({
            id: `${article.url}-${index}`,
            title: article.title,
            content: article.description,
            category: article.source.name,
            publishedAt: new Date(article.publishedAt).getTime(),
            link: article.url,
            imageUrl: article.urlToImage,
            icon: getIconForCategory(article.title),
          }))
        setNewsData(formattedData)
        setInfiniteData([...formattedData, ...formattedData, ...formattedData])
        setCurrentIndex(formattedData.length)
      } else {
        throw new Error(data.message || "Failed to fetch news.")
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNews()
  }, [])

  useEffect(() => {
    if (infiniteData.length === 0) return

    const interval = setInterval(() => {
      if (flatListRef.current) {
        let nextIndex = currentIndex + 1
        if (nextIndex >= newsData.length * 2) {
          flatListRef.current.scrollToIndex({ index: newsData.length, animated: false })
          nextIndex = newsData.length + 1
        }
        flatListRef.current.scrollToIndex({ index: nextIndex, animated: true })
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [currentIndex, infiniteData, newsData.length])

  const getIconForCategory = (title: string): string => {
    const lowerTitle = title.toLowerCase()
    if (lowerTitle.includes("water")) return "water"
    if (lowerTitle.includes("road")) return "car-sport"
    if (lowerTitle.includes("health")) return "medical"
    if (lowerTitle.includes("school")) return "school"
    if (lowerTitle.includes("forest")) return "leaf"
    if (lowerTitle.includes("tech")) return "phone-portrait"
    return "newspaper"
  }

  const onMomentumScrollEnd = () => {
    const currentScrollIndex = currentIndex
    if (currentScrollIndex >= newsData.length * 2) {
      const newIndex = currentScrollIndex - newsData.length
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: false })
    } else if (currentScrollIndex < newsData.length) {
      const newIndex = currentScrollIndex + newsData.length
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: false })
    }
  }

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index)
    }
  }).current

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
  }

  const renderItem = ({ item }: { item: NewsArticle }) => (
    <View style={styles.card}>
      {/* --- CONDITIONAL RENDERING FOR IMAGE OR PLACEHOLDER --- */}
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name={item.icon as any} size={60} color="#9ca3af" />
          <Text style={styles.placeholderCategoryText}>{item.category}</Text>
        </View>
      )}
      <View style={styles.textContainer}>
        <View>
          <Text style={styles.categoryText} numberOfLines={1}>{item.category}</Text>
          <Text style={styles.titleText} numberOfLines={3}>{item.title}</Text>
          <Text style={styles.dateText}>{formatDate(item.publishedAt)}</Text>
        </View>
        <TouchableOpacity style={styles.readMoreButton} onPress={() => Linking.openURL(item.link)}>
          <Text style={styles.readMoreButtonText}>Read More</Text>
          <Ionicons name="arrow-forward" size={14} color="#16a3a" />
        </TouchableOpacity>
      </View>
    </View>
  )
  
  const getItemLayout = (_: any, index: number) => ({
    length: CARD_WIDTH + CARD_SPACING,
    offset: (CARD_WIDTH + CARD_SPACING) * index,
    index,
  })

  if (loading) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#16a3a" />
        <Text style={styles.infoText}>Fetching latest news...</Text>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <Ionicons name="cloud-offline-outline" size={48} color="#ef4444" />
        <Text style={styles.infoText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchNews}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>News & Updates</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.carouselContainer}>
        <FlatList
          ref={flatListRef}
          data={infiniteData}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + CARD_SPACING}
          snapToAlignment="start"
          decelerationRate="fast"
          contentContainerStyle={styles.flatListContent}
          onViewableItemsChanged={onViewableItemsChanged}
          onMomentumScrollEnd={onMomentumScrollEnd}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={getItemLayout}
          initialScrollIndex={initialIndex}
        />
      </View>

      {newsData.length > 0 && (
        <View style={styles.paginationContainer}>
          {newsData.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                { backgroundColor: currentIndex % newsData.length === index ? "#16a3a" : "#d1d5db" },
              ]}
            />
          ))}
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f9fafb",
  },
  infoText: {
    marginTop: 16,
    fontSize: 16,
    color: "#4b5563",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#16a3a",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  carouselContainer: {
    flex: 1,
    paddingVertical: 24,
  },
  flatListContent: {
    paddingHorizontal: (width - CARD_WIDTH) / 2,
  },
  card: {
    width: CARD_WIDTH,
    height: '100%',
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginHorizontal: CARD_SPACING / 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '50%',
    backgroundColor: '#e5e7eb',
  },
  // --- NEW STYLES FOR PLACEHOLDER ---
  imagePlaceholder: {
    width: '100%',
    height: '50%',
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  placeholderCategoryText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  textContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  categoryText: {
    color: "#15803d",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  titleText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    lineHeight: 24,
  },
  dateText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  readMoreButton: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#f0fdf4",
    gap: 6,
  },
  readMoreButtonText: {
    color: "#16a3a",
    fontSize: 14,
    fontWeight: "600",
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 20,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
})