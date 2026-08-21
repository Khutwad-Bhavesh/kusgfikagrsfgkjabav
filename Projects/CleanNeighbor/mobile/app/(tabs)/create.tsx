import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useDatabaseQuery, useDatabaseDoc, useDatabaseMutation } from "../../hooks/useDatabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";


import { useNotificationContext } from "../components/NotificationProvider";
import { aiAnalysisService } from "../services/aiAnalysisService";

// Import from constants
import { CATEGORIES, getCategoryInfo } from "../constants/categories";

interface UploadedMedia {
  uri: string;
  type: "image" | "video";
  storageId?: string; // Keep as optional, not null
  uploading: boolean;
  aiAnalysis?: {
    isIssue: boolean;
    confidence: number;
    category?: string;
    categoryConfidence?: number;
    suggestions?: string;
  };
}
const jharkhandCities = [
  { name: "Ranchi", lat: 23.3441, lng: 85.3096 },
  { name: "Jamshedpur", lat: 22.8046, lng: 86.2029 },
  { name: "Dhanbad", lat: 23.7957, lng: 86.4304 },
  { name: "Bokaro Steel City", lat: 23.6693, lng: 86.1511 },
  { name: "Hazaribagh", lat: 23.9966, lng: 85.369 },
  { name: "Deoghar", lat: 24.4826, lng: 86.694 },
  { name: "Giridih", lat: 24.19, lng: 86.3006 },
  { name: "Chaibasa", lat: 22.5504, lng: 85.802 },
  { name: "Palamu (Daltonganj)", lat: 24.042, lng: 84.0795 },
  { name: "Dumka", lat: 24.2679, lng: 87.2481 },
];

const PRIORITY_LEVELS = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
];

interface UploadedMedia {
  uri: string;
  type: "image" | "video";
  storageId?: string;
  uploading: boolean;
  aiAnalysis?: {
    isIssue: boolean;
    confidence: number;
    category?: string;
    categoryConfidence?: number;
    suggestions?: string;
  };
}

// Add new component for Department Assignment Preview
const DepartmentAssignmentPreview = ({ category }: { category: string }) => {
  const categoryInfo = getCategoryInfo(category);

  if (!categoryInfo) return null;

  return (
    <View style={styles.departmentPreviewCard}>
      <View style={styles.departmentPreviewHeader}>
        <Ionicons name="business-outline" size={20} color="#16a34a" />
        <Text style={styles.departmentPreviewTitle}>Will be assigned to:</Text>
      </View>
      <View style={styles.departmentInfo}>
        <Text style={styles.departmentName}>{categoryInfo.department}</Text>
        <Text style={styles.departmentDescription}>
          {categoryInfo.description}
        </Text>
      </View>
      <View style={styles.autoAssignBadge}>
        <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
        <Text style={styles.autoAssignText}>Auto-assigned</Text>
      </View>
    </View>
  );
};

