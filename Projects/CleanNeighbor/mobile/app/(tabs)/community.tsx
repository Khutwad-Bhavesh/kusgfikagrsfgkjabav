import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function CommunityPage() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
      </View>
      <ScrollView style={styles.content}>
        
        {/* CleanPoints & Badges */}
        <View style={styles.section}>
          <LinearGradient colors={["#3b82f6", "#1d4ed8"]} style={styles.pointsCard}>
            <View style={styles.pointsHeader}>
              <Text style={styles.pointsTitle}>Your CleanPoints</Text>
              <Ionicons name="star" size={24} color="#fbbf24" />
            </View>
            <Text style={styles.pointsValue}>1,240 ⭐</Text>
            <View style={styles.badgesContainer}>
              <View style={styles.badge}>
                <Text style={styles.badgeIcon}>🌱</Text>
                <Text style={styles.badgeText}>Green Starter</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeIcon}>♻️</Text>
                <Text style={styles.badgeText}>Recycling Pro</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Leaderboard */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Neighborhood Leaderboard</Text>
          <View style={styles.leaderboardCard}>
            {[
              { block: "Block B", points: "1,240", rank: 1 },
              { block: "Block A", points: "1,180", rank: 2 },
              { block: "Block D", points: "950", rank: 3 },
            ].map((item, index) => (
              <View key={index} style={styles.leaderboardRow}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{item.rank}</Text>
                </View>
                <Text style={styles.blockText}>{item.block}</Text>
                <Text style={styles.blockPoints}>{item.points} ⭐</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Active Challenges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Challenges</Text>
          <View style={styles.challengeCard}>
            <View style={styles.challengeHeader}>
              <Ionicons name="trophy-outline" size={24} color="#f59e0b" />
              <Text style={styles.challengeTitle}>Zero Litter Week</Text>
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: "72%" }]} />
              </View>
              <Text style={styles.progressText}>72%</Text>
            </View>
            <Text style={styles.challengeDesc}>124 residents participating</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { padding: 20, backgroundColor: "#3b82f6" },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "white" },
  content: { padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#1f2937", marginBottom: 12 },
  pointsCard: { padding: 20, borderRadius: 16 },
  pointsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pointsTitle: { fontSize: 16, color: "rgba(255, 255, 255, 0.9)" },
  pointsValue: { fontSize: 36, fontWeight: "bold", color: "white", marginVertical: 8 },
  badgesContainer: { flexDirection: "row", marginTop: 12 },
  badge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8 },
  badgeIcon: { fontSize: 16, marginRight: 4 },
  badgeText: { color: "white", fontSize: 14, fontWeight: "500" },
  leaderboardCard: { backgroundColor: "white", borderRadius: 12, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  leaderboardRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  rankBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#f1f5f9", justifyContent: "center", alignItems: "center", marginRight: 12 },
  rankText: { fontWeight: "bold", color: "#475569" },
  blockText: { flex: 1, fontSize: 16, color: "#1f2937", fontWeight: "500" },
  blockPoints: { fontSize: 16, fontWeight: "bold", color: "#f59e0b" },
  challengeCard: { backgroundColor: "white", borderRadius: 12, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  challengeHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  challengeTitle: { fontSize: 18, fontWeight: "bold", color: "#1f2937", marginLeft: 8 },
  progressContainer: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  progressBar: { flex: 1, height: 8, backgroundColor: "#f1f5f9", borderRadius: 4, overflow: "hidden", marginRight: 12 },
  progressFill: { height: "100%", backgroundColor: "#10b981", borderRadius: 4 },
  progressText: { fontSize: 14, fontWeight: "bold", color: "#10b981" },
  challengeDesc: { fontSize: 14, color: "#6b7280" },
});
