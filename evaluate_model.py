"""
DermAI Model Evaluation Script
Generates confusion matrix, precision, recall, F1 scores, and accuracy

REQUIREMENTS:
1. HAM10000 test images (not used in training)
2. Ground truth labels for each test image
3. Images should be organized by class or have a CSV with labels

INSTRUCTIONS:
1. Place your test images in a directory structure like:
   test_data/
       akiec/
           image1.jpg
           image2.jpg
       bcc/
           image1.jpg
       ...etc

OR

2. Provide a CSV file with format:
   image_path,true_label
   test_data/image1.jpg,akiec
   test_data/image2.jpg,bcc
"""

import os
import json
import numpy as np
import tensorflow as tf
from PIL import Image
from tensorflow.keras.applications.efficientnet import preprocess_input
from sklearn.metrics import confusion_matrix, classification_report, accuracy_score
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
import pandas as pd

# Configuration
MODEL_PATH = 'backend/best_model.keras'
CLASS_NAMES_PATH = 'backend/class_names.json'
TEST_DATA_DIR = 'test_data'  # Change this to your test data directory
OUTPUT_DIR = 'evaluation_results'
CSV_LABELS_FILE = None  # Set to path if using CSV file instead of directory structure

# Create output directory
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("="*80)
print("DERMAI MODEL EVALUATION")
print("="*80)

# Load model
print(f"\nLoading model from: {MODEL_PATH}")
model = tf.keras.models.load_model(MODEL_PATH)
print(f"Model loaded successfully")
print(f"Input shape: {model.input_shape}")
print(f"Output shape: {model.output_shape}")

# Load class names
with open(CLASS_NAMES_PATH, 'r') as f:
    class_names = json.load(f)

print(f"\nClass names: {class_names}")
print(f"Number of classes: {len(class_names)}")

def preprocess_image(image_path):
    """Preprocess image for EfficientNetB0"""
    image = Image.open(image_path)
    if image.mode != 'RGB':
        image = image.convert('RGB')
    image = image.resize((224, 224))
    image_array = np.array(image, dtype=np.float32)
    image_array = preprocess_input(image_array)
    image_array = np.expand_dims(image_array, axis=0)
    return image_array

def load_test_images_from_directory():
    """Load test images from directory structure"""
    images = []
    true_labels = []

    for class_name in class_names:
        class_dir = os.path.join(TEST_DATA_DIR, class_name)
        if not os.path.exists(class_dir):
            print(f"Warning: Directory not found: {class_dir}")
            continue

        for image_file in os.listdir(class_dir):
            if image_file.lower().endswith(('.jpg', '.jpeg', '.png')):
                image_path = os.path.join(class_dir, image_file)
                images.append(image_path)
                true_labels.append(class_name)

    return images, true_labels

def load_test_images_from_csv():
    """Load test images from CSV file"""
    df = pd.read_csv(CSV_LABELS_FILE)
    images = df['image_path'].tolist()
    true_labels = df['true_label'].tolist()
    return images, true_labels

# Load test images
print(f"\nLoading test images...")

if CSV_LABELS_FILE and os.path.exists(CSV_LABELS_FILE):
    print(f"Using CSV file: {CSV_LABELS_FILE}")
    test_images, true_labels = load_test_images_from_csv()
elif os.path.exists(TEST_DATA_DIR):
    print(f"Using directory structure: {TEST_DATA_DIR}")
    test_images, true_labels = load_test_images_from_directory()
else:
    print(f"\nERROR: No test data found!")
    print(f"Expected directory: {TEST_DATA_DIR}")
    print(f"Or CSV file: {CSV_LABELS_FILE}")
    print("\nPlease organize your test data as described in the script header.")
    exit(1)

print(f"Found {len(test_images)} test images")

if len(test_images) == 0:
    print("\nERROR: No test images found!")
    print("Please add test images to the test_data directory or provide a CSV file.")
    exit(1)

# Make predictions
print(f"\nRunning predictions...")
predicted_labels = []
all_probabilities = []

