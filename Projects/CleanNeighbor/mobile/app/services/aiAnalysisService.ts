interface VideoAnalysisResult {
  success: boolean;
  filename?: string;
  prediction_type?: string;
  overall_result?: {
    is_issue: boolean;
    predicted_class: string;
    confidence: number;
  };
  statistics?: {
    total_frames_analyzed: number;
    frames_with_issues: number;
    frames_without_issues: number;
    issue_percentage: number;
    threshold_used: number;
  };
  frame_details?: Array<{
    frame_number: number;
    predicted_class: string;
    confidence: number;
    is_issue: boolean;
    image_base64?: string; // For video-with-images endpoint
  }>;
  processing_config?: {
    sample_rate: number;
    issue_threshold_percent: number;
    images_included?: boolean;
  };
  error?: string;
  timestamp?: string;
}

interface IssueDetectionResult {
  success: boolean;
  filename?: string;
  prediction_type?: string;
  predicted_class?: string;
  confidence?: number;
  is_issue?: boolean;
  disposal_tutorial?: string;
  probabilities?: {
    issue: number;
    no_issue: number;
  };
  error?: string;
  timestamp?: string;
}

interface CombinedAnalysisResult {
  success: boolean;
  prediction_type?: string;
  image_results?: Array<{
    filename: string;
    index: number;
    type: 'image';
    predicted_class: string;
    confidence: number;
    is_issue: boolean;
    probabilities: {
      issue: number;
      no_issue: number;
    };
  }>;
  video_results?: Array<{
    filename: string;
    index: number;
    type: 'video';
    overall_result: {
      is_issue: boolean;
      predicted_class: string;
      confidence: number;
    };
    statistics: {
      total_frames_analyzed: number;
      frames_with_issues: number;
      frames_without_issues: number;
      issue_percentage: number;
      threshold_used: number;
    };
    frame_details: Array<{
      frame_number: number;
      predicted_class: string;
      confidence: number;
      is_issue: boolean;
    }>;
  }>;
  summary?: {
    total_images_processed: number;
    total_videos_processed: number;
    images_with_issues: number;
    videos_with_issues: number;
    overall_issue_detected: boolean;
    total_files_processed: number;
    files_with_issues: number;
    issue_percentage: number;
  };
  processing_errors?: string[];
  processing_config?: {
    video_sample_rate: number;
    issue_threshold_percent: number;
    supported_image_formats: string[];
    supported_video_formats: string[];
  };
  error?: string;
  timestamp?: string;
}

interface ServerStatus {
  api_status: string;
  model: {
    issue_detection: {
      loaded: boolean;
      classes: string[];
    };
  };
  configuration: {
    video_sample_rate: number;
    issue_threshold: number;
    supported_image_formats: string[];
    supported_video_formats: string[];
    max_image_size_mb: number;
    max_video_size_mb: number;
  };
  endpoints: string[];
  timestamp: string;
}

export default class AIAnalysisService {
  private baseUrl: string;
  private timeout: number = 60000; // 60 seconds for video processing

  constructor() {
    // Get Flask server URL from environment or use default
    const envUrl = process.env.EXPO_PUBLIC_FLASK_SERVER_URL;
    this.baseUrl = envUrl || "https://shuchithvam-ml-task-server.onrender.com";

    // For development, you might want to use your local machine's IP
    if (__DEV__) {
      console.log("🔧 Flask server URL:", this.baseUrl);
      if (
        this.baseUrl.includes("localhost") ||
        this.baseUrl.includes("devtunnels")
      ) {
        console.log("🔧 Development mode detected");
      }
    }
  }

