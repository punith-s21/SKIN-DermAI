const API_URL = 'http://localhost:5000';

// Class name mapping (abbreviation to full descriptive name)
const CLASS_NAMES = {
    'akiec': 'Actinic Keratoses',
    'bcc': 'Basal Cell Carcinoma',
    'bkl': 'Benign Keratosis',
    'df': 'Dermatofibroma',
    'mel': 'Melanoma',
    'nv': 'Melanocytic Nevi',
    'vasc': 'Vascular Lesions'
};

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const previewSection = document.getElementById('previewSection');
const imagePreview = document.getElementById('imagePreview');
const clearBtn = document.getElementById('clearBtn');
const predictBtn = document.getElementById('predictBtn');
const resultsSection = document.getElementById('resultsSection');
const loading = document.getElementById('loading');
const predictedClass = document.getElementById('predictedClass');
const predictedClassFull = document.getElementById('predictedClassFull');
const confidence = document.getElementById('confidence');
const probabilitiesList = document.getElementById('probabilitiesList');
const lowConfidenceWarning = document.getElementById('lowConfidenceWarning');
const downloadReportBtn = document.getElementById('downloadReportBtn');
const reportDate = document.getElementById('reportDate');
const reportImage = document.getElementById('reportImage');
const reportPredictedClass = document.getElementById('reportPredictedClass');
const reportPredictedClassFull = document.getElementById('reportPredictedClassFull');
const reportConfidence = document.getElementById('reportConfidence');
const reportProbabilitiesBody = document.getElementById('reportProbabilitiesBody');
const precautionsSection = document.getElementById('precautionsSection');
const diseaseName = document.getElementById('diseaseName');
const diseaseExplanation = document.getElementById('diseaseExplanation');
const generalPrecautions = document.getElementById('generalPrecautions');
const skinCare = document.getElementById('skinCare');
const avoidList = document.getElementById('avoidList');
const warningSigns = document.getElementById('warningSigns');
const urgencyCard = document.getElementById('urgencyCard');
const urgencyText = document.getElementById('urgencyText');
const urgencyIcon = document.getElementById('urgencyIcon');

// Chart instance
let probabilityChart = null;

// Store current prediction data for report
let currentPredictionData = null;

// Event Listeners
uploadArea.addEventListener('click', () => imageInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        handleImage(file);
    }
});

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleImage(file);
    }
});

clearBtn.addEventListener('click', clearImage);
predictBtn.addEventListener('click', predict);
downloadReportBtn.addEventListener('click', downloadPDFReport);

let currentFile = null;

function handleImage(file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file (JPG, PNG, JPEG).');
        return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        alert('Image file is too large. Please select an image smaller than 10MB.');
        return;
    }

    // Validate image dimensions
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = function() {
        URL.revokeObjectURL(objectUrl);

        // Check minimum dimensions (100x100)
        if (this.width < 100 || this.height < 100) {
            alert('Image resolution is too low. Please select an image with at least 100x100 pixels.');
            return;
        }

        // Check maximum dimensions (4000x4000 to prevent extremely large images)
        if (this.width > 4000 || this.height > 4000) {
            alert('Image resolution is too high. Please select an image with resolution under 4000x4000 pixels.');
            return;
        }

        // Image is valid, proceed
        currentFile = file;
        const reader = new FileReader();

        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            uploadArea.style.display = 'none';
            previewSection.style.display = 'block';
            resultsSection.style.display = 'none';
        };

        reader.readAsDataURL(file);
    };

    img.onerror = function() {
        URL.revokeObjectURL(objectUrl);
        alert('Failed to load the image. Please select a valid image file.');
    };

    img.src = objectUrl;
}

function clearImage() {
    currentFile = null;
    currentPredictionData = null;
    imageInput.value = '';
    imagePreview.src = '';
    uploadArea.style.display = 'block';
    previewSection.style.display = 'none';
    resultsSection.style.display = 'none';
    precautionsSection.style.display = 'none';

    // Clear chart
    if (probabilityChart) {
        probabilityChart.destroy();
        probabilityChart = null;
    }
}

async function predict() {
    if (!currentFile) {
        alert('Please select an image first');
        return;
    }

    console.log('Starting prediction for file:', currentFile.name, 'size:', currentFile.size, 'type:', currentFile.type);
    loading.style.display = 'block';
    resultsSection.style.display = 'none';

    const formData = new FormData();
    formData.append('image', currentFile);

    try {
        console.log('Sending request to backend...');
        const response = await fetch(`${API_URL}/predict`, {
            method: 'POST',
            body: formData
        });

        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error('Failed to get prediction');
        }

        const data = await response.json();
        console.log('Received prediction data:', data);
        displayResults(data);
    } catch (error) {
        console.error('Error:', error);
        alert('Error analyzing image. Please make sure the backend server is running.');
    } finally {
        loading.style.display = 'none';
    }
}

