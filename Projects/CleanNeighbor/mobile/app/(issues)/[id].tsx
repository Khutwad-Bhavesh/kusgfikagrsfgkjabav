import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Linking,
  Share,
  Dimensions,
  Image,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useDatabaseQuery, useDatabaseDoc, useDatabaseMutation } from "../../hooks/useDatabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";


// Simple Video Placeholder component since expo-video has build issues
const VideoPlaceholder = ({ uri, style, onPress }: { 
  uri: string; 
  style: any; 
  onPress: () => void; 
}) => {
  return (
    <TouchableOpacity onPress={onPress} style={[style, styles.videoPlaceholder]}>
      <View style={styles.videoPlaceholderContent}>
        <Ionicons name="play-circle" size={48} color="white" />
        <Text style={styles.videoPlaceholderText}>Video</Text>
        <Text style={styles.videoPlaceholderSubtext}>Tap to open</Text>
      </View>
    </TouchableOpacity>
  );
};

// External video viewer component
const ExternalVideoViewer = ({ uri, onClose }: { uri: string; onClose: () => void }) => {
  const handleOpenExternal = async () => {
    try {
      const supported = await Linking.canOpenURL(uri);
      if (supported) {
        await Linking.openURL(uri);
        onClose();
      } else {
        Alert.alert(
          "Cannot Open Video",
          "Unable to open video with external app. Please check if you have a video player installed."
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open video");
    }
  };

  return (
    <View style={styles.externalVideoContainer}>
      <View style={styles.externalVideoContent}>
        <Ionicons name="videocam" size={64} color="#6b7280" />
        <Text style={styles.externalVideoTitle}>Video Content</Text>
        <Text style={styles.externalVideoDescription}>
          Video playback requires an external app
        </Text>
        <TouchableOpacity style={styles.openExternalButton} onPress={handleOpenExternal}>
          <Ionicons name="open-outline" size={20} color="white" />
          <Text style={styles.openExternalText}>Open with External App</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function IssueDetailPage() {
  const { id } = useLocalSearchParams();
  const { user } = useUser();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Enhanced modal state for both images and videos
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video'>('image');

  const convexUser = useDatabaseQuery('users',
    user ? { clerkId: user.id } : "skip"
  );

  const issue = useDatabaseDoc('wasteReports', id ? (id as string) : "skip");

  const addComment = useDatabaseMutation('wasteReports');
  const toggleUpvote = useDatabaseMutation('wasteReports');

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleUpvote = async () => {
    if (!convexUser || !issue) return;
    try {
      await toggleUpvote({
        issueId: issue._id,
        userId: convexUser._id,
      });
    } catch (error) {
      console.error("Error toggling upvote:", error);
    }
  };

  const handleAddComment = async () => {
    if (!convexUser || !comment.trim() || !issue) return;

    setIsSubmittingComment(true);
    try {
      await addComment({
        issueId: issue._id,
        userId: convexUser._id,
        content: comment.trim(),
        isOfficial: convexUser.role !== "citizen",
      });
      setComment("");
      Alert.alert("Success", "Comment added successfully!");
    } catch (error) {
      console.error("Error adding comment:", error);
      Alert.alert("Error", "Failed to add comment. Please try again.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleShare = async () => {
    if (!issue) return;

    try {
      await Share.share({
        message: `Check out this civic issue: ${issue.title}\n\nLocation: ${issue.location.address}, ${issue.location.city}\n\nDescription: ${issue.description}`,
        title: "Civic Issue Report",
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  // Enhanced media modal handlers
  const handleImagePress = (index: number) => {
    setSelectedMediaIndex(index);
    setSelectedMediaType('image');
    setIsModalVisible(true);
  };

  const handleVideoPress = (index: number) => {
    setSelectedMediaIndex(index);
    setSelectedMediaType('video');
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#f59e0b";
      case "acknowledged":
        return "#3b82f6";
      case "in_progress":
        return "#8b5cf6";
      case "resolved":
        return "#10b981";
      case "rejected":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return "time-outline";
      case "acknowledged":
        return "checkmark-circle-outline";
      case "in_progress":
        return "construct-outline";
      case "resolved":
        return "checkmark-done-circle";
      case "rejected":
        return "close-circle-outline";
      default:
        return "help-circle-outline";
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!issue) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Issue Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading issue details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasUpvoted = convexUser && issue.upvotedBy.includes(convexUser._id);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Issue Details</Text>
        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Issue Header */}
        <View style={styles.issueHeader}>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(issue.status) },
              ]}
            >
              <Ionicons
                name={getStatusIcon(issue.status) as any}
                size={16}
                color="white"
              />
              <Text style={styles.statusText}>
                {issue.status.replace("_", " ").toUpperCase()}
              </Text>
            </View>
            <Text style={styles.issueId}>#{issue._id.slice(-6)}</Text>
          </View>

          <Text style={styles.issueTitle}>{issue.title}</Text>

          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color="#6b7280" />
              <Text style={styles.metaText}>
                Reported on {formatDate(issue.createdAt)}
              </Text>
            </View>
            {issue.reporter && (
              <View style={styles.metaItem}>
                <Ionicons name="person-outline" size={16} color="#6b7280" />
                <Text style={styles.metaText}>
                  By {issue.reporter.firstName} {issue.reporter.lastName}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Combined Media Section - Images and Videos */}
        {((issue.imageUrls && issue.imageUrls.length > 0) || 
          (issue.videoUrls && issue.videoUrls.length > 0)) && (
          <View style={styles.mediaSection}>
            <Text style={styles.sectionTitleInverted}>Media</Text>
            
            {/* Images */}
            {issue.imageUrls && issue.imageUrls.length > 0 && (
              <View style={styles.mediaSubsection}>
                <Text style={styles.mediaSubtitle}>Photos ({issue.imageUrls.length})</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.mediaContainer}
                >
                  {issue.imageUrls.map((url, index) => (
                    <TouchableOpacity
                      key={`image-${index}`}
                      onPress={() => handleImagePress(index)}
                      style={styles.mediaWrapper}
                    >
                      <Image source={{ uri: url }} style={styles.mediaItem} />
                      <View style={styles.mediaTypeIndicator}>
                        <Ionicons name="image" size={14} color="white" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Videos */}
            {issue.videoUrls && issue.videoUrls.length > 0 && (
              <View style={styles.mediaSubsection}>
                <Text style={styles.mediaSubtitle}>Videos ({issue.videoUrls.length})</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.mediaContainer}
                >
                  {issue.videoUrls.map((url, index) => (
                    <View
                      key={`video-${index}`}
                      style={styles.mediaWrapper}
                    >
                      <VideoPlaceholder
                        uri={url}
                        style={styles.mediaItem}
                        onPress={() => handleVideoPress(index)}
                      />
                      <View style={[styles.mediaTypeIndicator, styles.videoTypeIndicator]}>
                        <Ionicons name="videocam" size={14} color="white" />
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Engagement Section */}
        <View style={styles.section}>
          <View style={styles.engagementContainer}>
            <TouchableOpacity
              onPress={handleUpvote}
              style={[styles.upvoteButton, hasUpvoted && styles.upvotedButton]}
            >
              <Ionicons
                name={
                  hasUpvoted ? "arrow-up-circle" : "arrow-up-circle-outline"
                }
                size={20}
                color={hasUpvoted ? "white" : "#16a34a"}
              />
              <Text
                style={[styles.upvoteText, hasUpvoted && styles.upvotedText]}
              >
                {issue.upvotes} Upvotes
              </Text>
            </TouchableOpacity>
            <View style={styles.viewsContainer}>
              <Ionicons name="eye-outline" size={16} color="#6b7280" />
              <Text style={styles.viewsText}>{issue.viewCount} views</Text>
            </View>
          </View>
        </View>

        {/* Rest of your existing sections... */}
        {/* Issue Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{issue.description}</Text>
          <View style={styles.tagsContainer}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{issue.category}</Text>
            </View>
            <View
              style={[
                styles.tag,
                {
                  backgroundColor:
                    issue.priority === "urgent"
                      ? "#fef2f2"
                      : issue.priority === "high"
                        ? "#fff7ed"
                        : "#f0fdf4",
                },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  {
                    color:
                      issue.priority === "urgent"
                        ? "#dc2626"
                        : issue.priority === "high"
                          ? "#ea580c"
                          : "#16a34a",
                  },
                ]}
              >
                {issue.priority.toUpperCase()} PRIORITY
              </Text>
            </View>
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.locationCard}>
            <Ionicons name="location" size={24} color="#16a34a" />
            <View style={styles.locationInfo}>
              <Text style={styles.locationAddress}>
                {issue.location.address}
              </Text>
              <Text style={styles.locationDetails}>
                {issue.location.city}, {issue.location.district}
                {issue.location.pincode && ` - ${issue.location.pincode}`}
              </Text>
              {issue.location.landmark && (
                <Text style={styles.landmark}>
                  Near: {issue.location.landmark}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Status Updates */}
        {issue.statusUpdates && issue.statusUpdates.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Progress Updates</Text>
            {issue.statusUpdates.map((update, index) => (
              <View key={index} style={styles.statusUpdate}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(update.newStatus) },
                  ]}
                />
                <View style={styles.statusUpdateContent}>
                  <Text style={styles.statusUpdateTitle}>
                    {update.newStatus.replace("_", " ").toUpperCase()}
                  </Text>
                  {update.note && (
                    <Text style={styles.statusUpdateNote}>{update.note}</Text>
                  )}
                  <Text style={styles.statusUpdateDate}>
                    {formatDate(update.createdAt)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Resolution Details */}
        {issue.status === "resolved" && issue.resolutionNote && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resolution</Text>
            <View style={styles.resolutionCard}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <View style={styles.resolutionContent}>
                <Text style={styles.resolutionText}>
                  {issue.resolutionNote}
                </Text>
                {issue.resolvedAt && (
                  <Text style={styles.resolutionDate}>
                    Resolved on {formatDate(issue.resolvedAt)}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Comments Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Comments ({issue.comments?.length || 0})
          </Text>
          <View style={styles.addCommentContainer}>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              placeholder="Add a public comment..."
              multiline
            />
            <TouchableOpacity
              style={[
                styles.submitCommentButton,
                !comment.trim() && styles.disabledButton,
              ]}
              onPress={handleAddComment}
              disabled={!comment.trim() || isSubmittingComment}
            >
              {isSubmittingComment ? (
                <Text style={styles.submitCommentText}>Posting...</Text>
              ) : (
                <Ionicons name="send" size={18} color="white" />
              )}
            </TouchableOpacity>
          </View>

          {issue.comments && issue.comments.length > 0 ? (
            issue.comments.map((c, index) => (
              <View key={index} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <View style={styles.commentUser}>
                    <Ionicons
                      name={
                        c.isOfficial
                          ? "shield-checkmark"
                          : "person-circle-outline"
                      }
                      size={20}
                      color={c.isOfficial ? "#16a34a" : "#6b7280"}
                    />
                    <Text
                      style={[
                        styles.commentUsername,
                        c.isOfficial && styles.officialUser,
                      ]}
                    >
                      {c.user
                        ? `${c.user.firstName} ${c.user.lastName}`
                        : "Anonymous"}
                      {c.isOfficial && " (Official)"}
                    </Text>
                  </View>
                  <Text style={styles.commentDate}>
                    {formatDate(c._creationTime)}
                  </Text>
                </View>
                <Text style={styles.commentContent}>{c.content}</Text>
              </View>
            ))
          ) : (
            <View style={styles.noComments}>
              <Text style={styles.noCommentsText}>
                Be the first to comment.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Enhanced Full Screen Media Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={handleCloseModal}
          >
            <Ionicons name="close" size={32} color="white" />
          </TouchableOpacity>
          
          {selectedMediaType === 'image' && issue.imageUrls && issue.imageUrls.length > 0 && (
            <>
              <Image
                source={{ uri: issue.imageUrls[selectedMediaIndex] }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
              {issue.imageUrls.length > 1 && (
                <View style={styles.mediaCounter}>
                  <Text style={styles.mediaCounterText}>
                    {selectedMediaIndex + 1} / {issue.imageUrls.length} Photos
                  </Text>
                </View>
              )}
            </>
          )}
          
          {selectedMediaType === 'video' && issue.videoUrls && issue.videoUrls.length > 0 && (
            <ExternalVideoViewer
              uri={issue.videoUrls[selectedMediaIndex]}
              onClose={handleCloseModal}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  // ... existing styles remain the same ...
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    backgroundColor: "#16a34a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "white" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 16, color: "#6b7280" },
  issueHeader: {
    backgroundColor: "white",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  statusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
    letterSpacing: 0.5,
  },
  issueId: { fontSize: 14, color: "#6b7280", fontWeight: "600" },
  issueTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
    lineHeight: 30,
  },
  metaInfo: { gap: 8 },
  metaItem: { flexDirection: "row", alignItems: "center" },
  metaText: { fontSize: 14, color: "#6b7280", marginLeft: 6 },
  section: { backgroundColor: "white", padding: 20, marginBottom: 8 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#16a34a",
    paddingLeft: 8,
  },
  sectionTitleInverted: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
    paddingHorizontal: 20,
  },

  // New Media Styles
  mediaSection: {
    backgroundColor: "white",
    paddingVertical: 20,
    marginBottom: 8,
  },
  mediaSubsection: {
    marginBottom: 20,
  },
  mediaSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4b5563",
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  mediaContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  mediaWrapper: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  mediaItem: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
  },
  mediaTypeIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    padding: 4,
  },
  videoTypeIndicator: {
    backgroundColor: "rgba(239, 68, 68, 0.8)", // Red for videos
  },
  videoPlayOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  videoLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  // Enhanced Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    padding: 4,
  },
  fullScreenImage: { 
    width: width, 
    height: height * 0.7 
  },
  // Video placeholder styles (since expo-video has build issues)
  videoPlaceholder: {
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  videoPlaceholderContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlaceholderText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  videoPlaceholderSubtext: {
    color: '#9ca3af',
    fontSize: 10,
    marginTop: 2,
  },
  
  // External video viewer styles
  externalVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  externalVideoContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 300,
    margin: 20,
  },
  externalVideoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 12,
    marginBottom: 8,
  },
  externalVideoDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  openExternalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  openExternalText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
  },
  mediaCounter: {
    position: "absolute",
    bottom: 40,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  mediaCounterText: { 
    color: "white", 
    fontSize: 14, 
    fontWeight: "600" 
  },

  // ... rest of your existing styles ...
  description: {
    fontSize: 16,
    color: "#4b5563",
    lineHeight: 24,
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  tag: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  locationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  locationInfo: { marginLeft: 12, flex: 1 },
  locationAddress: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  locationDetails: { fontSize: 14, color: "#6b7280" },
  landmark: {
    fontSize: 14,
    color: "#16a34a",
    marginTop: 4,
    fontStyle: "italic",
  },
  engagementContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  upvoteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    gap: 6,
  },
  upvotedButton: { backgroundColor: "#16a34a" },
  upvoteText: { fontSize: 14, fontWeight: "600", color: "#15803d" },
  upvotedText: { color: "white" },
  viewsContainer: { flexDirection: "row", alignItems: "center", gap: 6 },
  viewsText: { fontSize: 14, color: "#6b7280" },
  statusUpdate: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    paddingLeft: 4,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  statusUpdateContent: {
    flex: 1,
    borderLeftWidth: 2,
    borderLeftColor: "#e5e7eb",
    paddingLeft: 12,
  },
  statusUpdateTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 2,
  },
  statusUpdateNote: { fontSize: 14, color: "#4b5563", marginBottom: 4 },
  statusUpdateDate: { fontSize: 12, color: "#9ca3af" },
  resolutionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  resolutionContent: { marginLeft: 12, flex: 1 },
  resolutionText: {
    fontSize: 16,
    color: "#14532d",
    marginBottom: 8,
    fontWeight: "500",
    lineHeight: 22,
  },
  resolutionDate: { fontSize: 12, color: "#166534" },
  addCommentContainer: { flexDirection: "row", gap: 8, alignItems: "center" },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#f9fafb",
  },
  submitCommentButton: {
    backgroundColor: "#16a34a",
    padding: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: { backgroundColor: "#9ca3af" },
  submitCommentText: { color: "white", fontSize: 14, fontWeight: "600" },
  commentCard: {
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  commentHeader: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 2,
    marginBottom: 8,
  },
  commentUser: { flexDirection: "row", alignItems: "center" },
  commentUsername: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#374151",
    marginLeft: 6,
  },
  officialUser: { color: "#16a34a" },
  commentDate: { fontSize: 12, color: "#9ca3af", marginLeft: 4 },
  commentContent: { fontSize: 14, color: "#4b5563", lineHeight: 20 },
  noComments: { alignItems: "center", paddingVertical: 20 },
  noCommentsText: { fontSize: 14, color: "#9ca3af", fontStyle: "italic" },
});