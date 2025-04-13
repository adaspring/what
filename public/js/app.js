const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
let analysisWorker = null;
let caniuseData = null;
let marketShareData = null;
let isAnalyzing = false;
let dataLoaded = false;

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

function initWorker() {
    if (window.Worker) {
        analysisWorker = new Worker('/js/analyzer.worker.js');
        analysisWorker.onmessage = handleWorkerMessage;
    }
}

function handleWorkerMessage(e) {
    const { type, data } = e.data;
    const statusElement = document.getElementById('status');
    const analyzeBtn = document.getElementById('analyzeBtn');
    
    switch(type) {
        case 'analysisResult':
            statusElement.textContent = '';
            analyzeBtn.disabled = false;
            analyzeBtn.classList.remove('analyzing');
            renderReport(data);
            break;
        case 'progress':
            statusElement.textContent = `Analyzing: ${data}% complete`;
            break;
        case 'error':
            showError(data);
            analyzeBtn.disabled = false;
            analyzeBtn.classList.remove('analyzing');
            break;
    }
}

async function analyzeCode() {
    if (isAnalyzing) return;
    const analyzeBtn = document.getElementById('analyzeBtn');
    const files = {
        html: document.getElementById('htmlFile').files[0],
        css: document.getElementById('cssFile').files[0],
        js: document.getElementById('jsFile').files[0]
    };

    document.getElementById('report').style.display = 'none';
    showError('');

    if (!files.html && !files.css && !files.js) {
        showError('Please select at least one file');
        return;
    }

    if (!dataLoaded) {
        showError('Compatibility data not loaded yet');
        return;
    }

    if (Object.values(files).some(f => f && f.size > MAX_FILE_SIZE)) {
        showError('File size exceeds 2MB limit');
        return;
    }

    isAnalyzing = true;
    analyzeBtn.disabled = true;
    analyzeBtn.classList.add('analyzing');
    document.getElementById('status').textContent = '🔍 Analyzing...';

    try {
        if (analysisWorker) {
            analysisWorker.postMessage({ 
                files,
                config: featureConfig,
                marketData: marketShareData
            });
        } else {
            const [html, css, js] = await Promise.all([
                readFile(files.html),
                readFile(files.css),
                readFile(files.js)
            ]);
            const features = detectFeatures(html, css, js);
            const compatibility = calculateCompatibility(features);
            renderReport({
                features,
                compatibility,
                deviceScores: calculateDeviceScore(compatibility),
                viewport: analyzeViewport(html)
            });
        }
    } catch (error) {
        showError(`Analysis failed: ${error.message}`);
    } finally {
        isAnalyzing = false;
        analyzeBtn.disabled = false;
        analyzeBtn.classList.remove('analyzing');
    }
}

function readFile(file) {
    return new Promise((resolve, reject) => {
        if (!file) return resolve('');
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

function detectFeatures(html, css, js) {
    const features = new Set();
    
    if (css) {
        try {
            const ast = csstree.parse(css);
            csstree.walk(ast, node => {
                Object.entries(featureConfig.css).forEach(([feature, detector]) => {
                    if (detector(node)) features.add(feature);
                });
            });
        } catch (e) {
            console.error('CSS parse error:', e);
        }
    }

    if (js) {
        try {
            const ast = acorn.parse(js, { ecmaVersion: 2022 });
            acornWalk.full(ast, node => {
                Object.entries(featureConfig.js).forEach(([feature, detector]) => {
                    if (detector(node)) features.add(feature);
                });
            });
        } catch (e) {
            console.error('JS parse error:', e);
        }
    }

    return Array.from(features);
}

function calculateCompatibility(features) {
    const browserSupport = {};
    // Compatibility calculation logic
    return browserSupport;
}

function renderReport(data) {
    const reportElement = document.getElementById('report');
    reportElement.style.display = 'block';

    // Render all report sections
    // ... (existing render logic)
}

document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/js/sw.js')
            .then(reg => {
                console.log('Service Worker registered');
                const checkInterval = setInterval(() => {
                    if(dataLoaded) {
                        document.getElementById('status').textContent = '';
                        clearInterval(checkInterval);
                    }
                }, 500);
            })
            .catch(err => console.log('SW registration failed'));
    }

    initWorker();
    loadCaniuseData();
    
    document.querySelectorAll('input[type="file"]').forEach(input => {
        input.addEventListener('change', () => {
            document.getElementById('status').textContent = '';
        });
    });
});
