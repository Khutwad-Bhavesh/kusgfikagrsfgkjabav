from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import base64
import io
import os
from datetime import datetime
import logging
import google.generativeai as genai
import json

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Gemini
gemini_api_key = os.environ.get("GEMINI_API_KEY")
gemini_configured = False
if gemini_api_key:
    genai.configure(api_key=gemini_api_key)
    gemini_configured = True
    logger.info("✅ Gemini API configured successfully (Lightweight Mode)")
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

@app.route('/predict/issue', methods=['POST'])
def predict_issue_endpoint():
    if not gemini_configured:
        return jsonify({'success': False, 'error': 'Gemini API not configured'}), 500
    
    try:
        image_data, error = process_image_input(request, is_file_upload=True)
        if error:
            return jsonify({'success': False, 'error': error}), 400
            
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = 'Does this image clearly show a civic issue such as garbage, overflowing bins, a pothole, broken streetlight, or illegal dumping? Reply with a JSON object exactly like this, nothing else: {"is_issue": true, "predicted_class": "issue", "confidence": 0.95}'
        response = model.generate_content([prompt, image_data['image']])
        
        text = response.text.strip()
        if text.startswith('```json'): text = text[7:-3]
        elif text.startswith('```'): text = text[3:-3]
        
        prediction = json.loads(text)
        
        return jsonify({
            'success': True,
            'prediction_type': 'image_issue_detection',
            'is_issue': prediction.get('is_issue', False),
            'predicted_class': prediction.get('predicted_class', 'no_issue'),
            'confidence': float(prediction.get('confidence', 0.0)),
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
    except Exception as e:
        logger.error(f"Prediction Error: {str(e)}")
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
            
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = 'Does this image clearly show a civic issue such as garbage, overflowing bins, a pothole, broken streetlight, or illegal dumping? Reply with a JSON object exactly like this, nothing else: {"is_issue": true, "predicted_class": "issue", "confidence": 0.95}'
        response = model.generate_content([prompt, image_data['image']])
        
        text = response.text.strip()
        if text.startswith('```json'): text = text[7:-3]
        elif text.startswith('```'): text = text[3:-3]
        
        prediction = json.loads(text)
        
        return jsonify({
            'success': True,
            'prediction_type': 'image_issue_detection_base64',
            'is_issue': prediction.get('is_issue', False),
            'predicted_class': prediction.get('predicted_class', 'no_issue'),
            'confidence': float(prediction.get('confidence', 0.0)),
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
    except Exception as e:
        logger.error(f"Prediction Error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/status')
@app.route('/')
def status():
    return jsonify({
        'status': 'online',
        'server': 'Shuchithvam Gemini Lightweight Server',
        'gemini_configured': gemini_configured,
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
