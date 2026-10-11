from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
from PIL import Image
import json
import io
import logging
import os
from tensorflow.keras.applications.efficientnet import preprocess_input

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Get absolute paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'best_model.keras')
CLASS_NAMES_PATH = os.path.join(BASE_DIR, 'class_names.json')
PRECAUTIONS_PATH = os.path.join(BASE_DIR, 'disease_precautions.json')

# Load model and class names
logger.info("="*80)
logger.info("DERMAI DIAGNOSTIC INFORMATION")
logger.info("="*80)
logger.info(f"Working directory: {BASE_DIR}")
logger.info(f"Model file path: {MODEL_PATH}")
logger.info(f"Model file exists: {os.path.exists(MODEL_PATH)}")
logger.info(f"Model file size: {os.path.getsize(MODEL_PATH) / (1024*1024):.2f} MB")
logger.info(f"Class names file path: {CLASS_NAMES_PATH}")
logger.info(f"Class names file exists: {os.path.exists(CLASS_NAMES_PATH)}")
logger.info("")
logger.info("Loading model...")
model = tf.keras.models.load_model(MODEL_PATH)
logger.info("Model loaded successfully")
logger.info(f"Model input shape: {model.input_shape}")
logger.info(f"Model output shape: {model.output_shape}")
logger.info(f"Model number of layers: {len(model.layers)}")

with open(CLASS_NAMES_PATH, 'r') as f:
    class_names = json.load(f)

# Load disease precautions
with open(PRECAUTIONS_PATH, 'r') as f:
    disease_precautions = json.load(f)

logger.info("")
logger.info("CLASS NAMES AND INDICES:")
for idx, class_name in enumerate(class_names):
    logger.info(f"  Index {idx}: {class_name}")

logger.info("")
logger.info("DISEASE PRECAUTIONS LOADED:")
for class_name in class_names:
    if class_name in disease_precautions:
        logger.info(f"  {class_name}: Precautions available")
    else:
        logger.info(f"  {class_name}: No precautions")
logger.info("="*80)

def preprocess_image(image):
    """Preprocess image for EfficientNetB0 model prediction"""
    # Resize to the expected input size (224x224 for EfficientNetB0)
    image = image.resize((224, 224))
    # Convert to array
    image_array = np.array(image, dtype=np.float32)
    # Apply EfficientNet preprocessing (this handles normalization correctly)
    # preprocess_input expects values in 0-255 range and applies proper normalization
    image_array = preprocess_input(image_array)
    # Add batch dimension
    image_array = np.expand_dims(image_array, axis=0)
    return image_array

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': True,
        'model_path': MODEL_PATH,
        'class_names_path': CLASS_NAMES_PATH,
        'class_names': class_names,
        'model_input_shape': str(model.input_shape),
        'model_output_shape': str(model.output_shape)
    })

@app.route('/diagnostic', methods=['GET'])
def diagnostic():
    """Diagnostic endpoint to show model information"""
    return jsonify({
        'model_path': MODEL_PATH,
        'model_exists': os.path.exists(MODEL_PATH),
        'model_size_mb': os.path.getsize(MODEL_PATH) / (1024*1024) if os.path.exists(MODEL_PATH) else 0,
        'class_names_path': CLASS_NAMES_PATH,
        'class_names_exists': os.path.exists(CLASS_NAMES_PATH),
        'class_names': class_names,
        'class_indices': {name: idx for idx, name in enumerate(class_names)},
        'model_input_shape': str(model.input_shape),
        'model_output_shape': str(model.output_shape),
        'num_classes': len(class_names),
        'preprocessing': 'EfficientNet ImageNet preprocessing (preprocess_input)'
    })

@app.route('/predict', methods=['POST'])
def predict():
    """Predict skin lesion class from uploaded image"""
    logger.info("-" * 80)
    logger.info("NEW PREDICTION REQUEST")
    logger.info("-" * 80)

    try:
        # Check if file is in request
        if 'image' not in request.files:
            logger.error("No image file in request")
            return jsonify({'error': 'No image file provided'}), 400

        file = request.files['image']
        logger.info(f"Received file: {file.filename}, size: {file.content_length} bytes")

        if file.filename == '':
            logger.error("Empty filename")
            return jsonify({'error': 'No file selected'}), 400

        # Read and preprocess image
        image_bytes = file.read()
        logger.info(f"Read {len(image_bytes)} bytes from file")
        image = Image.open(io.BytesIO(image_bytes))
        logger.info(f"Image opened: mode={image.mode}, size={image.size}")

        # Convert to RGB if necessary
        if image.mode != 'RGB':
            logger.info(f"Converting from {image.mode} to RGB")
            image = image.convert('RGB')

        # Preprocess
        processed_image = preprocess_image(image)
        logger.info(f"Processed image shape: {processed_image.shape}, dtype: {processed_image.dtype}")
        logger.info(f"Processed image stats - min: {processed_image.min():.4f}, max: {processed_image.max():.4f}, mean: {processed_image.mean():.4f}")

        # Make prediction
        predictions = model.predict(processed_image, verbose=0)
        logger.info("")
        logger.info("RAW PREDICTION ARRAY (unsorted):")
        for idx, prob in enumerate(predictions[0]):
            logger.info(f"  Index {idx} ({class_names[idx]}): {prob:.6f} ({prob*100:.2f}%)")
        logger.info(f"Prediction sum: {predictions[0].sum():.6f} (should be ~1.0)")

        # Get top prediction
        predicted_class_idx = np.argmax(predictions[0])
        predicted_class = class_names[predicted_class_idx]
        confidence = float(predictions[0][predicted_class_idx])
        logger.info("")
        logger.info(f"FINAL PREDICTION: {predicted_class} (index {predicted_class_idx})")
        logger.info(f"CONFIDENCE: {confidence:.6f} ({confidence*100:.2f}%)")

        # Get all class probabilities
        class_probabilities = []
        for idx, class_name in enumerate(class_names):
            class_probabilities.append({
                'class': class_name,
                'probability': float(predictions[0][idx])
            })

        # Sort by probability
        class_probabilities.sort(key=lambda x: x['probability'], reverse=True)

        logger.info("")
        logger.info("SORTED PROBABILITIES (highest to lowest):")
        for idx, prob in enumerate(class_probabilities):
            logger.info(f"  {idx+1}. {prob['class']}: {prob['probability']:.6f} ({prob['probability']*100:.2f}%)")
        logger.info("-" * 80)

        # Get precautions for predicted class
        precautions = disease_precautions.get(predicted_class, None)
        if precautions:
            logger.info(f"Precautions provided for: {predicted_class}")
        else:
            logger.warning(f"No precautions found for: {predicted_class}")

        return jsonify({
            'prediction': predicted_class,
            'confidence': confidence,
            'all_probabilities': class_probabilities,
            'precautions': precautions
        })

    except Exception as e:
        logger.error(f"Error during prediction: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