function displayResults(data) {
    // Store prediction data for report
    currentPredictionData = data;

    predictedClass.textContent = data.prediction.toUpperCase();
    predictedClassFull.textContent = CLASS_NAMES[data.prediction] || data.prediction;
    confidence.textContent = (data.confidence * 100).toFixed(2) + '%';

    // Show low confidence warning if confidence is below 50%
    if (data.confidence < 0.50) {
        lowConfidenceWarning.style.display = 'flex';
    } else {
        lowConfidenceWarning.style.display = 'none';
    }

    // Display all probabilities
    probabilitiesList.innerHTML = '';
    data.all_probabilities.forEach((prob, index) => {
        const probabilityItem = document.createElement('div');
        probabilityItem.className = 'probability-item';

        const className = document.createElement('div');
        className.className = 'class-name';
        className.innerHTML = `
            <span class="class-abbr">${prob.class.toUpperCase()}</span>
            <span class="class-full">${CLASS_NAMES[prob.class] || prob.class}</span>
        `;

        const probabilityBar = document.createElement('div');
        probabilityBar.className = 'probability-bar';

        const probabilityFill = document.createElement('div');
        probabilityFill.className = 'probability-fill';
        probabilityFill.style.width = (prob.probability * 100).toFixed(2) + '%';

        const probabilityValue = document.createElement('span');
        probabilityValue.className = 'probability-value';
        probabilityValue.textContent = (prob.probability * 100).toFixed(2) + '%';

        probabilityBar.appendChild(probabilityFill);
        probabilityItem.appendChild(className);
        probabilityItem.appendChild(probabilityBar);
        probabilityItem.appendChild(probabilityValue);

        probabilitiesList.appendChild(probabilityItem);
    });

    // Display precautions if available
    if (data.precautions) {
        displayPrecautions(data.precautions);
    } else {
        precautionsSection.style.display = 'none';
    }

    // Populate report section
    populateReport(data);

    resultsSection.style.display = 'block';
}

// Check backend health on page load
async function checkBackendHealth() {
    try {
        const response = await fetch(`${API_URL}/health`);
        if (response.ok) {
            console.log('Backend is healthy');
        } else {
            console.warn('Backend may not be running');
        }
    } catch (error) {
        console.warn('Cannot connect to backend. Make sure the Flask server is running.');
    }
}

checkBackendHealth();

function displayPrecautions(precautions) {
    // Show precautions section
    precautionsSection.style.display = 'block';

    // Display disease name and explanation
    diseaseName.textContent = precautions.name;
    diseaseExplanation.textContent = precautions.explanation;

    // Display general precautions
    generalPrecautions.innerHTML = '';
    precautions.general_precautions.forEach(precaution => {
        const li = document.createElement('li');
        li.textContent = precaution;
        generalPrecautions.appendChild(li);
    });

    // Display skin care
    skinCare.innerHTML = '';
    precautions.skin_care.forEach(care => {
        const li = document.createElement('li');
        li.textContent = care;
        skinCare.appendChild(li);
    });

    // Display avoid list
    avoidList.innerHTML = '';
    precautions.avoid.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        avoidList.appendChild(li);
    });

    // Display warning signs
    warningSigns.innerHTML = '';
    precautions.warning_signs.forEach(sign => {
        const li = document.createElement('li');
        li.textContent = sign;
        warningSigns.appendChild(li);
    });

    // Display urgency card
    urgencyText.textContent = precautions.urgency_text;

    // Set urgency card color based on urgency level
    urgencyCard.className = 'urgency-card';
    if (precautions.urgency === 'urgent') {
        urgencyCard.classList.add('urgency-urgent');
        urgencyIcon.textContent = '🚨';
    } else if (precautions.urgency === 'prompt') {
        urgencyCard.classList.add('urgency-prompt');
        urgencyIcon.textContent = '⏰';
    } else {
        urgencyCard.classList.add('urgency-routine');
        urgencyIcon.textContent = '✓';
    }
}

function populateReport(data) {
    // Set report date/time
    const now = new Date();
    reportDate.textContent = now.toLocaleString();

    // Set report image
    reportImage.src = imagePreview.src;

    // Set prediction results
    reportPredictedClass.textContent = data.prediction.toUpperCase();
    reportPredictedClassFull.textContent = CLASS_NAMES[data.prediction] || data.prediction;
    reportConfidence.textContent = (data.confidence * 100).toFixed(2) + '%';

    // Populate probabilities table
    reportProbabilitiesBody.innerHTML = '';
    data.all_probabilities.forEach((prob) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${prob.class.toUpperCase()}</td>
            <td>${CLASS_NAMES[prob.class] || prob.class}</td>
            <td>${(prob.probability * 100).toFixed(2)}%</td>
        `;
        reportProbabilitiesBody.appendChild(row);
    });

    // Render probability chart
    renderProbabilityChart(data);
}

function renderProbabilityChart(data) {
    const ctx = document.getElementById('probabilityChart').getContext('2d');

    // Destroy existing chart if it exists
    if (probabilityChart) {
        probabilityChart.destroy();
    }

    // Prepare data for chart
    const labels = data.all_probabilities.map(p => p.class.toUpperCase());
    const probabilities = data.all_probabilities.map(p => (p.probability * 100).toFixed(2));
    const colors = [
        'rgba(102, 126, 234, 0.8)',
        'rgba(118, 75, 162, 0.8)',
        'rgba(240, 147, 43, 0.8)',
        'rgba(46, 204, 113, 0.8)',
        'rgba(231, 76, 60, 0.8)',
        'rgba(52, 152, 219, 0.8)',
        'rgba(155, 89, 182, 0.8)'
    ];

    probabilityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Probability (%)',
                data: probabilities,
                backgroundColor: colors,
                borderColor: colors.map(c => c.replace('0.8', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Probability (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Class'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Probability: ${context.raw}%`;
                        }
                    }
                }
            }
        }
    });
}

