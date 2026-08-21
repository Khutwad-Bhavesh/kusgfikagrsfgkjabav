# ================================================================================
# FLASK API FOR CIVIC ISSUE DETECTION - IMAGES, VIDEOS & COMBINED
# Enhanced server with image, video, and combined processing capabilities
# ================================================================================

from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import tensorflow as tf
import numpy as np
from PIL import Image
import base64
import io
import os
from datetime import datetime
import logging
import cv2
import tempfile
from collections import Counter
import math
import google.generativeai as genai
import json

# Disable all GPU devices (forces CPU only)
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

# Suppress TensorFlow logging except errors
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
logging.getLogger("tensorflow").setLevel(logging.ERROR)

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}) # Allow all origins for development

# Initialize Gemini
gemini_api_key = os.environ.get("GEMINI_API_KEY")
gemini_configured = False
if gemini_api_key:
    genai.configure(api_key=gemini_api_key)
    gemini_configured = True
    logger.info("Gemini API configured successfully")
else:
    logger.warning("GEMINI_API_KEY not found. Falling back to local TFLite model.")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ================================================================================
# CONFIGURATION
# ================================================================================

# Model path - only issue detection model
ISSUE_MODEL_PATH = 'civic_issue_classifier.tflite'
MODELS_DIR = 'models/'

# Image configuration
IMG_SIZE = (224, 224)

# Video configuration
VIDEO_SAMPLE_RATE = 1  # Extract 1 frame per second
MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50MB max video size
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB max image size
SUPPORTED_VIDEO_FORMATS = {'mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm'}
SUPPORTED_IMAGE_FORMATS = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}
ISSUE_THRESHOLD = 0.6  # 60% of frames should indicate issue for positive result

# Class names for issue detection only
ISSUE_CLASS_NAMES = ['issue', 'no_issue']

# Global model variable
issue_model = None

# ================================================================================
# MODEL LOADING FUNCTION
# ================================================================================

def load_issue_model():
    """Load the civic issue detection model"""
    global issue_model
    
    try:
        # Try different model file locations and formats
        model_paths = [
            ISSUE_MODEL_PATH,
            os.path.join(MODELS_DIR, ISSUE_MODEL_PATH),
            'best_civic_model.h5',
            os.path.join(MODELS_DIR, 'civic_issue_classifier.tflite')
        ]
        
        for model_path in model_paths:
            if os.path.exists(model_path):
                if model_path.endswith('.tflite'):
                    # Load TFLite model
                    issue_model = tf.lite.Interpreter(model_path=model_path)
                    issue_model.allocate_tensors()
                    logger.info(f"✅ Issue detection TFLite model loaded from {model_path}")
                else:
                    # Load Keras model
                    issue_model = tf.keras.models.load_model(model_path)
                    logger.info(f"✅ Issue detection Keras model loaded from {model_path}")
                return True
                
        logger.error("❌ Issue detection model not found")
        return False
        
    except Exception as e:
        logger.error(f"❌ Error loading issue model: {str(e)}")
        return False

# Load model when app starts
issue_model_loaded = load_issue_model()

# ================================================================================
# HELPER FUNCTIONS
# ================================================================================

def preprocess_image_for_issue(image):
    """Preprocess image for issue detection model"""
    try:
        # Resize image
        image = image.resize(IMG_SIZE)
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert to numpy array and normalize
        img_array = np.array(image) / 255.0
        
        # Add batch dimension
        img_batch = np.expand_dims(img_array, axis=0).astype(np.float32)
        
        return img_batch
    except Exception as e:
        logger.error(f"Error preprocessing image: {str(e)}")
        return None

