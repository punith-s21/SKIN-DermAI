# DermAI - Skin Lesion Classification System

A web application for classifying skin lesions using deep learning. Built with Flask (backend) and vanilla JavaScript/CSS (frontend).

## Project Structure

```
DermAI/
├── backend/
│   ├── app.py              # Flask API server
│   ├── best_model.keras    # Trained model (17.1 MB)
│   ├── class_names.json    # Class definitions
│   └── requirements.txt     # Python dependencies
└── frontend/
    ├── index.html          # Main HTML file
    ├── styles.css          # Styling
    └── script.js           # Frontend logic
```

## Model Classes

The model classifies skin lesions into 7 categories (HAM10000 dataset):
- **akiec**: Actinic keratoses
- **bcc**: Basal cell carcinoma
- **bkl**: Benign keratosis
- **df**: Dermatofibroma
- **mel**: Melanoma
- **nv**: Melanocytic nevi
- **vasc**: Vascular lesions

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
```

3. Activate the virtual environment:
- Windows: `venv\Scripts\activate`
- Linux/Mac: `source venv/bin/activate`

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Run the Flask server:
```bash
python app.py
```

The backend will start on `http://localhost:5000`

### Frontend Setup

The frontend is built with vanilla HTML/CSS/JavaScript and doesn't require a build process.

#### Option 1: Using Python's built-in server
```bash
cd frontend
python -m http.server 3000
```

#### Option 2: Using Node.js http-server (if you have Node.js installed)
```bash
cd frontend
npx http-server -p 3000
```

#### Option 3: Opening directly
Simply open `frontend/index.html` in your browser (note: CORS may require a local server)

## Usage

1. Start the backend server (follow Backend Setup steps)
2. Start the frontend server (follow Frontend Setup steps)
3. Open your browser to `http://localhost:3000`
4. Upload an image of a skin lesion
5. Click "Analyze" to get the classification result
6. View the predicted class (with full descriptive name), confidence score, and all class probabilities

## Image Validation

The application performs the following validation checks on uploaded images:
- **File type**: Must be a valid image (JPG, PNG, JPEG)
- **File size**: Maximum 10MB
- **Resolution**: Between 100x100 and 4000x4000 pixels

**Important Limitation**: The system does NOT detect whether an image contains skin. It only validates file properties. Please upload only skin lesion images for meaningful results. Uploading unrelated images (cats, dogs, objects, landscapes) will still be processed by the model but will produce meaningless predictions.

## API Endpoints

### POST /predict
Upload an image for classification.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: image file (form field name: "image")

**Response:**
```json
{
  "prediction": "mel",
  "confidence": 0.95,
  "all_probabilities": [
    {"class": "mel", "probability": 0.95},
    {"class": "bcc", "probability": 0.03},
    ...
  ]
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true
}
```

## Important Disclaimer

⚠️ **This application is for educational purposes only.** 
The predictions provided by this system should not be used for medical diagnosis. Always consult a qualified dermatologist for proper diagnosis and treatment of skin conditions.

## Troubleshooting

### Backend not starting
- Ensure Python 3.8+ is installed
- Check that all dependencies are installed: `pip install -r requirements.txt`
- Verify that `best_model.keras` and `class_names.json` are in the backend directory

### Frontend can't connect to backend
- Ensure the Flask server is running on port 5000
- Check browser console for CORS errors
- Try using a local server for the frontend instead of opening the HTML file directly

### Model prediction errors
- Ensure the uploaded image is a valid image file (JPG, PNG, JPEG)
- Check that the model file is not corrupted
- Verify TensorFlow version compatibility

## Customization

### Changing the model input size
Edit the `preprocess_image` function in `backend/app.py` if your model expects a different input size.

### Adding more classes
Update `class_names.json` with your new class names and retrain your model.

### Styling
Modify `frontend/styles.css` to customize the appearance.
