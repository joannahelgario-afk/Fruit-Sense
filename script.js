const URL = "https://teachablemachine.withgoogle.com/models/ybqPk8MrH/";
let model, maxPredictions;
let fileUploaded = false;

// Load the model when the page loads
async function loadModel() {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";
    const statusBadge = document.getElementById('modelStatus');
    try {
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        
        statusBadge.className = "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200";
        statusBadge.innerHTML = '<span class="w-2 h-2 mr-1.5 bg-emerald-500 rounded-full"></span> Model Ready';
    } catch (error) {
        console.error("Error loading model:", error);
        statusBadge.className = "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200";
        statusBadge.innerHTML = '<span class="w-2 h-2 mr-1.5 bg-rose-500 rounded-full"></span> Model Load Failed';
    }
}
loadModel();

function processFile(file) {
    const preview = document.getElementById('imagePreview');
    const uploadPrompt = document.getElementById('uploadPrompt');
    const previewContainer = document.getElementById('previewContainer');
    const classifyBtn = document.getElementById('classifyBtn');

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            uploadPrompt.classList.add('hidden');
            previewContainer.classList.remove('hidden');
            
            classifyBtn.disabled = false;
            classifyBtn.classList.remove('bg-slate-100', 'text-slate-400', 'cursor-not-allowed');
            classifyBtn.classList.add('bg-emerald-600', 'text-white', 'hover:bg-emerald-700', 'cursor-pointer', 'shadow-sm');
        }
        reader.readAsDataURL(file);
        fileUploaded = true;
    }
}

function resetUpload() {
    document.getElementById('imageUpload').value = '';
    document.getElementById('cameraCapture').value = '';
    document.getElementById('uploadPrompt').classList.remove('hidden');
    document.getElementById('previewContainer').classList.add('hidden');
    document.getElementById('resultPlaceholder').classList.remove('hidden');
    document.getElementById('resultData').classList.add('hidden');
    document.getElementById('timestampBadge').classList.add('hidden');
    
    const classifyBtn = document.getElementById('classifyBtn');
    classifyBtn.disabled = true;
    classifyBtn.className = 'mt-6 w-full bg-slate-100 text-slate-400 font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 cursor-not-allowed text-sm shadow-xs flex items-center justify-center space-x-2';
    document.getElementById('btnText').innerText = "Run Inference Analysis";
    fileUploaded = false;
}

async function runAnalysis() {
    if (!fileUploaded || !model) return;

    btnText.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Analyzing...`;
    await new Promise(resolve => setTimeout(resolve, 50));

    const imageElement = document.getElementById('imagePreview');
    
    // Run predictions
    let predictions = await model.predict(imageElement);

    // Sort predictions highest to lowest probability
    predictions.sort((a, b) => b.probability - a.probability);
    const bestPrediction = predictions[0];

    const topClassName = bestPrediction.className;
    const isBananaCategory = topClassName.toLowerCase().includes('unripe') || 
                             topClassName.toLowerCase().includes('ripe') || 
                             topClassName.toLowerCase().includes('overripe');

    // Filter predictions based on whether it is a banana category or non-banana
    if (isBananaCategory) {
        predictions = predictions.filter(p => {
            const name = p.className.toLowerCase();
            return name.includes('unripe') || name.includes('ripe') || name.includes('overripe');
        });
        // Re-sort among the filtered banana classes
        predictions.sort((a, b) => b.probability - a.probability);
    } else {
        // If it's not a banana (e.g. "Not a Banana" or "Empty"), show only that top prediction
        predictions = [bestPrediction];
    }

    const currentBest = predictions[0];
    const className = currentBest.className;
    const topScore = (currentBest.probability * 100).toFixed(1) + '%';

    // Populate Breakdown Matrix dynamically with filtered classes
    const breakdownContainer = document.getElementById('classBreakdownContainer');
    breakdownContainer.innerHTML = '';
    
    predictions.forEach(pred => {
        const percentage = (pred.probability * 100).toFixed(1);
        const row = document.createElement('div');
        row.className = "space-y-1";
        row.innerHTML = `
            <div class="flex justify-between text-xs font-medium">
                <span class="text-slate-700">${pred.className}</span>
                <span class="text-slate-500 font-semibold">${percentage}%</span>
            </div>
            <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div class="bg-emerald-600 h-1.5 rounded-full transition-all duration-500" style="width: ${percentage}%"></div>
            </div>
        `;
        breakdownContainer.appendChild(row);
    });

    // Contextual details based on top class name
    let tip = "Store according to optimal standard conditions.";
    let shelfLife = "3 - 5 Days";
    let qualityStatus = "Standard Grade";
    const lowerName = className.toLowerCase();

    if (lowerName.includes('unripe')) {
        tip = "Store at room temperature away from direct sunlight to encourage natural starch-to-sugar conversion.";
        shelfLife = "5 - 8 Days";
        qualityStatus = "Pre-Ripe / Stable";
    } else if (lowerName.includes('overripe')) {
        tip = "High sugar content detected. Recommended for culinary applications, baking, or commercial processing.";
        shelfLife = "1 Day (Process Immediately)";
        qualityStatus = "Post-Peak Quality";
    } else if (lowerName.includes('ripe')) {
        tip = "Consume soon or store in standard refrigeration (12-15°C) to slow down over-ripening.";
        shelfLife = "2 - 4 Days";
        qualityStatus = "Optimal Consumption";
    } else if (lowerName.includes('background') || lowerName.includes('empty') || lowerName.includes('no banana')) {
        tip = "Please place a valid banana sample in the frame for accurate detection.";
        shelfLife = "N/A";
        qualityStatus = "Empty Frame";
    } else {
        tip = "Object detected does not match banana criteria.";
        shelfLife = "N/A";
        qualityStatus = "Not a Banana";
    }

    // Update UI elements
    document.getElementById('resultPlaceholder').classList.add('hidden');
    document.getElementById('resultData').classList.remove('hidden');
    document.getElementById('timestampBadge').classList.remove('hidden');

    document.getElementById('predictedClass').innerText = className;
    document.getElementById('topConfidence').innerText = topScore;
    document.getElementById('shelfLifeText').innerText = shelfLife;
    document.getElementById('qualityStatusText').innerText = qualityStatus;
    document.getElementById('storageTip').innerText = tip;

    // Reset Button State
    classifyBtn.disabled = false;
    classifyBtn.className = "mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 cursor-pointer text-sm shadow-sm flex items-center justify-center space-x-2";
    btnText.innerText = "Re-run Analysis";
}