def predict_issue(img_batch):
    """Predict if image contains a civic issue"""
    try:
        if issue_model is None:
            return None
            
        if isinstance(issue_model, tf.lite.Interpreter):
            # TFLite prediction
            input_details = issue_model.get_input_details()
            output_details = issue_model.get_output_details()
            
            issue_model.set_tensor(input_details[0]['index'], img_batch)
            issue_model.invoke()
            predictions = issue_model.get_tensor(output_details[0]['index'])[0]
        else:
            # Keras prediction
            predictions = issue_model.predict(img_batch, verbose=0)[0]
        
        # Get results
        predicted_class_idx = np.argmax(predictions)
        predicted_class = ISSUE_CLASS_NAMES[predicted_class_idx]
        confidence = float(np.max(predictions))
        
        # Create probabilities dictionary
        probabilities = {
            class_name: float(prob) 
            for class_name, prob in zip(ISSUE_CLASS_NAMES, predictions)
        }
        
        return {
            'predicted_class': predicted_class,
            'confidence': confidence,
            'is_issue': predicted_class == 'issue',
            'probabilities': probabilities
        }
        
    except Exception as e:
        logger.error(f"Error in issue prediction: {str(e)}")
        return None

def extract_video_frames(video_path, sample_rate=VIDEO_SAMPLE_RATE):
    """Extract frames from video at specified sample rate"""
    try:
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            return None, "Could not open video file"
        
        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0
        
        logger.info(f"Video info - FPS: {fps}, Total frames: {total_frames}, Duration: {duration:.2f}s")
        
        frames = []
        frame_count = 0
        extracted_count = 0
        
        # Calculate frame interval based on sample rate
        frame_interval = int(fps / sample_rate) if fps > sample_rate else 1
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Extract frame at specified intervals
            if frame_count % frame_interval == 0:
                # Convert BGR to RGB
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_image = Image.fromarray(rgb_frame)
                frames.append(pil_image)
                extracted_count += 1
            
            frame_count += 1
        
        cap.release()
        
        logger.info(f"Extracted {extracted_count} frames from {total_frames} total frames")
        
        return frames, None
        
    except Exception as e:
        return None, f"Error extracting frames: {str(e)}"

def analyze_video_frames(frames, include_images=False):
    """Analyze multiple frames and determine overall result"""
    try:
        if not frames:
            return None, "No frames to analyze"
        
        frame_results = []
        issue_count = 0
        
        logger.info(f"Analyzing {len(frames)} frames...")
        
        for i, frame in enumerate(frames):
            # Preprocess frame
            img_batch = preprocess_image_for_issue(frame)
            if img_batch is None:
                continue
            
            # Predict
            prediction = predict_issue(img_batch)
            if prediction is None:
                continue
            
            frame_result = {
                'frame_number': i + 1,
                'predicted_class': prediction['predicted_class'],
                'confidence': prediction['confidence'],
                'is_issue': prediction['is_issue']
            }
            
            # Include base64 image if requested
            if include_images:
                try:
                    # Convert PIL image to base64
                    buffered = io.BytesIO()
                    frame.save(buffered, format="JPEG", quality=85)
                    img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
                    frame_result['image_base64'] = f"data:image/jpeg;base64,{img_base64}"
                except Exception as e:
                    logger.warning(f"Could not convert frame {i+1} to base64: {str(e)}")
                    frame_result['image_base64'] = None
            
            frame_results.append(frame_result)
            
            if prediction['is_issue']:
                issue_count += 1
        
        if not frame_results:
            return None, "No valid frame predictions"
        
        # Calculate overall statistics
        total_analyzed = len(frame_results)
        issue_percentage = (issue_count / total_analyzed) * 100
        
        # Determine overall result based on threshold
        overall_is_issue = issue_percentage >= (ISSUE_THRESHOLD * 100)
        
        # Calculate average confidence for frames that detected issues
        issue_frames = [f for f in frame_results if f['is_issue']]
        avg_issue_confidence = np.mean([f['confidence'] for f in issue_frames]) if issue_frames else 0
        
        # Calculate average confidence for frames that detected no issues
        no_issue_frames = [f for f in frame_results if not f['is_issue']]
        avg_no_issue_confidence = np.mean([f['confidence'] for f in no_issue_frames]) if no_issue_frames else 0
        
        result = {
            'overall_result': {
                'is_issue': overall_is_issue,
                'predicted_class': 'issue' if overall_is_issue else 'no_issue',
                'confidence': avg_issue_confidence if overall_is_issue else avg_no_issue_confidence
            },
            'statistics': {
                'total_frames_analyzed': total_analyzed,
                'frames_with_issues': issue_count,
                'frames_without_issues': total_analyzed - issue_count,
                'issue_percentage': round(issue_percentage, 2),
                'threshold_used': ISSUE_THRESHOLD * 100
            },
            'frame_details': frame_results
        }
        
        logger.info(f"Video analysis complete: {issue_percentage:.1f}% frames show issues")
        
        return result, None
        
    except Exception as e:
        return None, f"Error analyzing frames: {str(e)}"

