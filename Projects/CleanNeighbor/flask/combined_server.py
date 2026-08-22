from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import base64
import io
import os
from datetime import datetime
import logging
from google import genai
from google.genai import types
from pydantic import BaseModel

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Gemini
gemini_api_key = os.environ.get("GEMINI_API_KEY")
gemini_configured = False
gemini_client = None
if gemini_api_key:
    gemini_client = genai.Client(api_key=gemini_api_key)
    gemini_configured = True
    logger.info("✅ Gemini API configured successfully (Secure Mode)")
else:
    logger.error("❌ GEMINI_API_KEY not found! Server requires Gemini to run.")

SUPPORTED_IMAGE_FORMATS = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}

def process_image_input(request_data, is_file_upload=True):
    try:
        if is_file_upload:
            if 'image' not in request.files:
                return None, 'No image file provided'
            file = request.files['image']
            if file.filename == '':
                return None, 'No image file selected'
            if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in SUPPORTED_IMAGE_FORMATS):
                return None, f'Invalid file type. Allowed: {", ".join(SUPPORTED_IMAGE_FORMATS)}'
            image = Image.open(file.stream)
            filename = file.filename
        else:
            if not request_data or 'image' not in request_data:
                return None, 'No base64 image data provided'
            image_base64 = request_data['image']
            if ',' in image_base64:
                image_base64 = image_base64.split(',')[1]
            image_data = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_data))
            filename = 'base64_image'
        return {'image': image, 'filename': filename}, None
    except Exception as e:
        return None, f"Error processing image: {str(e)}"

# === Gemini Security & Structure Setup ===
class IssuePrediction(BaseModel):
    is_issue: bool
    predicted_class: str 
    confidence: float
    severity_score: int
    disposal_tutorial: str 

SYSTEM_INSTRUCTION = """
You are a strict waste management classifier for the 'Shuchithvam' platform.
Your job is to analyze images uploaded by citizens and determine if they contain a valid WASTE MANAGEMENT issue (like garbage dumping, littering, overflowing bins, uncollected trash, etc.).

If the image is completely clean, irrelevant (e.g., a selfie, food, random object, inside a house), or DOES NOT CONTAIN GARBAGE/WASTE, you MUST classify it as NOT an issue (is_issue = false).
Even if it's another civic issue like a pothole, classify it as false. We ONLY want waste/garbage.
Valid categories: "cardboard", "e-waste", "glass", "metal", "paper", "plastic", "trash", "clean".

You must also provide a 'severity_score' integer from 1 to 100 based on how severe, large, or harmful the waste is (1 = tiny piece of litter, 100 = massive hazardous dump). If it is not an issue, set severity_score to 0.

Strictly return the JSON output as requested.
"""

SAFETY_SETTINGS = [
    types.SafetySetting(
        category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    ),
    types.SafetySetting(
        category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    ),
    types.SafetySetting(
        category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    ),
    types.SafetySetting(
        category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    ),
]
# ========================================

def run_gemini_inference(image):
    response = gemini_client.models.generate_content(
        model='gemini-3.6-flash',
        contents=["Analyze this image and return the required JSON strictly matching the schema.", image],
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            response_schema=IssuePrediction,
            safety_settings=SAFETY_SETTINGS
        )
    )
    
    if not response.candidates:
        raise Exception("blocked by safety filters")
        
    candidate = response.candidates[0]
    if candidate.finish_reason and "SAFETY" in str(candidate.finish_reason).upper():
        raise Exception("blocked by safety filters")
        
    if not response.text:
        raise Exception("blocked by safety filters")
        
    import json
    try:
        return json.loads(response.text)
    except Exception as e:
        raise Exception(f"Failed to parse JSON: {str(e)}")