  async checkServerStatus(): Promise<ServerStatus | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.baseUrl}/status`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const result = await response.json();
      return result as ServerStatus;
    } catch (error: any) {
      console.error("❌ Failed to check server status:", error.message);
      return null;
    }
  }

  private async imageUriToBase64(imageUri: string): Promise<string> {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = (reader.result as string).split(",")[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw new Error(`Failed to convert image to base64: ${error}`);
    }
  }

  /**
   * Analyze image for issue detection
   */
  async analyzeImage(imageUri: string): Promise<IssueDetectionResult> {
    try {
      const base64Data = await this.imageUriToBase64(imageUri);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/predict/issue-base64`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: base64Data,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Server error: ${response.status}`);
      }

      return result as IssueDetectionResult;
    } catch (error) {
      console.error("❌ Image analysis failed:", error);

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return {
            success: false,
            error: "Request timeout - server took too long to respond",
          };
        }
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: "Unknown error occurred during analysis",
      };
    }
  }

  /**
   * Analyze video for issue detection
   */
  async analyzeVideo(videoUri: string, includeImages: boolean = false): Promise<VideoAnalysisResult> {
    try {
      // Create proper FormData for video upload with better error handling
      const formData = new FormData();
      
      // For React Native, use the proper format
      formData.append('video', {
        uri: videoUri,
        type: 'video/mp4',
        name: 'video.mp4',
      } as any);
      
      // Add additional headers for better compatibility
      const uploadHeaders: Record<string, string> = {
        'Accept': 'application/json',
      };
      
      // Don't set Content-Type manually when using FormData
      // React Native will set it automatically with boundary

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const endpoint = includeImages ? '/predict/video-with-images' : '/predict/video';
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        body: formData,
        headers: uploadHeaders, // Use the proper headers without Content-Type
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Server error: ${response.status}`);
      }

      return result as VideoAnalysisResult;
    } catch (error) {
      console.error("❌ Video analysis failed:", error);

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return {
            success: false,
            error: "Request timeout - video processing took too long",
          };
        }
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: "Unknown error occurred during video analysis",
      };
    }
  }

  /**
   * Analyze multiple images and videos together
   */
  async analyzeCombined(
    imageUris: string[] = [], 
    videoUris: string[] = []
  ): Promise<CombinedAnalysisResult> {
    try {
      if (imageUris.length === 0 && videoUris.length === 0) {
        return {
          success: false,
          error: "No media files provided for analysis",
        };
      }

      const formData = new FormData();

      // Add images
      imageUris.forEach((uri, index) => {
        formData.append('images', {
          uri,
          type: 'image/jpeg',
          name: `image_${index}.jpg`,
        } as any);
      });

      // Add videos
      videoUris.forEach((uri, index) => {
        formData.append('videos', {
          uri,
          type: 'video/mp4',
          name: `video_${index}.mp4`,
        } as any);
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/predict/combined`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        }, // Don't set Content-Type for FormData
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Server error: ${response.status}`);
      }

      return result as CombinedAnalysisResult;
    } catch (error) {
      console.error("❌ Combined analysis failed:", error);

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return {
            success: false,
            error: "Request timeout - combined analysis took too long",
          };
        }
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: "Unknown error occurred during combined analysis",
      };
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  async analyzeIssueDetection(imageUri: string): Promise<IssueDetectionResult> {
    return this.analyzeImage(imageUri);
  }

  /**
   * Complete analysis - now supports both images and videos
   */
  async analyzeComplete(mediaUri: string, mediaType: 'image' | 'video' = 'image'): Promise<IssueDetectionResult | VideoAnalysisResult> {
    if (mediaType === 'video') {
      return this.analyzeVideo(mediaUri);
    } else {
      return this.analyzeImage(mediaUri);
    }
  }

  /**
   * Generate suggestions from image analysis
   */
  generateSuggestions(analysis: IssueDetectionResult): string {
    if (!analysis.success) {
      return "Unable to analyze the image. Please ensure the image clearly shows a civic issue.";
    }

    if (analysis.predicted_class === 'blocked') {
      return "Content blocked by safety filters.";
    }

    if (analysis.disposal_tutorial) {
      return analysis.disposal_tutorial;
    }

    if (!analysis.is_issue) {
      return "The image doesn't appear to show a civic issue. Please upload an image that clearly shows the problem you want to report.";
    }

    const confidence = analysis.confidence || 0;
    if (confidence < 0.6) {
      return "The image might contain an issue but it's not very clear. Please upload a clearer image or provide detailed description of the problem.";
    }

    return "Issue detected in the image. Please provide detailed information about the specific problem you're reporting including its impact on the community.";
  }

  /**
   * Generate suggestions from video analysis
   */
  generateVideoSuggestions(analysis: VideoAnalysisResult): string {
    if (!analysis.success) {
      return "Unable to analyze the video. Please ensure the video clearly shows a civic issue.";
    }

    if (!analysis.overall_result?.is_issue) {
      return "The video doesn't appear to show a civic issue. Please upload a video that clearly shows the problem you want to report.";
    }

    const issuePercentage = analysis.statistics?.issue_percentage || 0;
    const confidence = analysis.overall_result?.confidence || 0;

    if (issuePercentage < 30) {
      return "Only a small portion of the video shows potential issues. Consider uploading a video that better focuses on the problem area.";
    }

    if (confidence < 0.6) {
      return "The video might contain issues but they're not very clear. Please upload a clearer video or provide detailed description of the problem.";
    }

    return `Video analysis shows ${Math.round(issuePercentage)}% of frames contain civic issues. Please provide detailed information about the specific problem shown in the video.`;
  }

  /**
   * Generate suggestions from combined analysis
   */
  generateCombinedSuggestions(analysis: CombinedAnalysisResult): string {
    if (!analysis.success) {
      return "Unable to analyze the media files. Please ensure they clearly show civic issues.";
    }

    const summary = analysis.summary;
    if (!summary) {
      return "Analysis completed but no summary available. Please provide detailed description of the issues.";
    }

    if (!summary.overall_issue_detected) {
      return "None of the uploaded media files appear to show civic issues. Please upload media that clearly shows the problems you want to report.";
    }

    const issuePercentage = summary.issue_percentage;
    const totalFiles = summary.total_files_processed;
    const filesWithIssues = summary.files_with_issues;

    return `Analysis detected issues in ${filesWithIssues} out of ${totalFiles} files (${Math.round(issuePercentage)}%). Please provide detailed information about the specific problems shown in your media.`;
  }

  /**
   * Get confidence level description
   */
  getConfidenceDescription(confidence: number): string {
    if (confidence >= 0.9) return "Very High";
    if (confidence >= 0.75) return "High";
    if (confidence >= 0.6) return "Medium";
    if (confidence >= 0.4) return "Low";
    return "Very Low";
  }

  /**
   * Determine if analysis result is reliable
   */
  isAnalysisReliable(analysis: IssueDetectionResult | VideoAnalysisResult): boolean {
    if (!analysis.success) return false;

    if ('confidence' in analysis) {
      // Image analysis
      return (analysis.confidence || 0) >= 0.6;
    } else if ('overall_result' in analysis) {
      // Video analysis
      return (analysis.overall_result?.confidence || 0) >= 0.6;
    }

    return false;
  }

  /**
   * Test connection to server
   */
  async testConnection(): Promise<{
    connected: boolean;
    error?: string;
    issueModel?: boolean;
    videoSupported?: boolean;
    serverConfig?: any;
  }> {
    try {
      const status = await this.checkServerStatus();

      if (!status) {
        return {
          connected: false,
          error: "Unable to connect to AI server",
        };
      }

      const issueModelLoaded = status.model?.issue_detection?.loaded || false;
      const videoSupported = status.endpoints?.includes('/predict/video') || false;

      return {
        connected: true,
        issueModel: issueModelLoaded,
        videoSupported,
        serverConfig: status.configuration,
      };
    } catch (error) {
      console.error("Connection test failed:", error);
      return {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown connection error",
      };
    }
  }

  /**
   * Map AI category to form category (if category classification is added later)
   */
  mapAICategoryToFormCategory(aiCategory: string): string {
    const categoryMap: Record<string, string> = {
      "e-waste": "E-Waste",
      "plastic": "Recyclable Waste",
      "glass": "Recyclable Waste",
      "metal": "Recyclable Waste",
      "paper": "Recyclable Waste",
      "cardboard": "Recyclable Waste",
      "trash": "Mixed Waste",
    };

    return categoryMap[aiCategory.toLowerCase()] || "Other";
  }

  getServerUrl(): string {
    return this.baseUrl;
  }

  setServerUrl(url: string): void {
    this.baseUrl = url;
  }

  async chat(messages: Array<{role: string, content: string}>): Promise<string> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Server error: ${response.status}`);
      }

      return result.reply;
    } catch (error: any) {
      console.error("❌ Chat failed:", error);
      throw new Error(error.message || "Unknown error occurred during chat");
    }
  }
}

// Export singleton instance
export const aiAnalysisService = new AIAnalysisService();

// Export types for use in components
export type {
  IssueDetectionResult,
  VideoAnalysisResult,
  CombinedAnalysisResult,
  ServerStatus,
};

// Export utility functions
export const AIUtils = {
  /**
   * Format confidence percentage
   */
  formatConfidence: (confidence: number): string => {
    return `${Math.round(confidence * 100)}%`;
  },

  /**
   * Get color for confidence level
   */
  getConfidenceColor: (confidence: number): string => {
    if (confidence >= 0.8) return "#16a34a"; // Green
    if (confidence >= 0.6) return "#ca8a04"; // Yellow
    return "#dc2626"; // Red
  },

  /**
   * Check if media should trigger a warning
   */
  shouldWarnUser: (analysis: IssueDetectionResult | VideoAnalysisResult): boolean => {
    if (!analysis.success) return false;
    
    if ('is_issue' in analysis) {
      // Image analysis
      return !analysis.is_issue && (analysis.confidence || 0) > 0.7;
    } else if ('overall_result' in analysis) {
      // Video analysis
      return !analysis.overall_result?.is_issue && (analysis.overall_result?.confidence || 0) > 0.7;
    }
    
    return false;
  },

  /**
   * Generate issue priority suggestion based on analysis
   */
  suggestPriority: (
    analysis: IssueDetectionResult | VideoAnalysisResult
  ): "low" | "medium" | "high" | "urgent" => {
    let confidence = 0;
    let success = false;

    if ('confidence' in analysis) {
      // Image analysis
      success = analysis.success;
      confidence = analysis.confidence || 0;
    } else if ('overall_result' in analysis) {
      // Video analysis
      success = analysis.success && !!analysis.overall_result;
      confidence = analysis.overall_result?.confidence || 0;
    }

    if (!success) return "medium";

    if (confidence >= 0.9) return "urgent";
    if (confidence >= 0.75) return "high";
    if (confidence >= 0.6) return "medium";
    return "low";
  },

  /**
   * Get media type from URI
   */
  getMediaType: (uri: string): 'image' | 'video' | 'unknown' => {
    const extension = uri.split('.').pop()?.toLowerCase();
    
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const videoExtensions = ['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm'];
    
    if (extension && imageExtensions.includes(extension)) return 'image';
    if (extension && videoExtensions.includes(extension)) return 'video';
    
    return 'unknown';
  },

  /**
   * Check if file size is within limits (approximate check based on URI)
   */
  isFileSizeValid: async (uri: string, type: 'image' | 'video'): Promise<boolean> => {
    try {
      const response = await fetch(uri, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      
      if (!contentLength) return true; // Can't check, assume valid
      
      const sizeInMB = parseInt(contentLength) / (1024 * 1024);
      
      if (type === 'image') return sizeInMB <= 10; // 10MB limit for images
      if (type === 'video') return sizeInMB <= 50; // 50MB limit for videos
      
      return true;
    } catch (error) {
      console.warn('Could not check file size:', error);
      return true; // Can't check, assume valid
    }
  },
};