// Update the DropdownSelect component to show department info
const DropdownSelect = ({
  label,
  options,
  selectedValue,
  onValueChange,
  placeholder,
  aiSuggestion,
}: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedLabel =
    options.find((opt: any) => opt.value === selectedValue)?.label ||
    selectedValue;

  return (
    <>
      <View style={styles.inputGroup}>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
          {aiSuggestion && (
            <View style={styles.aiSuggestionBadge}>
              <Ionicons name="sparkles" size={12} color="#8b5cf6" />
              <Text style={styles.aiSuggestionText}>AI Suggested</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.dropdownButton,
            aiSuggestion && styles.dropdownButtonAISuggested,
          ]}
          onPress={() => setModalVisible(true)}
        >
          <Text
            style={[
              styles.dropdownButtonText,
              !selectedValue && styles.placeholderText,
            ]}
          >
            {selectedLabel || placeholder}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value || item}
              renderItem={({ item }) => {
                const categoryInfo = getCategoryInfo(item);
                return (
                  <TouchableOpacity
                    style={styles.categoryOptionItem}
                    onPress={() => {
                      onValueChange(item.value || item);
                      setModalVisible(false);
                    }}
                  >
                    <View style={styles.categoryOptionHeader}>
                      <Ionicons
                        name={categoryInfo?.icon || "help-circle-outline"}
                        size={20}
                        color="#16a34a"
                      />
                      <Text style={styles.categoryOptionText}>
                        {item.label || item}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

export default function EnhancedReportWastePage() {
  const { user } = useUser();
  const router = useRouter();
  const convexUser = useDatabaseQuery('users',
    user ? { clerkId: user.id } : "skip"
  );
  const createIssue = useDatabaseMutation('wasteReports');
  const generateUploadUrl = useDatabaseMutation('files');
  const { sendLocalNotificationForIssue } = useNotificationContext();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    address: "",
    city: "",
    district: "",
    pincode: "",
    landmark: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
  });

  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessModalVisible, setSuccessModalVisible] = useState(false);
  const [aiAnalysisInProgress, setAiAnalysisInProgress] = useState(false);
  const [serverConnected, setServerConnected] = useState<boolean | null>(null);

  useEffect(() => {
    checkAIServerConnection();
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Permission",
          "Location permission is needed to automatically fill your address. You can still manually enter the location."
        );
      } else {
        getCurrentLocation();
      }
    })();
  }, []);

  const checkAIServerConnection = async () => {
    try {
      const connectionTest = await aiAnalysisService.testConnection();
      setServerConnected(connectionTest.connected);

      if (!connectionTest.connected) {
        console.log("⚠️ AI server not connected:", connectionTest.error);
      }
    } catch (error) {
      console.log("⚠️ AI server check failed:", error);
      setServerConnected(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        lat: currentLocation.coords.latitude,
        lng: currentLocation.coords.longitude,
      });

      const reverseGeocode = await Location.reverseGeocodeAsync(
        currentLocation.coords
      );
      if (reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        const street = `${addr.streetNumber || ""} ${addr.street || ""}`.trim();
        const formattedAddress = [
          street,
          addr.district,
          addr.city,
          addr.region,
          addr.postalCode,
        ]
          .filter(Boolean)
          .join(", ");

        setFormData((prev) => ({
          ...prev,
          address: formattedAddress,
          city: addr.city || "",
          district: addr.region || "",
          pincode: addr.postalCode || "",
        }));
      }
    } catch (error) {
      console.error("Error getting current location:", error);
      Alert.alert(
        "Error",
        "Failed to get current location. Please enter it manually."
      );
    }
  };
  // 1. Fix the upload function to handle both images and videos
  const uploadMediaToConvex = async (
    mediaUri: string,
    mediaType: "image" | "video"
  ): Promise<string | undefined> => {
    // Change null to undefined
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(mediaUri);
      const blob = await response.blob();

      const contentType = mediaType === "video" ? "video/mp4" : blob.type;

      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": contentType },
        body: blob,
      });

      if (result.ok) {
        const { storageId } = await result.json();
        return storageId as string;
      }
      return undefined; // Return undefined instead of null
    } catch (error) {
      console.error(`Error uploading ${mediaType}:`, error);
      return undefined; // Return undefined instead of null
    }
  };

  const uploadImageToConvex = async (
    imageUri: string
  ): Promise<string | null> => {
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: blob,
      });

      if (result.ok) {
        const { storageId } = await result.json();
        return storageId as string;
      }
      return null;
    } catch (error) {
      console.error("Error uploading image:", error);
      return null;
    }
  };

  // Function to determine priority based on AI confidence
  const getPriorityFromConfidence = (
    confidence: number
  ): "low" | "medium" | "high" | "urgent" => {
    console.log("🎯 AI Confidence received:", confidence);

    if (confidence >= 0.1 && confidence <= 0.4) {
      console.log("🔽 Setting priority to LOW");
      return "low";
    } else if (confidence > 0.4 && confidence <= 0.5) {
      console.log("🔄 Setting priority to MEDIUM");
      return "medium";
    } else if (confidence > 0.5) {
      console.log("🔥 Setting priority to HIGH");
      return "high";
    }
    console.log("⚠️ Using default MEDIUM priority");
    return "medium"; // default fallback
  };

  const analyzeVideoWithAI = async (videoUri: string) => {
    if (!serverConnected) {
      console.log("⚠️ Skipping AI analysis - server not connected");
      return null;
    }

    try {
      // Use the updated service instead of hardcoded URL
      const result = await aiAnalysisService.analyzeVideo(videoUri, false);

      if (!result.success || !result.overall_result) {
        return null;
      }

      return {
        isIssue: result.overall_result.is_issue,
        confidence: result.overall_result.confidence,
        category:
          result.overall_result.predicted_class && result.overall_result.predicted_class !== "clean"
            ? aiAnalysisService.mapAICategoryToFormCategory(result.overall_result.predicted_class)
            : undefined,
        categoryConfidence: result.overall_result.confidence,
        suggestions: result.statistics
          ? `Video analysis shows ${Math.round(result.statistics.issue_percentage)}% of frames contain civic issues.`
          : "Video analyzed for civic issues.",
      };
    } catch (error) {
      console.error("❌ Video AI analysis error:", error);
      return null;
    }
  };
  const analyzeImageWithAI = async (imageUri: string) => {
    if (!serverConnected) {
      console.log("⚠️ Skipping AI analysis - server not connected");
      return null;
    }

    try {
      const result = await aiAnalysisService.analyzeImage(imageUri);

      if (!result.success) {
        return null;
      }

      return {
        isIssue: result.is_issue || false,
        confidence: result.confidence || 0,
        category:
          result.predicted_class && result.predicted_class !== "clean"
            ? aiAnalysisService.mapAICategoryToFormCategory(result.predicted_class)
            : undefined,
        categoryConfidence: result.confidence || 0,
        suggestions: aiAnalysisService.generateSuggestions(result),
      };
    } catch (error) {
      console.error("❌ AI analysis error:", error);
      return null;
    }
  };
  const handleMediaSelection = async (
    result: ImagePicker.ImagePickerResult
  ) => {
    if (!result.canceled && result.assets[0]) {
      if (media.length >= 3) {
        Alert.alert(
          "Limit Reached",
          "You can upload a maximum of 3 media files."
        );
        return;
      }

      const asset = result.assets[0];
      const mediaType = asset.type === "video" ? "video" : "image";

      const newMedia: UploadedMedia = {
        uri: asset.uri,
        type: mediaType,
        uploading: true,
      };

      setMedia((prev) => [...prev, newMedia]);
      setAiAnalysisInProgress(true);

      try {
        // Upload to Convex with proper media type handling
        const storageId = await uploadMediaToConvex(asset.uri, mediaType);

        // Analyze with AI based on media type
        const aiAnalysis =
          mediaType === "image"
            ? await analyzeImageWithAI(asset.uri)
            : await analyzeVideoWithAI(asset.uri);

        if (aiAnalysis) {
          console.log("🔍 AI Analysis Result:", {
            isIssue: aiAnalysis.isIssue,
            confidence: aiAnalysis.confidence,
            category: aiAnalysis.category,
            mediaType: mediaType,
          });

          if (aiAnalysis.suggestions === "Content blocked by safety filters.") {
            setMedia((prev) => prev.filter((item) => item.uri !== newMedia.uri));
            setTimeout(() => {
              if (Platform.OS === 'web') {
                window.alert("Upload Blocked: This image was flagged by safety filters for inappropriate content.");
              } else {
                Alert.alert("Upload Blocked", "This image was flagged by safety filters for inappropriate content.");
              }
            }, 100);
            return;
          }

          if (aiAnalysis.isIssue && aiAnalysis.category) {
            const newPriority = getPriorityFromConfidence(
              aiAnalysis.confidence
            );

            setFormData((prev) => ({
              ...prev,
              category: aiAnalysis.category || prev.category,
              priority: newPriority,
            }));
          } else if (!aiAnalysis.isIssue && aiAnalysis.confidence > 0.6) {
            if (Platform.OS === 'web') {
              const keep = window.confirm(`No Civic Issue Detected\n\nOur AI analysis (${Math.round(aiAnalysis.confidence * 100)}% confidence) suggests this ${mediaType} may not show a valid civic issue (e.g. false claim).\n\nClick OK to keep it anyway, or Cancel to remove it.`);
              if (!keep) {
                setMedia((prev) => prev.filter((item) => item.uri !== newMedia.uri));
                return;
              }
            } else {
              Alert.alert(
                "No Civic Issue Detected",
                `Our AI analysis (${Math.round(aiAnalysis.confidence * 100)}% confidence) suggests this ${mediaType} may not show a valid civic issue (e.g. false claim). Please upload clearer media that shows the problem, or remove this ${mediaType}.`,
                [
                  {
                    text: `Remove ${mediaType}`,
                    onPress: () => {
                      setMedia((prev) =>
                        prev.filter((item) => item.uri !== newMedia.uri)
                      );
                    },
                  },
                  {
                    text: `Keep ${mediaType}`,
                    style: "cancel",
                  },
                ]
              );
            }
          }
        }

        // Fix: Properly type the updated media item
        setMedia((prev) =>
          prev.map((item): UploadedMedia => {
            if (item.uri === newMedia.uri) {
              return {
                ...item,
                storageId: storageId || undefined, // Ensure undefined, not null
                uploading: false,
                aiAnalysis: aiAnalysis || undefined, // Ensure undefined, not null
              };
            }
            return item;
          })
        );
      } catch (error) {
        console.error(`Error processing ${mediaType}:`, error);

        // Fix: Properly type the error case update
        setMedia((prev) =>
          prev.map((item): UploadedMedia => {
            if (item.uri === newMedia.uri) {
              return {
                ...item,
                storageId: undefined, // Keep as undefined
                uploading: false,
              };
            }
            return item;
          })
        );
      } finally {
        setAiAnalysisInProgress(false);
      }
    }
  };

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All, // Allow both images and videos
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      videoMaxDuration: 30, // Limit videos to 30 seconds
    });
    handleMediaSelection(result);
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    handleMediaSelection(result);
  };

  const recordVideo = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.8,
      videoMaxDuration: 30, // Limit videos to 30 seconds
    });
    handleMediaSelection(result);
  };
  useEffect(() => {
    return () => {
      // Cleanup function to reset states when component unmounts
      setMedia([]);
      setAiAnalysisInProgress(false);
      setIsSubmitting(false);
    };
  }, []);
  const showMediaPicker = () => {
    if (Platform.OS === 'web') {
      // Alert.alert with buttons does not work on Web. 
      // ImagePicker on Web natively opens the file dialog.
      pickMedia();
    } else {
      Alert.alert("Add Media", "Choose an option", [
        { text: "Take Photo", onPress: takePhoto },
        { text: "Record Video", onPress: recordVideo },
        { text: "Gallery", onPress: pickMedia },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const removeMedia = (index: number) =>
    setMedia(media.filter((_, i) => i !== index));

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "",
      address: "",
      city: "",
      district: "",
      pincode: "",
      landmark: "",
      priority: "medium",
    });
    setMedia([]);
    setLocation(null);
    setAiAnalysisInProgress(false);
    setIsSubmitting(false);

    // Get fresh location data
    getCurrentLocation();
  };

  const handleSubmit = async () => {
    console.log("🚀 Submit button pressed");

    if (!convexUser) {
      console.error("❌ User not found");
      return Alert.alert("Error", "User not found. Please try again.");
    }

    console.log("✅ User found:", convexUser._id);

    if (
      !formData.title.trim() ||
      !formData.description.trim() ||
      !formData.category ||
      !formData.address.trim()
    ) {
      console.log("❌ Validation failed:", {
        title: !!formData.title.trim(),
        description: !!formData.description.trim(),
        category: !!formData.category,
        address: !!formData.address.trim(),
      });
      return Alert.alert("Error", "Please fill in all required fields.");
    }

    if (media.some((item) => item.uploading)) {
      console.log("❌ Media still uploading");
      return Alert.alert("Please wait", "Media files are still uploading.");
    }

    // Check if any media was flagged as not an issue with high confidence
    const nonIssueMedia = media.filter(
      (item) =>
        item.aiAnalysis &&
        !item.aiAnalysis.isIssue &&
        item.aiAnalysis.confidence > 0.8
    );

    if (nonIssueMedia.length > 0) {
      Alert.alert(
        "Invalid Report Detected",
        "Our AI has analyzed your media and determined it does not show a valid civic issue. Please upload clear photos showing the waste or civic problem."
      );
      return;
    }

    console.log("🔄 Starting submission process...");
    setIsSubmitting(true);

    try {
      const imageStorageIds = media
        .filter((item) => item.storageId && item.type === "image")
        .map((item) => item.storageId!);

      const videoStorageIds = media
        .filter((item) => item.storageId && item.type === "video")
        .map((item) => item.storageId!);

      console.log("📁 Media prepared:", {
        images: imageStorageIds.length,
        videos: videoStorageIds.length,
      });

      const issueData = {
        userId: convexUser._id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        location_lat: location?.lat || 0,
        location_lng: location?.lng || 0,
        location_address: formData.address.trim(),
        status: 'pending',
        image_url: imageStorageIds.length > 0 ? imageStorageIds[0] : null,
        ai_analysis: { priority: formData.priority }
      };

      console.log(
        "📝 Issue data prepared:",
        JSON.stringify(issueData, null, 2)
      );

      const result = await createIssue(issueData);
      console.log("✅ Issue created:", result);

      // Show success with department info
      const departmentName = result.assignedDepartment;

      try {
        const issueNumber =
          result.issueNumber || `SMD-${result.issueId?.slice(-6)?.toUpperCase() || 'UNKNOWN'}`;
        const notificationTitle = departmentName
          ? "✅ Issue Assigned to Department"
          : "✅ Issue Submitted Successfully";

        sendLocalNotificationForIssue(notificationTitle, issueNumber);
      } catch (notifError) {
        console.error("⚠️ Notification error (non-critical):", notifError);
      }

      // Reset form state immediately after successful submission
      resetForm();

      console.log("🎉 Showing success modal");
      setSuccessModalVisible(true);
    } catch (error) {
      console.error("💥 Error creating issue:", error);

      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }

      Alert.alert(
        "Error",
        `Failed to submit your report. Please try again.\n\nError: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      console.log("🏁 Submission process completed");
      setIsSubmitting(false);
    }
  };

  const hasAISuggestions = media.some((item) => item.aiAnalysis?.category);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Waste</Text>
        <View style={styles.aiIndicator}></View>
      </View>

      {aiAnalysisInProgress && (
        <View style={styles.aiAnalysisProgress}>
          <ActivityIndicator color="#8b5cf6" />
          <Text style={styles.aiAnalysisProgressText}>
            Analyzing image with AI...
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {/* Title Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Title</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                value={formData.title}
                onChangeText={(text) =>
                  setFormData({ ...formData, title: text })
                }
                placeholder="e.g., Overflowing bin on Main Street"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Media Section */}
          <View style={styles.section}>
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "flex-start",
                alignItems: "center",
              }}
            >
              <Text style={styles.sectionTitle}>Photos & Videos</Text>

              <View style={styles.aiSuggestionBadge}>
                <Ionicons name="sparkles" size={12} color="#8b5cf6" />
                <Text style={styles.aiSuggestionText}>AI Verification</Text>
              </View>
            </View>

            <View style={styles.mediaContainer}>
              {media.map((item, index) => (
                <View key={index} style={styles.mediaWrapper}>
                  {item.type === "image" ? (
                    <Image
                      source={{ uri: item.uri }}
                      style={styles.uploadedMedia}
                    />
                  ) : (
                    <View style={styles.videoThumbnailContainer}>
                      <Ionicons
                        name="play-circle"
                        size={48}
                        color="white"
                        style={styles.playIcon}
                      />
                      <Text style={styles.videoText}>Video</Text>
                    </View>
                  )}
                  {item.uploading && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  )}
                  {item.aiAnalysis && (
                    <View
                      style={[
                        styles.aiStatusOverlay,
                        item.aiAnalysis.isIssue
                          ? styles.aiStatusIssue
                          : styles.aiStatusNoIssue,
                      ]}
                    >
                      <Ionicons
                        name={
                          item.aiAnalysis.isIssue
                            ? "checkmark-circle"
                            : "alert-circle"
                        }
                        size={16}
                        color="white"
                      />
                      <Text style={styles.aiStatusText}>
                        {Math.round(item.aiAnalysis.confidence * 100)}%
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeMediaButton}
                    onPress={() => removeMedia(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
              {media.length < 3 && (
                <TouchableOpacity
                  style={styles.addMediaButton}
                  onPress={showMediaPicker}
                  disabled={aiAnalysisInProgress}
                >
                  <Ionicons name="camera" size={32} color="#6b7280" />
                  <Text style={styles.addMediaText}>Add Media</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Category and Priority Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Issue Details</Text>

            <DropdownSelect
              label="Category *"
              options={CATEGORIES}
              selectedValue={formData.category}
              onValueChange={(value: string) =>
                setFormData({ ...formData, category: value })
              }
              placeholder="Select a category"
              aiSuggestion={hasAISuggestions}
            />

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>Priority Level</Text>
                <View style={styles.aiSuggestionBadge}>
                  <Ionicons name="sparkles" size={12} color="#8b5cf6" />
                  <Text style={styles.aiSuggestionText}>AI Auto-Set</Text>
                </View>
              </View>
              <View style={[styles.dropdownButton, styles.disabledDropdown]}>
                <Text style={styles.dropdownButtonText}>
                  {PRIORITY_LEVELS.find((p) => p.value === formData.priority)
                    ?.label || formData.priority?.toUpperCase() || ""}
                </Text>
                <Ionicons name="lock-closed" size={20} color="#8b5cf6" />
              </View>
            </View>
          </View>

          {/* Description Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>Description *</Text>

              </View>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                ]}
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                placeholder="Provide details about the issue..."
                placeholderTextColor="#9ca3af"
                multiline
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Location Details</Text>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={getCurrentLocation}
              >
                <Ionicons name="navigate" size={16} color="#16a34a" />
                <Text style={styles.locationButtonText}>Refresh Location</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Address (Editable) *</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={formData.address}
                onChangeText={(text) =>
                  setFormData({ ...formData, address: text })
                }
                placeholder="Auto-filled address, please verify or edit"
                placeholderTextColor="#9ca3af"
                multiline
              />
              <Text style={styles.locationInfoText}>
                📍 Your precise coordinates will be submitted for accuracy.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (isSubmitting ||
                media.some((item) => item.uploading) ||
                aiAnalysisInProgress) &&
                styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={
              isSubmitting ||
              media.some((item) => item.uploading) ||
              aiAnalysisInProgress
            }
          >
            <View style={styles.submitButtonContent}>
              <Ionicons name="document-text" size={20} color="white" />
              <Text style={styles.submitButtonText}>
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        transparent={true}
        visible={isSuccessModalVisible}
        animationType="fade"
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <Ionicons name="checkmark-circle" size={64} color="#16a34a" />
            <Text style={styles.successModalTitle}>Report Submitted!</Text>

            <TouchableOpacity
              style={styles.successModalButton}
              onPress={() => {
                setSuccessModalVisible(false);
                // Navigate to track page - form is already reset
                router.push("/(tabs)/track");
              }}
            >
              <Text style={styles.successModalButtonText}>View My Reports</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.successModalSecondaryButton}
              onPress={() => {
                setSuccessModalVisible(false);
                // Form is already reset, just close modal to show clean form
              }}
            >
              <Text style={styles.successModalSecondaryButtonText}>
                Report another waste and help make Jharkhand better
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get("window");
const imageSize = (width - 64) / 3 - 8;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    backgroundColor: "#16a34a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "white" },
  aiIndicator: {
    borderRadius: 12,
    padding: 4,
  },

  // AI Analysis Progress
  aiAnalysisProgress: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  aiAnalysisProgressText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#8b5cf6",
    fontWeight: "600",
  },

  form: { flex: 1, padding: 16 },
  section: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  // Input styling
  inputGroup: { marginBottom: 16 },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  label: { fontSize: 14, fontWeight: "600", color: "#374151" },
  aiSuggestionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3e8ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 8,
    marginBottom: 15,
    width: "30%",
  },
  aiSuggestionText: {
    fontSize: 10,
    color: "#8b5cf6",
    fontWeight: "600",
    marginLeft: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#000",
    backgroundColor: "#f9fafb",
  },
  inputAIEnhanced: {
    borderColor: "#8b5cf6",
    backgroundColor: "#faf5ff",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
    color: "#000",
  },

  // AI Analysis Card
  aiAnalysisCard: {
    backgroundColor: "#faf5ff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e9d5ff",
  },
  aiAnalysisHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  aiAnalysisTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#8b5cf6",
    marginLeft: 8,
  },
  aiAnalysisContent: {
    gap: 12,
  },
  analysisItem: {
    flexDirection: "column",
  },
  analysisLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4,
  },
  analysisResult: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  issueStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flex: 1,
    marginRight: 8,
  },
  issueStatusIssue: {
    backgroundColor: "#dcfce7",
  },
  issueStatusNoIssue: {
    backgroundColor: "#fef3c7",
  },
  issueStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  confidenceText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  suggestionsText: {
    fontSize: 13,
    color: "#4b5563",
    fontStyle: "italic",
    lineHeight: 18,
  },

  // Media handling (images and videos)
  mediaContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  mediaWrapper: {
    position: "relative",
    marginRight: 8,
    marginBottom: 8,
  },
  uploadedMedia: {
    width: imageSize,
    height: imageSize,
    borderRadius: 8,
  },
  videoThumbnailContainer: {
    width: imageSize,
    height: imageSize,
    backgroundColor: "#1f2937",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  playIcon: {
    position: "absolute",
  },
  videoText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 20,
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  aiStatusOverlay: {
    position: "absolute",
    bottom: 4,
    left: 4,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  aiStatusIssue: {
    backgroundColor: "#16a34a",
  },
  aiStatusNoIssue: {
    backgroundColor: "#f59e0b",
  },
  aiStatusText: {
    fontSize: 10,
    color: "white",
    fontWeight: "600",
    marginLeft: 2,
  },
  removeMediaButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "white",
    borderRadius: 12,
  },
  addMediaButton: {
    width: imageSize,
    height: imageSize,
    backgroundColor: "#f9fafb",
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderStyle: "dashed",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  addMediaText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    fontWeight: "600",
  },
  addImageSubtext: {
    fontSize: 10,
    color: "#8b5cf6",
    marginTop: 2,
  },

  // AI Summary
  aiSummaryContainer: {
    gap: 12,
  },
  aiSummaryItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiSummaryText: {
    fontSize: 14,
    color: "#4b5563",
    marginLeft: 8,
    flex: 1,
  },

  // Location
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  locationButtonText: {
    fontSize: 12,
    color: "#16a34a",
    fontWeight: "600",
    marginLeft: 4,
  },
  locationInfoText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 8,
  },

  // Submit button
  submitButton: {
    backgroundColor: "#16a34a",
    paddingVertical: 16,
    borderRadius: 12,
    marginVertical: 16,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#9ca3af",
  },
  submitButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },

  // Department Assignment Preview Card
  departmentPreviewCard: {
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  departmentPreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  departmentPreviewTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#16a34a",
    marginLeft: 8,
  },
  departmentInfo: {
    marginBottom: 12,
  },
  departmentName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  departmentDescription: {
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 18,
  },
  autoAssignBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  autoAssignText: {
    fontSize: 11,
    color: "#16a34a",
    fontWeight: "600",
    marginLeft: 4,
  },

  // Dropdown Styles
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#f9fafb",
  },
  dropdownButtonAISuggested: {
    borderColor: "#8b5cf6",
    backgroundColor: "#faf5ff",
  },
  disabledDropdown: {
    backgroundColor: "#f3f4f6",
    borderColor: "#d1d5db",
    opacity: 0.7,
  },
  aiAutoSetText: {
    fontSize: 12,
    color: "#8b5cf6",
    marginTop: 6,
    fontStyle: "italic",
  },
  dropdownButtonText: {
    fontSize: 16,
    color: "#000",
  },
  placeholderText: {
    color: "#9ca3af",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    width: "90%",
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
    textAlign: "center",
  },
  categoryOptionItem: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  categoryOptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  categoryOptionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginLeft: 12,
  },
  categoryOptionDetails: {
    marginLeft: 32,
  },
  categoryDepartment: {
    fontSize: 13,
    color: "#16a34a",
    fontWeight: "600",
    marginBottom: 2,
  },
  categoryDescription: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 16,
  },
  optionItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  optionText: {
    fontSize: 16,
    color: "#000",
  },

  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  successModalContent: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  successModalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1f2937",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  successModalText: {
    fontSize: 16,
    color: "#4b5563",
    textAlign: "center",
    marginBottom: 16,
  },
  successModalDepartmentInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  successModalDepartmentText: {
    fontSize: 14,
    color: "#16a34a",
    fontWeight: "600",
    marginLeft: 6,
  },
  successModalAIInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3e8ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 24,
  },
  successModalAIText: {
    fontSize: 12,
    color: "#8b5cf6",
    fontWeight: "600",
    marginLeft: 4,
  },
  successModalButton: {
    backgroundColor: "#16a34a",
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  successModalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  successModalSecondaryButton: {
    marginTop: 12,
  },
  successModalSecondaryButtonText: {
    color: "#16a34a",
    fontSize: 16,
    fontWeight: "500",
  },
});