async function downloadPDFReport() {
    if (!currentPredictionData) {
        alert('No prediction data available. Please analyze an image first.');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        // Add title
        pdf.setFontSize(20);
        pdf.setTextColor(102, 126, 234);
        pdf.text('DermAI Analysis Report', 105, 20, { align: 'center' });

        // Add date
        pdf.setFontSize(10);
        pdf.setTextColor(100);
        const now = new Date();
        pdf.text(`Generated: ${now.toLocaleString()}`, 105, 30, { align: 'center' });

        // Add prediction results
        pdf.setFontSize(14);
        pdf.setTextColor(0);
        pdf.text('Prediction Results', 20, 45);

        pdf.setFontSize(11);
        pdf.text(`Predicted Class: ${currentPredictionData.prediction.toUpperCase()}`, 20, 55);
        pdf.text(`Full Label: ${CLASS_NAMES[currentPredictionData.prediction] || currentPredictionData.prediction}`, 20, 62);
        pdf.text(`Confidence Score: ${(currentPredictionData.confidence * 100).toFixed(2)}%`, 20, 69);

        // Add probabilities table
        pdf.setFontSize(14);
        pdf.text('All Class Probabilities', 20, 85);

        pdf.setFontSize(10);
        let yPos = 95;
        pdf.text('Class', 20, yPos);
        pdf.text('Full Name', 50, yPos);
        pdf.text('Probability', 120, yPos);
        yPos += 7;

        currentPredictionData.all_probabilities.forEach((prob) => {
            pdf.text(prob.class.toUpperCase(), 20, yPos);
            pdf.text(CLASS_NAMES[prob.class] || prob.class, 50, yPos);
            pdf.text(`${(prob.probability * 100).toFixed(2)}%`, 120, yPos);
            yPos += 7;
        });

        // Add precautions if available
        if (currentPredictionData.precautions) {
            yPos += 10;
            pdf.setFontSize(12);
            pdf.setTextColor(102, 126, 234);
            pdf.text('Precautions & Recommendations', 20, yPos);
            yPos += 7;

            pdf.setFontSize(10);
            pdf.setTextColor(0);
            pdf.text(`Disease: ${currentPredictionData.precautions.name}`, 20, yPos);
            yPos += 5;
            pdf.text(`Medical Evaluation Urgency: ${currentPredictionData.precautions.urgency_text}`, 20, yPos);
            yPos += 7;

            pdf.setFontSize(9);
            pdf.setTextColor(100);
            pdf.text('General Precautions:', 20, yPos);
            yPos += 5;
            currentPredictionData.precautions.general_precautions.forEach(prec => {
                pdf.text(`• ${prec}`, 22, yPos, { maxWidth: 168 });
                yPos += 4;
            });
            yPos += 3;

            pdf.text('Warning Signs:', 20, yPos);
            yPos += 5;
            currentPredictionData.precautions.warning_signs.forEach(sign => {
                pdf.text(`• ${sign}`, 22, yPos, { maxWidth: 168 });
                yPos += 4;
            });
            yPos += 10;
        }

        // Add disclaimer
        yPos += 5;
        pdf.setFontSize(12);
        pdf.setTextColor(220, 53, 69);
        pdf.text('⚠️ IMPORTANT DISCLAIMER', 20, yPos);
        yPos += 7;

        pdf.setFontSize(9);
        pdf.setTextColor(100);
        const disclaimerLines = [
            'This analysis result is experimental and educational only.',
            'The prediction provided by this AI model is NOT a confirmed medical diagnosis',
            'and should never be used as a substitute for professional medical advice.',
            'Skin lesions can appear similar across different conditions.',
            'Only a qualified dermatologist can properly evaluate skin conditions.',
            'Please consult a licensed dermatologist or healthcare provider immediately.'
        ];

        disclaimerLines.forEach(line => {
            pdf.text(line, 20, yPos, { maxWidth: 170 });
            yPos += 5;
        });

        // Add image if possible
        try {
            const canvas = await html2canvas(reportImage, {
                scale: 2,
                useCORS: true
            });
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 20, 170, 80, 60);
        } catch (e) {
            console.log('Could not add image to PDF:', e);
        }

        // Save PDF
        const filename = `DermAI_Report_${now.getTime()}.pdf`;
        pdf.save(filename);

        console.log('PDF report downloaded:', filename);
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF report. Please try again.');
    }
}