def process_image_input(request_data, is_file_upload=True):
    """Process image input from request (file upload or base64)"""
    try:
        if is_file_upload:
            # File upload
            if 'image' not in request.files:
                return None, 'No image file provided'
            
            file = request.files['image']
            if file.filename == '':
                return None, 'No image file selected'
            
            # Validate file type
            if not ('.' in file.filename and 
                    file.filename.rsplit('.', 1)[1].lower() in SUPPORTED_IMAGE_FORMATS):
                return None, f'Invalid file type. Allowed: {", ".join(SUPPORTED_IMAGE_FORMATS)}'
            
            image = Image.open(file.stream)
            filename = file.filename
            
        else:
            # Base64 input
            if not request_data or 'image' not in request_data:
                return None, 'No base64 image data provided'
            
            image_base64 = request_data['image']
            
            # Remove data URL prefix if present
            if ',' in image_base64:
                image_base64 = image_base64.split(',')[1]
            
            # Decode base64
            try:
                image_data = base64.b64decode(image_base64)
                image = Image.open(io.BytesIO(image_data))
                filename = 'base64_image'
            except Exception as e:
                return None, f'Invalid base64 image data: {str(e)}'
        
        return {'image': image, 'filename': filename}, None
        
    except Exception as e:
        return None, f'Error processing image: {str(e)}'

def process_video_input(request):
    """Process video input from request"""
    try:
        if 'video' not in request.files:
            return None, 'No video file provided'
        
        file = request.files['video']
        if file.filename == '':
            return None, 'No video file selected'
        
        # Validate file type
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        if file_ext not in SUPPORTED_VIDEO_FORMATS:
            return None, f'Invalid video format. Supported: {", ".join(SUPPORTED_VIDEO_FORMATS)}'
        
        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_ext}')
        file.save(temp_file.name)
        
        return {'temp_path': temp_file.name, 'filename': file.filename}, None
        
    except Exception as e:
        return None, f'Error processing video: {str(e)}'

def process_combined_input(request):
    """Process both images and videos from the same request"""
    try:
        results = {
            'images': [],
            'videos': [],
            'errors': []
        }
        
        # Process images
        image_files = request.files.getlist('images')
        for i, file in enumerate(image_files):
            if file.filename == '':
                continue
                
            file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
            
            if file_ext in SUPPORTED_IMAGE_FORMATS:
                try:
                    image = Image.open(file.stream)
                    results['images'].append({
                        'image': image,
                        'filename': file.filename,
                        'index': i
                    })
                except Exception as e:
                    results['errors'].append(f"Error processing image {file.filename}: {str(e)}")
            else:
                results['errors'].append(f"Unsupported image format: {file.filename}")
        
        # Process videos
        video_files = request.files.getlist('videos')
        for i, file in enumerate(video_files):
            if file.filename == '':
                continue
                
            file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
            
            if file_ext in SUPPORTED_VIDEO_FORMATS:
                try:
                    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_ext}')
                    file.save(temp_file.name)
                    results['videos'].append({
                        'temp_path': temp_file.name,
                        'filename': file.filename,
                        'index': i
                    })
                except Exception as e:
                    results['errors'].append(f"Error processing video {file.filename}: {str(e)}")
            else:
                results['errors'].append(f"Unsupported video format: {file.filename}")
        
        return results, None
        
    except Exception as e:
        return None, f'Error processing combined input: {str(e)}'

# ================================================================================
# API ROUTES
# ================================================================================

