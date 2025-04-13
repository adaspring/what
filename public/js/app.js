const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
let analysisWorker = null;
let caniuseData = null;
let marketShareData = null;

// Initialize Web Worker
function initWorker() {
    if (window.Worker) {
        analysisWorker = new Worker('/js/analyzer.worker.js');
        analysisWorker.onmessage = handleWorkerMessage;
    }
}

// Handle worker messages
function handleWorkerMessage(e) {
    const { type, data } = e.data;
    switch(type) {
        case 'analysisResult':
            renderReport(data);
            break;
        case 'error':
            showError(data);
            break;
    }
}

// Main analysis function
async function analyzeCode() {
    const files = {
        html: document.getElementById('htmlFile').files[0],
        css: document.getElementById('cssFile').files[0],
        js: document.getElementById('jsFile').files[0]
    };

    // File validation
    if (Object.values(files).some(f => f && f.size > MAX_FILE_SIZE)) {
        showError('File size exceeds 2MB limit');
        return;
    }

    // Initialize data
    if (!caniuseData) await loadCaniuseData();
    if (!marketShareData) marketShareData = await fetchMarketShare();

    // Use worker if available
    if (analysisWorker) {
        analysisWorker.postMessage({ files });
        document.getElementById('status').textContent = 'Analyzing in secure environment...';
    } else {
        const result = await performMainThreadAnalysis(files);
        renderReport(result);
    }
}

// Data loading functions
async function loadCaniuseData() {
    try {
        const response = await fetch('/.netlify/functions/update-data');
        const data = await response.json();
        caniuseData = data.caniuse;
    } catch (e) {
        console.error('Using fallback data:', e);
        caniuseData = {};
    }
}

async function fetchMarketShare() {
    try {
        const response = await fetch('/.netlify/functions/update-data');
        const data = await response.json();
        return data.stats;
    } catch (e) {
        console.error('Using fallback market data');
        return {
            chrome: { desktop: 65, mobile: 70 },
            safari: { desktop: 18, mobile: 25 },
            firefox: { desktop: 12 },
            edge: { desktop: 5 }
        };
    }
}

// Rendering functions
function renderReport(data) {
    // ... existing rendering logic ...
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initWorker();
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/js/sw.js');
    }
});