@app.route('/predict/issue', methods=['POST'])
def predict_issue_endpoint():
    if not gemini_configured:
        return jsonify({'success': False, 'error': 'Gemini API not configured'}), 500
    
    try:
        image_data, error = process_image_input(request, is_file_upload=True)
        if error:
            return jsonify({'success': False, 'error': error}), 400
            
        prediction = run_gemini_inference(image_data['image'])
        
        return jsonify({
            'success': True,
            'prediction_type': 'image_issue_detection',
            'is_issue': prediction.get('is_issue', False),
            'predicted_class': prediction.get('predicted_class', 'clean'),
            'confidence': float(prediction.get('confidence', 0.0)),
            'severity_score': int(prediction.get('severity_score', 0)),
            'disposal_tutorial': prediction.get('disposal_tutorial', ''),
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
    except Exception as e:
        logger.error(f"Prediction Error: {str(e)}")
        error_msg = str(e).lower()
        if "safety" in error_msg or "blocked" in error_msg or "stopcandidate" in error_msg:
            return jsonify({
                'success': True,
                'prediction_type': 'image_issue_detection',
                'is_issue': False,
                'predicted_class': 'blocked',
                'confidence': 1.0,
                'disposal_tutorial': 'Content blocked by safety filters.',
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            })
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/predict/issue-base64', methods=['POST'])
def predict_issue_base64():
    if not gemini_configured:
        return jsonify({'success': False, 'error': 'Gemini API not configured'}), 500
        
    try:
        data = request.get_json()
        image_data, error = process_image_input(data, is_file_upload=False)
        if error:
            return jsonify({'success': False, 'error': error}), 400
            
        prediction = run_gemini_inference(image_data['image'])
        
        return jsonify({
            'success': True,
            'prediction_type': 'image_issue_detection_base64',
            'is_issue': prediction.get('is_issue', False),
            'predicted_class': prediction.get('predicted_class', 'clean'),
            'confidence': float(prediction.get('confidence', 0.0)),
            'severity_score': int(prediction.get('severity_score', 0)),
            'disposal_tutorial': prediction.get('disposal_tutorial', ''),
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
    except Exception as e:
        logger.error(f"Prediction Error: {str(e)}")
        error_msg = str(e).lower()
        if "safety" in error_msg or "blocked" in error_msg or "stopcandidate" in error_msg:
            # We must return HTTP 200 with success=False, or HTTP 400 with a specific error so the frontend catches it easily
            return jsonify({
                'success': False,
                'error': 'blocked by safety filters',
                'prediction_type': 'image_issue_detection_base64',
                'is_issue': False,
                'predicted_class': 'blocked',
                'confidence': 1.0,
                'disposal_tutorial': 'Content blocked by safety filters.'
            }), 400
        return jsonify({'success': False, 'error': str(e)}), 500

CHAT_SYSTEM_INSTRUCTION = """
You are 'Shuchithvam Assistant', a helpful, friendly, and knowledgeable civic assistant.
Your goal is to help citizens understand waste management policies, how to report issues, and how to use the Shuchithvam platform.
- Keep your answers concise and practical.
- Be polite and encouraging.
- Do not provide information outside of civic issues, waste management, or the Shuchithvam app.
"""

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    if not gemini_configured:
        return jsonify({'success': False, 'error': 'Gemini API not configured'}), 500
        
    try:
        data = request.get_json()
        if not data or 'messages' not in data:
            return jsonify({'success': False, 'error': 'No messages provided'}), 400
            
        messages = data['messages']
        
        # Convert frontend messages to Gemini format
        formatted_contents = []
        for msg in messages:
            role = "user" if msg.get("role") == "user" else "model"
            formatted_contents.append(
                types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=msg.get("content", ""))]
                )
            )
            
        response = gemini_client.models.generate_content(
            model='gemini-3.6-flash',
            contents=formatted_contents,
            config=types.GenerateContentConfig(
                system_instruction=CHAT_SYSTEM_INSTRUCTION,
                safety_settings=SAFETY_SETTINGS
            )
        )
        
        if not response.text:
            return jsonify({'success': False, 'error': 'Blocked by safety filters'}), 400
            
        return jsonify({
            'success': True,
            'reply': response.text,
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
    except Exception as e:
        logger.error(f"Chat Error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/status')
@app.route('/')
def status():
    return jsonify({
        'status': 'online',
        'server': 'Shuchithvam Gemini Secure Server',
        'gemini_configured': gemini_configured,
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
