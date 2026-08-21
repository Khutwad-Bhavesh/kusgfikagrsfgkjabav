import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function SchedulePage() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Collection Schedule</Text>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.dayTitle}>Today</Text>
          <View style={styles.scheduleCard}>
            <View style={styles.scheduleIcon}>
              <Ionicons name="leaf-outline" size={24} color="#16a34a" />
            </View>
            <View style={styles.scheduleDetails}>
              <Text style={styles.wasteType}>Wet Waste</Text>
              <Text style={styles.timing}>6:00 PM – 7:00 PM</Text>
            </View>
            <TouchableOpacity style={styles.reminderButton}>
              <Ionicons name="notifications-outline" size={20} color="#16a34a" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.dayTitle}>Tomorrow</Text>
          <View style={styles.scheduleCard}>
            <View style={styles.scheduleIcon}>
              <Ionicons name="trash-outline" size={24} color="#3b82f6" />
            </View>
            <View style={styles.scheduleDetails}>
              <Text style={styles.wasteType}>Dry Waste</Text>
              <Text style={styles.timing}>6:00 PM – 7:00 PM</Text>
            </View>
            <TouchableOpacity style={styles.reminderButton}>
              <Ionicons name="notifications-outline" size={20} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.dayTitle}>Friday</Text>
          <View style={styles.scheduleCard}>
            <View style={styles.scheduleIcon}>
              <Ionicons name="sync-outline" size={24} color="#8b5cf6" />
            </View>
            <View style={styles.scheduleDetails}>
              <Text style={styles.wasteType}>Recyclables</Text>
              <Text style={styles.timing}>6:00 PM – 7:00 PM</Text>
            </View>
            <TouchableOpacity style={styles.reminderButton}>
              <Ionicons name="notifications-outline" size={20} color="#8b5cf6" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { padding: 20, backgroundColor: "#16a34a" },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "white" },
  content: { padding: 16 },
  section: { marginBottom: 24 },
  dayTitle: { fontSize: 18, fontWeight: "bold", color: "#1f2937", marginBottom: 12 },
  scheduleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  scheduleIcon: {
    padding: 12,
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    marginRight: 16,
  },
  scheduleDetails: { flex: 1 },
  wasteType: { fontSize: 16, fontWeight: "bold", color: "#1f2937" },
  timing: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  reminderButton: { padding: 8 },
});