@app.route('/')
def home():
    """Home page with API documentation"""
    
    html_template = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Enhanced Civic Issue Detection API</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
            .endpoint { background: #ecf0f1; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .method { background: #27ae60; color: white; padding: 3px 8px; border-radius: 3px; font-size: 12px; }
            .method.post { background: #e74c3c; }
            code { background: #2c3e50; color: #ecf0f1; padding: 2px 6px; border-radius: 3px; }
            .new-feature { background: #f39c12; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; }
            .config { background: #e8f4fd; padding: 15px; border-left: 4px solid #3498db; margin: 15px 0; }
            .test-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .form-group { margin: 15px 0; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            input[type="file"] { margin: 5px 0; }
            button { background: #3498db; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
            button:hover { background: #2980b9; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🏛️ Enhanced Civic Issue Detection API</h1>
            <p><span class="new-feature">ENHANCED</span> Now supports images, videos, and combined processing!</p>
            
            <div class="status">
                <h3>📊 Model Status</h3>
                <p><strong>Issue Detection:</strong> {{ '✅ Loaded' if issue_loaded else '❌ Not Loaded' }}</p>
            </div>
            
            <div class="config">
                <h3>⚙️ Configuration</h3>
                <ul>
                    <li><strong>Video Sample Rate:</strong> {{ sample_rate }} frame(s) per second</li>
                    <li><strong>Issue Threshold:</strong> {{ threshold }}% of frames must show issues</li>
                    <li><strong>Supported Image Formats:</strong> {{ image_formats }}</li>
                    <li><strong>Supported Video Formats:</strong> {{ video_formats }}</li>
                    <li><strong>Max Image Size:</strong> {{ max_image_size }}MB</li>
                    <li><strong>Max Video Size:</strong> {{ max_video_size }}MB</li>
                </ul>
            </div>
            
            <h2>🔗 API Endpoints</h2>
            
            <div class="endpoint">
                <span class="method">GET</span> <code>/</code>
                <p>API documentation (this page)</p>
            </div>
            
            <div class="endpoint">
                <span class="method">GET</span> <code>/status</code>
                <p>Check API and model status</p>
            </div>
            
            <div class="endpoint">
                <span class="method post">POST</span> <code>/predict/issue</code>
                <p>Detect civic issues in images (file upload)</p>
            </div>
            
            <div class="endpoint">
                <span class="method post">POST</span> <code>/predict/issue-base64</code>
                <p>Issue detection with base64 encoded image</p>
            </div>
            
            <div class="endpoint">
                <span class="method post">POST</span> <code>/predict/video</code> <span class="new-feature">NEW</span>
                <p>Detect civic issues in videos by analyzing frames</p>
            </div>
            
            <div class="endpoint">
                <span class="method post">POST</span> <code>/predict/video-with-images</code> <span class="new-feature">NEW</span>
                <p>Video analysis with frame images included in response</p>
            </div>
            
            <div class="endpoint">
                <span class="method post">POST</span> <code>/predict/combined</code> <span class="new-feature">NEW</span>
                <p>Analyze multiple images and videos in a single request</p>
            </div>
            
            <h2>🧪 Test the API</h2>
            
            <div class="test-section">
                <h3>📷 Test Image Analysis</h3>
                <form action="/predict/issue" method="post" enctype="multipart/form-data">
                    <input type="file" name="image" accept="image/*" required>
                    <br><br>
                    <button type="submit">Upload & Analyze Image</button>
                </form>
            </div>
            
            <div class="test-section">
                <h3>🎥 Test Video Analysis</h3>
                <form action="/predict/video" method="post" enctype="multipart/form-data">
                    <input type="file" name="video" accept="video/*" required>
                    <br><br>
                    <button type="submit">Upload & Analyze Video</button>
                </form>
            </div>
            
            <div class="test-section">
                <h3>🎥📷 Test Video Analysis with Frame Images</h3>
                <form action="/predict/video-with-images" method="post" enctype="multipart/form-data">
                    <input type="file" name="video" accept="video/*" required>
                    <br><br>
                    <button type="submit">Upload & Analyze Video (with images)</button>
                </form>
            </div>
            
            <div class="test-section">
                <h3>🔄 Test Combined Analysis</h3>
                <form action="/predict/combined" method="post" enctype="multipart/form-data">
                    <div class="form-group">
                        <label>Upload Images (multiple files allowed):</label>
                        <input type="file" name="images" accept="image/*" multiple>
                    </div>
                    <div class="form-group">
                        <label>Upload Videos (multiple files allowed):</label>
                        <input type="file" name="videos" accept="video/*" multiple>
                    </div>
                    <button type="submit">Upload & Analyze Combined</button>
                </form>
            </div>
        </div>
    </body>
    </html>
    """
    
    return render_template_string(
        html_template,
        issue_loaded=issue_model_loaded,
        sample_rate=VIDEO_SAMPLE_RATE,
        threshold=int(ISSUE_THRESHOLD * 100),
        image_formats=', '.join(SUPPORTED_IMAGE_FORMATS),
        video_formats=', '.join(SUPPORTED_VIDEO_FORMATS),
        max_image_size=MAX_IMAGE_SIZE // (1024 * 1024),
        max_video_size=MAX_VIDEO_SIZE // (1024 * 1024)
    )

@app.route('/status')
def status():
    """API status endpoint"""
    return jsonify({
        'api_status': 'running',
        'model': {
            'issue_detection': {
                'loaded': issue_model_loaded,
                'classes': ISSUE_CLASS_NAMES
            }
        },
        'configuration': {
            'video_sample_rate': VIDEO_SAMPLE_RATE,
            'issue_threshold': ISSUE_THRESHOLD,
            'supported_image_formats': list(SUPPORTED_IMAGE_FORMATS),
            'supported_video_formats': list(SUPPORTED_VIDEO_FORMATS),
            'max_image_size_mb': MAX_IMAGE_SIZE // (1024 * 1024),
            'max_video_size_mb': MAX_VIDEO_SIZE // (1024 * 1024)
        },
        'endpoints': [
            '/predict/issue',
            '/predict/issue-base64',
            '/predict/video',
            '/predict/video-with-images',
            '/predict/combined'
        ],
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })

@app.route('/predict/issue', methods=['POST'])
def predict_issue_endpoint():
    """Issue detection endpoint (file upload)"""
    
    if not issue_model_loaded:
        return jsonify({
            'success': False,
            'error': 'Issue detection model not loaded',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 500
    
    try:
        # Process image input
        image_data, error = process_image_input(request, is_file_upload=True)
        if error:
            return jsonify({
                'success': False,
                'error': error,
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 400
        
        pil_image = image_data['image']
        prediction = None
        
        if gemini_configured:
            try:
                model = genai.GenerativeModel('gemini-1.5-flash')
                prompt = 'Does this image clearly show a civic issue such as garbage, overflowing bins, a pothole, broken streetlight, or illegal dumping? Reply with a JSON object exactly like this, nothing else: {"is_issue": true, "predicted_class": "issue", "confidence": 0.95}'
                response = model.generate_content([prompt, pil_image])
                
                text = response.text.strip()
                if text.startswith('```json'):
                    text = text[7:-3]
                elif text.startswith('```'):
                    text = text[3:-3]
                
                prediction = json.loads(text)
                if 'probabilities' not in prediction:
                    prediction['probabilities'] = {'issue': prediction['confidence'] if prediction['is_issue'] else 1.0 - prediction['confidence'], 'no_issue': 1.0 - prediction['confidence'] if prediction['is_issue'] else prediction['confidence']}
            except Exception as e:
                logger.error(f"Gemini API error or JSON parse error: {str(e)}")
        
        if prediction is None:
            # Fallback to TFLite Model
            img_batch = preprocess_image_for_issue(pil_image)
            if img_batch is None:
                return jsonify({'success': False, 'error': 'Error preprocessing image', 'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')}), 400
            prediction = predict_issue(img_batch)
            
        if prediction is None:
            return jsonify({'success': False, 'error': 'Error making prediction', 'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')}), 500
        
        # Return response
        response = {
            'success': True,
            'filename': image_data['filename'],
            'prediction_type': 'image_issue_detection',
            **prediction,
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        logger.info(f"Image prediction: {prediction['predicted_class']} ({prediction['confidence']:.1%})")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in issue prediction endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 500

@app.route('/predict/issue-base64', methods=['POST'])
def predict_issue_base64():
    """Issue detection with base64 input"""
    
    if not issue_model_loaded:
        return jsonify({
            'success': False,
            'error': 'Issue detection model not loaded',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 500
    
    try:
        # Process image input
        data = request.get_json()
        image_data, error = process_image_input(data, is_file_upload=False)
        if error:
            return jsonify({
                'success': False,
                'error': error,
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 400
        
        pil_image = image_data['image']
        prediction = None
        
        if gemini_configured:
            try:
                model = genai.GenerativeModel('gemini-1.5-flash')
                prompt = 'Does this image clearly show a civic issue such as garbage, overflowing bins, a pothole, broken streetlight, or illegal dumping? Reply with a JSON object exactly like this, nothing else: {"is_issue": true, "predicted_class": "issue", "confidence": 0.95}'
                response = model.generate_content([prompt, pil_image])
                
                text = response.text.strip()
                if text.startswith('```json'):
                    text = text[7:-3]
                elif text.startswith('```'):
                    text = text[3:-3]
                
                prediction = json.loads(text)
                if 'probabilities' not in prediction:
                    prediction['probabilities'] = {'issue': prediction['confidence'] if prediction['is_issue'] else 1.0 - prediction['confidence'], 'no_issue': 1.0 - prediction['confidence'] if prediction['is_issue'] else prediction['confidence']}
            except Exception as e:
                logger.error(f"Gemini API error or JSON parse error: {str(e)}")
        
        if prediction is None:
            # Fallback to TFLite Model
            img_batch = preprocess_image_for_issue(pil_image)
            if img_batch is None:
                return jsonify({'success': False, 'error': 'Error preprocessing image', 'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')}), 400
            prediction = predict_issue(img_batch)
            
        if prediction is None:
            return jsonify({'success': False, 'error': 'Error making prediction', 'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')}), 500
        
        return jsonify({
            'success': True,
            'prediction_type': 'image_issue_detection_base64',
            **prediction,
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
        
    except Exception as e:
        logger.error(f"Error in issue base64 endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 500

@app.route('/predict/video', methods=['POST'])
def predict_video_endpoint():
    """Video issue detection endpoint"""
    
    if not issue_model_loaded:
        return jsonify({
            'success': False,
            'error': 'Issue detection model not loaded',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 500
    
    temp_path = None
    
    try:
        # Process video input
        video_data, error = process_video_input(request)
        if error:
            return jsonify({
                'success': False,
                'error': error,
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 400
        
        temp_path = video_data['temp_path']
        filename = video_data['filename']
        
        logger.info(f"Processing video: {filename}")
        
        # Extract frames from video
        frames, error = extract_video_frames(temp_path)
        if error:
            return jsonify({
                'success': False,
                'error': error,
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 400
        
        # Analyze frames
        analysis_result, error = analyze_video_frames(frames)
        if error:
            return jsonify({
                'success': False,
                'error': error,
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 400
        
        # Prepare response
        response = {
            'success': True,
            'filename': filename,
            'prediction_type': 'video_issue_detection',
            **analysis_result,
            'processing_config': {
                'sample_rate': VIDEO_SAMPLE_RATE,
                'issue_threshold_percent': ISSUE_THRESHOLD * 100
            },
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        logger.info(f"Video analysis complete: {analysis_result['overall_result']['predicted_class']}")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in video prediction endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 500
        
    finally:
        # Clean up temporary file
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
                logger.info("Temporary video file cleaned up")
            except Exception as e:
                logger.warning(f"Could not clean up temp file: {str(e)}")

@app.route('/predict/video-with-images', methods=['POST'])
def predict_video_with_images_endpoint():
    """Video issue detection endpoint with frame images included"""
    
    if not issue_model_loaded:
        return jsonify({
            'success': False,
            'error': 'Issue detection model not loaded',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 500
    
    temp_path = None
    
    try:
        # Process video input
        video_data, error = process_video_input(request)
        if error:
            return jsonify({
                'success': False,
                'error': error,
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 400
        
        temp_path = video_data['temp_path']
        filename = video_data['filename']
        
        logger.info(f"Processing video with images: {filename}")
        
        # Extract frames from video
        frames, error = extract_video_frames(temp_path)
        if error:
            return jsonify({
                'success': False,
                'error': error,
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 400
        
        # Analyze frames with images included
        analysis_result, error = analyze_video_frames(frames, include_images=True)
        if error:
            return jsonify({
                'success': False,
                'error': error,
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 400
        
        # Prepare response
        response = {
            'success': True,
            'filename': filename,
            'prediction_type': 'video_issue_detection_with_images',
            **analysis_result,
            'processing_config': {
                'sample_rate': VIDEO_SAMPLE_RATE,
                'issue_threshold_percent': ISSUE_THRESHOLD * 100,
                'images_included': True
            },
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        logger.info(f"Video analysis with images complete: {analysis_result['overall_result']['predicted_class']}")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in video with images prediction endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 500
        
    finally:
        # Clean up temporary file
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
                logger.info("Temporary video file cleaned up")
            except Exception as e:
                logger.warning(f"Could not clean up temp file: {str(e)}")

@app.route('/predict/combined', methods=['POST'])
def predict_combined_endpoint():
    """Combined analysis endpoint for multiple images and videos"""
    
    if not issue_model_loaded:
        return jsonify({
            'success': False,
            'error': 'Issue detection model not loaded',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 500
    
    temp_paths = []
    
    try:
        # Process combined input
        combined_data, error = process_combined_input(request)
        if error:
            return jsonify({
                'success': False,
                'error': error,
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 400
        
        if not combined_data['images'] and not combined_data['videos']:
            return jsonify({
                'success': False,
                'error': 'No valid images or videos provided',
                'errors': combined_data['errors'],
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 400
        
        results = {
            'image_results': [],
            'video_results': [],
            'summary': {
                'total_images_processed': 0,
                'total_videos_processed': 0,
                'images_with_issues': 0,
                'videos_with_issues': 0,
                'overall_issue_detected': False
            },
            'processing_errors': combined_data['errors']
        }
        
        logger.info(f"Processing combined request: {len(combined_data['images'])} images, {len(combined_data['videos'])} videos")
        
        # Process images
        for img_data in combined_data['images']:
            try:
                # Preprocess image
                img_batch = preprocess_image_for_issue(img_data['image'])
                if img_batch is None:
                    results['processing_errors'].append(f"Error preprocessing image: {img_data['filename']}")
                    continue
                
                # Make prediction
                prediction = predict_issue(img_batch)
                if prediction is None:
                    results['processing_errors'].append(f"Error predicting image: {img_data['filename']}")
                    continue
                
                image_result = {
                    'filename': img_data['filename'],
                    'index': img_data['index'],
                    'type': 'image',
                    **prediction
                }
                
                results['image_results'].append(image_result)
                results['summary']['total_images_processed'] += 1
                
                if prediction['is_issue']:
                    results['summary']['images_with_issues'] += 1
                
                logger.info(f"Image {img_data['filename']}: {prediction['predicted_class']} ({prediction['confidence']:.1%})")
                
            except Exception as e:
                results['processing_errors'].append(f"Error processing image {img_data['filename']}: {str(e)}")
        
        # Process videos
        for vid_data in combined_data['videos']:
            temp_paths.append(vid_data['temp_path'])
            
            try:
                # Extract frames from video
                frames, error = extract_video_frames(vid_data['temp_path'])
                if error:
                    results['processing_errors'].append(f"Error extracting frames from {vid_data['filename']}: {error}")
                    continue
                
                # Analyze frames
                analysis_result, error = analyze_video_frames(frames)
                if error:
                    results['processing_errors'].append(f"Error analyzing video {vid_data['filename']}: {error}")
                    continue
                
                video_result = {
                    'filename': vid_data['filename'],
                    'index': vid_data['index'],
                    'type': 'video',
                    **analysis_result
                }
                
                results['video_results'].append(video_result)
                results['summary']['total_videos_processed'] += 1
                
                if analysis_result['overall_result']['is_issue']:
                    results['summary']['videos_with_issues'] += 1
                
                logger.info(f"Video {vid_data['filename']}: {analysis_result['overall_result']['predicted_class']}")
                
            except Exception as e:
                results['processing_errors'].append(f"Error processing video {vid_data['filename']}: {str(e)}")
        
        # Calculate overall summary
        total_issues = results['summary']['images_with_issues'] + results['summary']['videos_with_issues']
        total_files = results['summary']['total_images_processed'] + results['summary']['total_videos_processed']
        
        results['summary']['overall_issue_detected'] = total_issues > 0
        results['summary']['total_files_processed'] = total_files
        results['summary']['files_with_issues'] = total_issues
        results['summary']['issue_percentage'] = round((total_issues / total_files * 100), 2) if total_files > 0 else 0
        
        # Prepare final response
        response = {
            'success': True,
            'prediction_type': 'combined_analysis',
            **results,
            'processing_config': {
                'video_sample_rate': VIDEO_SAMPLE_RATE,
                'issue_threshold_percent': ISSUE_THRESHOLD * 100,
                'supported_image_formats': list(SUPPORTED_IMAGE_FORMATS),
                'supported_video_formats': list(SUPPORTED_VIDEO_FORMATS)
            },
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        logger.info(f"Combined analysis complete: {total_issues}/{total_files} files with issues ({results['summary']['issue_percentage']}%)")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in combined prediction endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 500
        
    finally:
        # Clean up temporary files
        for temp_path in temp_paths:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                    logger.info(f"Temporary file cleaned up: {temp_path}")
                except Exception as e:
                    logger.warning(f"Could not clean up temp file {temp_path}: {str(e)}")

# ================================================================================
# ERROR HANDLERS
# ================================================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found',
        'available_endpoints': [
            'GET /',
            'GET /status',
            'POST /predict/issue',
            'POST /predict/issue-base64',
            'POST /predict/video',
            'POST /predict/video-with-images',
            'POST /predict/combined'
        ],
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error',
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }), 500

@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({
        'success': False,
        'error': f'File too large. Maximum size is {MAX_VIDEO_SIZE // (1024 * 1024)}MB for videos, {MAX_IMAGE_SIZE // (1024 * 1024)}MB for images.',
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }), 413

# ================================================================================
# MAIN FUNCTION
# ================================================================================

if __name__ == '__main__':
    # Set maximum file size (use video size limit as it's larger)
    app.config['MAX_CONTENT_LENGTH'] = MAX_VIDEO_SIZE
    
    print("🚀 ENHANCED CIVIC ISSUE DETECTION API")
    print("=" * 70)
    
    # Display model status
    print("📊 MODEL STATUS:")
    if issue_model_loaded:
        print("  ✅ Issue Detection Model: Loaded")
        print(f"     Classes: {', '.join(ISSUE_CLASS_NAMES)}")
    else:
        print("  ❌ Issue Detection Model: Not Loaded")
        print("     Please ensure model files exist:")
        print("     - civic_issue_classifier.tflite")
        print("     - best_civic_model.h5")
    
    print("\n⚙️  CONFIGURATION:")
    print(f"  • Video Sample Rate: {VIDEO_SAMPLE_RATE} frame(s) per second")
    print(f"  • Issue Threshold: {ISSUE_THRESHOLD * 100}% of frames must show issues")
    print(f"  • Supported Image Formats: {', '.join(SUPPORTED_IMAGE_FORMATS)}")
    print(f"  • Supported Video Formats: {', '.join(SUPPORTED_VIDEO_FORMATS)}")
    print(f"  • Max Image Size: {MAX_IMAGE_SIZE // (1024 * 1024)}MB")
    print(f"  • Max Video Size: {MAX_VIDEO_SIZE // (1024 * 1024)}MB")
    
    print("\n🌐 STARTING SERVER...")
    print("📱 API Documentation: http://localhost:1200")
    print("📊 Status Check: http://localhost:1200/status")
    print("\n🔗 AVAILABLE ENDPOINTS:")
    print("  • POST /predict/issue              - Detect civic issues in images (file upload)")
    print("  • POST /predict/issue-base64       - Detect civic issues in images (base64)")
    print("  • POST /predict/video              - Detect civic issues in videos 🆕")
    print("  • POST /predict/video-with-images  - Video analysis with frame images 🆕")
    print("  • POST /predict/combined           - Analyze multiple images and videos 🆕")
    
    if issue_model_loaded:
        print("\n⭐ Server ready! Enhanced API with image, video, and combined processing.")
    else:
        print("\n⚠️  Warning: Issue detection model not loaded. Please check model files.")
    
    print("=" * 70)
    
    # Run the Flask app
    app.run(
        host='0.0.0.0',  # Allow external connections
        port=1200,       # Port number
        debug=True       # Enable debug mode (remove in production)
    )