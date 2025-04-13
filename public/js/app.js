// public/js/app.js
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
let analysisWorker = null;
let caniuseData = null;
let marketShareData = null;

// Feature detection configuration
const featureConfig = {
    css: {
        'css-grid': node => node.property === 'display' && /grid/.test(csstree.generate(node.value)),
        'css-variables': node => node.property.startsWith('--'),
        'media-queries': node => node.type === 'Atrule' && node.name === 'media',
        'flexbox': node => node.property === 'display' && /flex/.test(csstree.generate(node.value))
    },
    js: {
        'es6-modules': node => node.type === 'ImportDeclaration' || node.type === 'ExportDefaultDeclaration',
        'touch-events': node => node.type === 'Identifier' && ['ontouchstart', 'ontouchend'].includes(node.name),
        'arrow-functions': node => node.type === 'ArrowFunctionExpression',
        'fetch-api': node => node.type === 'CallExpression' && node.callee.name === 'fetch'
    }
};

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
    const statusElement = document.getElementById('status');
    
    switch(type) {
        case 'analysisResult':
            statusElement.textContent = '';
            renderReport(data);
            break;
        case 'progress':
            statusElement.textContent = `Analyzing: ${data}% complete`;
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

    // Reset UI
    document.getElementById('report').style.display = 'none';
    showError('');

    // File validation
    if (Object.values(files).some(f => f && f.size > MAX_FILE_SIZE)) {
        showError('File size exceeds 2MB limit');
        return;
    }

    // Ensure data is loaded
    if (!caniuseData) await loadCaniuseData();
    if (!marketShareData) marketShareData = await fetchMarketShare();

    // Use worker if available
    if (analysisWorker) {
        analysisWorker.postMessage({ 
            files,
            config: featureConfig,
            marketData: marketShareData
        });
        document.getElementById('status').textContent = '🔍 Analyzing in secure environment...';
    } else {
        showError('Worker not available - using main thread');
        const result = await performMainThreadAnalysis(files);
        renderReport(result);
    }
}

// Data loading functions
async function loadCaniuseData() {
    try {
        document.getElementById('status').textContent = '📦 Loading compatibility data...';
        const response = await fetch('/.netlify/functions/update-data');
        const data = await response.json();
        caniuseData = data.caniuse;
    } catch (e) {
        console.error('Using fallback data:', e);
        caniuseData = {};
        showError('Failed to load latest compatibility data');
    }
}

async function fetchMarketShare() {
    try {
        const response = await fetch('/.netlify/functions/update-data');
        const data = await response.json();
        return data.stats || getFallbackMarketData();
    } catch (e) {
        console.error('Using fallback market data');
        return getFallbackMarketData();
    }
}

function getFallbackMarketData() {
    return {
        chrome: { desktop: 65, mobile: 70 },
        safari: { desktop: 18, mobile: 25 },
        firefox: { desktop: 12 },
        edge: { desktop: 5 }
    };
}

// Rendering functions
function renderReport(data) {
    const reportElement = document.getElementById('report');
    reportElement.style.display = 'block';

    // Overall Score
    const overallScore = calculateOverallScore(data.compatibility);
    document.getElementById('overallScore').innerHTML = `
        <h4>Overall Compatibility: ${overallScore}%</h4>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${overallScore}%; background: ${getColor(overallScore)}"></div>
        </div>
    `;

    // Browser Support
    document.getElementById('browserResults').innerHTML = Object.entries(data.compatibility)
        .map(([browser, score]) => `
            <div class="browser-card">
                <h4>${browser.toUpperCase()}</h4>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${score}%; background: ${getColor(score)}"></div>
                </div>
                <div>${score}% supported</div>
            </div>
        `).join('');

    // Device Support
    document.getElementById('deviceResults').innerHTML = Object.entries(data.deviceScores)
        .map(([device, score]) => `
            <div class="browser-card">
                <h4>${device.toUpperCase()}</h4>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${score}%; background: ${getColor(score)}"></div>
                </div>
                <div>${score}% supported</div>
            </div>
        `).join('');

    // Viewport Analysis
    document.getElementById('viewportAnalysis').innerHTML = data.viewport ?
        `<div class="feature-item">
            Viewport Meta: ${data.viewport.exists ? '✅ Present' : '❌ Missing'}
            ${data.viewport.missingProps.length ? `<br>Missing properties: ${data.viewport.missingProps.join(', ')}` : ''}
        </div>` : '';

    // ES6 Modules
    document.getElementById('es6Analysis').innerHTML = data.features.includes('es6-modules') ?
        '<div class="feature-item">✅ ES6 Modules Detected</div>' : 
        '<div class="feature-item">❌ No ES6 Modules Found</div>';

    // Feature List
    document.getElementById('featureResults').innerHTML = `
        <div class="feature-list">
            ${data.features.map(f => `<div class="feature-item">${f}</div>`).join('')}
        </div>
    `;
}

function calculateOverallScore(scores) {
    const values = Object.values(scores).map(parseFloat);
    return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
}

function getColor(percentage) {
    if (percentage > 75) return '#2196F3';
    if (percentage > 50) return '#ff9800';
    return '#f44336';
}

function showError(message) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.style.color = '#f44336';
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/js/sw.js')
            .then(reg => console.log('Service Worker registered:', reg))
            .catch(err => console.warn('Service Worker registration failed:', err));
    }

    // Initialize Web Worker
    initWorker();

    // Load initial data
    loadCaniuseData();
    fetchMarketShare();
});
