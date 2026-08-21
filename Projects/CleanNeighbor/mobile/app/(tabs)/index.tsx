"use client";

import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useDatabaseQuery, useDatabaseDoc, useDatabaseMutation } from "../../hooks/useDatabase";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Platform,
  StatusBar,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";


const { width: screenWidth } = Dimensions.get("window");
const isTablet = screenWidth >= 768;

export default function HomePage() {
  const { user, isLoaded } = useUser();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Get user profile and stats
  const convexUser = useDatabaseQuery('users',
    user ? { clerkId: user.id } : "skip"
  );

  const recentIssues = useDatabaseQuery('wasteReports', { limit: 10 });

  const allIssues = useDatabaseQuery('wasteReports', {});
  const issueStats = allIssues ? {
    total: allIssues.length,
    inProgress: allIssues.filter((i: any) => i.status !== 'Resolved' && i.status !== 'Rejected' && i.status !== 'resolved').length,
    resolved: allIssues.filter((i: any) => i.status === 'Resolved' || i.status === 'resolved').length
  } : undefined;

  const createOrUpdateUser = useDatabaseMutation('users');

  const isDataLoading =
    convexUser === undefined ||
    recentIssues === undefined ||
    issueStats === undefined;

  useEffect(() => {
    const syncUser = async () => {
      if (isLoaded && user && !convexUser) {
        try {
          const provider =
            user.externalAccounts && user.externalAccounts.length > 0
              ? user.externalAccounts[0].provider
              : "email";

          await createOrUpdateUser({
            clerkId: user.id,
            email: user.emailAddresses[0]?.emailAddress || "",
            firstName: user.firstName || undefined,
            lastName: user.lastName || undefined,
            imageUrl: user.imageUrl || undefined,
            provider: provider,
          });
        } catch (error) {
          console.error("Error syncing user to Convex:", error);
        }
      }
    };

    syncUser();
  }, [isLoaded, user, convexUser, createOrUpdateUser]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Refetch data
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (!isLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner}>
            <Ionicons name="refresh-outline" size={32} color="#16a34a" />
          </View>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }


  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No user found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Submitted":
        return "#f59e0b";
      case "Assigned":
      case "Under Review":
        return "#3b82f6";
      case "In Progress":
      case "Awaiting Verification":
        return "#8b5cf6";
      case "Resolved":
        return "#10b981";
      case "Reopened":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Submitted":
        return "time-outline";
      case "Assigned":
      case "Under Review":
        return "checkmark-circle-outline";
      case "In Progress":
      case "Awaiting Verification":
        return "construct-outline";
      case "Resolved":
        return "checkmark-done-circle";
      case "Reopened":
        return "close-circle-outline";
      default:
        return "help-circle-outline";
    }
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return "0";
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "k";
    }
    return num.toString();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#16a34a" />

      {/* Enhanced Header with Gradient */}
      <LinearGradient
        colors={["#16a34a", "#15803d", "#166534"]}
        style={styles.headerGradient}
      >
        <SafeAreaView>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.logoContainer}>
                  <LinearGradient
                    colors={["#ffffff", "#f0fdf4"]}
                    style={styles.logoGradient}
                  >
                    <Image
                      source={require("../../assets/logo.png")}
                      style={styles.logoImage}
                    />
                  </LinearGradient>
                </View>
                <View>
                  <Text style={styles.appName}>Shuchithvam</Text>
                  <Text style={styles.tagline}>Community Waste Management</Text>
                </View>
              </View>
              <View style={styles.headerRight}>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => router.push("/(notifications)")}
                  activeOpacity={0.7}
                >
                  <View style={styles.headerButtonBg}>
                    <Ionicons
                      name="notifications-outline"
                      size={20}
                      color="white"
                    />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => router.push("/(profile)")}
                  activeOpacity={0.7}
                >
                  <View style={styles.headerButtonBg}>
                    <Ionicons name="person-outline" size={20} color="white" />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#16a34a"]}
            tintColor="#16a34a"
          />
        }
      >
        {/* Enhanced Welcome Section */}
        <View style={styles.welcomeSection}>
          <LinearGradient
            colors={["#ffffff", "#f8fafc"]}
            style={styles.welcomeCard}
          >
            <View style={styles.welcomeHeader}>
              <View>
                <Text style={styles.welcomeTitle}>
                  Hello,{user.firstName || "Citizen"}!👋
                </Text>
                <Text style={styles.welcomeSubtitle}>
                  Manage waste and keep your neighborhood clean
                </Text>
              </View>
              {/* <View style={styles.welcomeIcon}>
                <Ionicons name="home" size={32} color="#16a34a" />
              </View> */}
            </View>

            <TouchableOpacity
              style={styles.reportButton}
              onPress={() => router.push("/(tabs)/create")}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#16a34a", "#15803d"]}
                style={styles.reportButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="add" size={24} color="white" />
                <Text style={styles.reportButtonText}>Report New Issue</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {[
              {
                icon: "warning",
                text: "Report Waste",
                colors: ["#ef4444", "#dc2626"],
                route: "/(tabs)/create",
              },
              {
                icon: "search",
                text: "Track Reports",
                colors: ["#3b82f6", "#1d4ed8"],
                route: "/(tabs)/track",
              },
              {
                icon: "map",
                text: "View Map",
                colors: ["#10b981", "#059669"],
                route: "/(tabs)/map",
              },
              {
                icon: "newspaper",
                text: "Latest News",
                colors: ["#8b5cf6", "#7c3aed"],
                route: "/(content)/news",
              },
            ].map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionCard}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={action.colors as any}
                  style={styles.actionCardGradient}
                >
                  <Ionicons name={action.icon as any} size={28} color="white" />
                  <Text style={styles.actionText}>{action.text}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Enhanced User Stats */}
        {convexUser === undefined ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Activity</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsScrollContainer}
            >
              {[1, 2, 3].map((_, index) => (
                <View key={index} style={styles.statCard}>
                  <View style={[styles.statCardGradient, styles.loadingCard]}>
                    <View style={styles.loadingIcon} />
                    <View style={styles.loadingNumber} />
                    <View style={styles.loadingLabel} />
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : (
          convexUser?.stats && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Activity</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.statsScrollContainer}
              >
                <View style={styles.statCard}>
                  <LinearGradient
                    colors={["#3b82f6", "#1d4ed8"]}
                    style={styles.statCardGradient}
                  >
                    <Ionicons name="document-text" size={24} color="white" />
                    <Text style={styles.statNumber}>
                      {formatNumber(convexUser.stats.totalIssues)}
                    </Text>
                    <Text style={styles.statLabel}>Total Reports</Text>
                  </LinearGradient>
                </View>

                <View style={styles.statCard}>
                  <LinearGradient
                    colors={["#f59e0b", "#d97706"]}
                    style={styles.statCardGradient}
                  >
                    <Ionicons name="time" size={24} color="white" />
                    <Text style={styles.statNumber}>
                      {formatNumber(convexUser.stats.pendingIssues)}
                    </Text>
                    <Text style={styles.statLabel}>Pending</Text>
                  </LinearGradient>
                </View>

                <View style={styles.statCard}>
                  <LinearGradient
                    colors={["#10b981", "#059669"]}
                    style={styles.statCardGradient}
                  >
                    <Ionicons name="checkmark-done" size={24} color="white" />
                    <Text style={styles.statNumber}>
                      {formatNumber(convexUser.stats.resolvedIssues)}
                    </Text>
                    <Text style={styles.statLabel}>Resolved</Text>
                  </LinearGradient>
                </View>
              </ScrollView>
            </View>
          )
        )}

        {/* Enhanced Community Stats */}
        {issueStats === undefined ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Community Impact</Text>
            <View style={styles.communityStatsGrid}>
              {[1, 2, 3].map((_, index) => (
                <View
                  key={index}
                  style={[styles.communityStatCard, styles.loadingCard]}
                >
                  <View
                    style={[
                      styles.statIcon,
                      styles.loadingIcon,
                      { backgroundColor: "#f3f4f6" },
                    ]}
                  />
                  <View style={styles.loadingNumber} />
                  <View style={styles.loadingLabel} />
                </View>
              ))}
            </View>
          </View>
        ) : (
          issueStats && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Community Impact</Text>
              <View style={styles.communityStatsGrid}>
                <View style={styles.communityStatCard}>
                  <View
                    style={[styles.statIcon, { backgroundColor: "#ddd6fe" }]}
                  >
                    <Ionicons name="people" size={24} color="#8b5cf6" />
                  </View>
                  <Text style={styles.communityStatNumber}>
                    {formatNumber(issueStats.total)}
                  </Text>
                  <Text style={styles.communityStatLabel}>Total Issues</Text>
                </View>

                <View style={styles.communityStatCard}>
                  <View
                    style={[styles.statIcon, { backgroundColor: "#dbeafe" }]}
                  >
                    <Ionicons name="construct" size={24} color="#3b82f6" />
                  </View>
                  <Text style={styles.communityStatNumber}>
                    {formatNumber(issueStats.inProgress)}
                  </Text>
                  <Text style={styles.communityStatLabel}>In Progress</Text>
                </View>

                <View style={styles.communityStatCard}>
                  <View
                    style={[styles.statIcon, { backgroundColor: "#dcfce7" }]}
                  >
                    <Ionicons
                      name="checkmark-done-circle"
                      size={24}
                      color="#10b981"
                    />
                  </View>
                  <Text style={styles.communityStatNumber}>
                    {formatNumber(issueStats.resolved)}
                  </Text>
                  <Text style={styles.communityStatLabel}>Resolved</Text>
                </View>
              </View>
            </View>
          )
        )}

        {/* Enhanced Quick Actions */}

        {/* Enhanced Recent Issues */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Reports</Text>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/track")}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="arrow-forward" size={16} color="#16a34a" />
            </TouchableOpacity>
          </View>

          {recentIssues === undefined ? (
            <View>
              {[1, 2, 3].map((_, index) => (
                <View
                  key={index}
                  style={[styles.issueCard, styles.loadingCard]}
                >
                  <View style={styles.issueCardContent}>
                    <View style={styles.issueHeader}>
                      <View style={styles.issueStatus}>
                        <View style={[styles.statusDot, styles.loadingDot]} />
                        <View style={styles.loadingStatusText} />
                      </View>
                      <View style={[styles.categoryTag, styles.loadingTag]} />
                    </View>

                    <View style={styles.loadingTitle} />
                    <View style={styles.loadingDescription} />
                    <View style={styles.loadingDescriptionShort} />

                    <View style={styles.issueFooter}>
                      <View style={styles.locationContainer}>
                        <View style={styles.loadingLocation} />
                      </View>
                      <View style={styles.loadingEngagement} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : recentIssues && recentIssues.length > 0 ? (
            recentIssues.slice(0, 5).map((issue) => (
              <TouchableOpacity
                key={issue._id}
                style={styles.issueCard}
                onPress={() => router.push(`/(issues)/${issue._id}`)}
                activeOpacity={0.9}
              >
                <View style={styles.issueCardContent}>
                  <View style={styles.issueHeader}>
                    <View style={styles.issueStatus}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: getStatusColor(issue.status) },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(issue.status) },
                        ]}
                      >
                        {issue.status?.replace("_", " ")?.toUpperCase() || ''}
                      </Text>
                    </View>
                    <View style={styles.categoryTag}>
                      <Text style={styles.categoryTagText}>
                        {issue.category}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.issueTitle}>{issue.title}</Text>
                  <Text style={styles.issueDescription} numberOfLines={2}>
                    {issue.description}
                  </Text>

                  <View style={styles.issueFooter}>
                    <View style={styles.locationContainer}>
                      <Ionicons name="location" size={14} color="#6b7280" />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {issue.location_address || 'Unknown location'}
                      </Text>
                    </View>
                    
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <Ionicons name="document-outline" size={64} color="#d1d5db" />
              </View>
              <Text style={styles.emptyStateText}>No issues reported yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Be the first to report a civic issue in your area
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => router.push("/(tabs)/create")}
              >
                <Text style={styles.emptyStateButtonText}>
                  Report First Issue
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

  
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingSpinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 18,
    color: "#64748b",
    fontWeight: "500",
  },
  headerGradient: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logoContainer: {
    marginRight: 16,
    top: 15,
  },
  logoGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  logoText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#16a34a",
  },
  appName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 2,
    top: 15,
  },
  tagline: {
    fontSize: 15,
    color: "#bbf7d0",
    fontWeight: "500",
    top: 15,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    top: 15,
  },
  logoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
    borderRadius: 24,
  },
  headerButton: {
    marginLeft: 12,
  },
  headerButtonBg: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    padding: 10,
    borderRadius: 12,
    backdropFilter: "blur(10px)",
  },
  content: {
    flex: 1,
  },
  welcomeSection: {
    margin: 16,
    marginBottom: 12,
  },
  welcomeCard: {
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  welcomeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  welcomeIcon: {
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
    flex: 1,
    lineHeight: 32,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "#6b7280",
    lineHeight: 24,
    flex: 1,
  },
  reportButton: {
    borderRadius: 16,
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  reportButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  reportButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginHorizontal: 12,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 28,
    
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  statsScrollContainer: {
    paddingRight: 16,
  },
  statCard: {
    marginRight: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  statCardGradient: {
    width: isTablet ? 160 : 140,
    padding: isTablet ? 24 : 20,
    borderRadius: 16,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
    textAlign: "center",
  },
  communityStatsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  communityStatCard: {
    backgroundColor: "white",
    width: isTablet ? "30%" : "31%",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  communityStatNumber: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  communityStatLabel: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    fontWeight: "500",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    width: isTablet ? "23%" : "48%",
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  actionCardGradient: {
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    minHeight: 100,
    justifyContent: "center",
  },
  actionText: {
    fontSize: 14,
    color: "white",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewAllText: {
    fontSize: 14,
    color: "#16a34a",
    fontWeight: "600",
    marginRight: 4,
  },
  issueCard: {
    backgroundColor: "white",
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  issueCardContent: {
    padding: 20,
  },
  issueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  issueStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  categoryTag: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryTagText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  issueTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
    lineHeight: 24,
  },
  issueDescription: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginBottom: 16,
  },
  issueFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  locationText: {
    fontSize: 12,
    color: "#6b7280",
    marginLeft: 6,
    fontWeight: "500",
  },
  engagementContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  engagementText: {
    fontSize: 12,
    color: "#ef4444",
    marginLeft: 4,
    fontWeight: "600",
  },
  emptyState: {
    backgroundColor: "white",
    padding: 40,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    color: "#6b7280",
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyStateButton: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  bottomPadding: {
    height: 100,
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
  },
  bottomNavGradient: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
  },
  bottomNavContent: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    position: "relative",
  },
  activeNavItem: {
    backgroundColor: "rgba(22, 163, 74, 0.1)",
    borderRadius: 16,
    paddingVertical: 12,
  },
  activeNavIndicator: {
    position: "absolute",
    top: -2,
    width: 32,
    height: 3,
    backgroundColor: "#16a34a",
    borderRadius: 2,
  },
  navText: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 4,
    fontWeight: "500",
  },
  activeNavText: {
    color: "#16a34a",
    fontWeight: "600",
  },
  loadingCard: {
    backgroundColor: "#f8fafc",
  },
  loadingIcon: {
    width: 24,
    height: 24,
    backgroundColor: "#e2e8f0",
    borderRadius: 12,
    marginBottom: 8,
  },
  loadingNumber: {
    width: 60,
    height: 28,
    backgroundColor: "#e2e8f0",
    borderRadius: 6,
    marginBottom: 4,
  },
  loadingLabel: {
    width: 80,
    height: 12,
    backgroundColor: "#e2e8f0",
    borderRadius: 6,
  },
  loadingDot: {
    backgroundColor: "#e2e8f0",
  },
  loadingStatusText: {
    width: 60,
    height: 12,
    backgroundColor: "#e2e8f0",
    borderRadius: 6,
  },
  loadingTag: {
    backgroundColor: "#e2e8f0",
    width: 80,
    height: 24,
  },
  loadingTitle: {
    width: "80%",
    height: 18,
    backgroundColor: "#e2e8f0",
    borderRadius: 6,
    marginBottom: 8,
  },
  loadingDescription: {
    width: "100%",
    height: 14,
    backgroundColor: "#e2e8f0",
    borderRadius: 6,
    marginBottom: 4,
  },
  loadingDescriptionShort: {
    width: "60%",
    height: 14,
    backgroundColor: "#e2e8f0",
    borderRadius: 6,
    marginBottom: 16,
  },
  loadingLocation: {
    width: 120,
    height: 12,
    backgroundColor: "#e2e8f0",
    borderRadius: 6,
  },
  loadingEngagement: {
    width: 40,
    height: 20,
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
  },
});