for i, image_path in enumerate(test_images):
    if (i + 1) % 10 == 0:
        print(f"Processing {i+1}/{len(test_images)}...")

    try:
        processed_image = preprocess_image(image_path)
        predictions = model.predict(processed_image, verbose=0)
        predicted_idx = np.argmax(predictions[0])
        predicted_class = class_names[predicted_idx]
        predicted_labels.append(predicted_class)
        all_probabilities.append(predictions[0])
    except Exception as e:
        print(f"Error processing {image_path}: {e}")
        predicted_labels.append('error')
        all_probabilities.append(np.zeros(len(class_names)))

# Calculate metrics
print(f"\nCalculating metrics...")

# Remove any errors
valid_indices = [i for i, label in enumerate(predicted_labels) if label != 'error']
true_labels_valid = [true_labels[i] for i in valid_indices]
predicted_labels_valid = [predicted_labels[i] for i in valid_indices]

# Accuracy
accuracy = accuracy_score(true_labels_valid, predicted_labels_valid)
print(f"\nOverall Accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")

# Confusion Matrix
cm = confusion_matrix(true_labels_valid, predicted_labels_valid, labels=class_names)

# Classification Report (precision, recall, F1)
report = classification_report(true_labels_valid, predicted_labels_valid,
                            labels=class_names, target_names=class_names,
                            output_dict=True)

print("\n" + "="*80)
print("CLASSIFICATION REPORT")
print("="*80)
print(classification_report(true_labels_valid, predicted_labels_valid,
                          labels=class_names, target_names=class_names))

# Save confusion matrix as heatmap
plt.figure(figsize=(10, 8))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=class_names, yticklabels=class_names)
plt.title('Confusion Matrix - DermAI Skin Lesion Classification')
plt.xlabel('Predicted Label')
plt.ylabel('True Label')
plt.tight_layout()
confusion_matrix_path = os.path.join(OUTPUT_DIR, 'confusion_matrix.png')
plt.savefig(confusion_matrix_path, dpi=300, bbox_inches='tight')
print(f"\nConfusion matrix saved to: {confusion_matrix_path}")
plt.close()

# Save metrics to file
metrics_file = os.path.join(OUTPUT_DIR, 'metrics.txt')
with open(metrics_file, 'w') as f:
    f.write("="*80 + "\n")
    f.write("DERMAI MODEL EVALUATION METRICS\n")
    f.write("="*80 + "\n\n")
    f.write(f"Overall Accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)\n\n")
    f.write("Per-Class Metrics:\n")
    f.write("-"*80 + "\n")
    f.write(f"{'Class':<15} {'Precision':<12} {'Recall':<12} {'F1-Score':<12} {'Support':<10}\n")
    f.write("-"*80 + "\n")

    for class_name in class_names:
        if class_name in report:
            metrics = report[class_name]
            f.write(f"{class_name:<15} {metrics['precision']:<12.4f} "
                   f"{metrics['recall']:<12.4f} {metrics['f1-score']:<12.4f} "
                   f"{int(metrics['support']):<10}\n")

    f.write("-"*80 + "\n")
    f.write("\nConfusion Matrix:\n")
    f.write("-"*80 + "\n")
    f.write("     " + " ".join(f"{name:>8}" for name in class_names) + "\n")
    for i, row in enumerate(cm):
        f.write(f"{class_names[i]:<5}" + " ".join(f"{val:>8}" for val in row) + "\n")

print(f"Metrics saved to: {metrics_file}")

# Save detailed results to CSV
results_df = pd.DataFrame({
    'image_path': [test_images[i] for i in valid_indices],
    'true_label': true_labels_valid,
    'predicted_label': predicted_labels_valid,
    'correct': [1 if t == p else 0 for t, p in zip(true_labels_valid, predicted_labels_valid)]
})

for idx, class_name in enumerate(class_names):
    results_df[f'prob_{class_name}'] = [all_probabilities[i][idx] for i in valid_indices]

results_csv = os.path.join(OUTPUT_DIR, 'detailed_results.csv')
results_df.to_csv(results_csv, index=False)
print(f"Detailed results saved to: {results_csv}")

print("\n" + "="*80)
print("EVALUATION COMPLETE")
print("="*80)
print(f"\nAll results saved to: {os.path.abspath(OUTPUT_DIR)}")
print(f"  - confusion_matrix.png")
print(f"  - metrics.txt")
print(f"  - detailed_results.csv")
