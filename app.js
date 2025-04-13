// app.js
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
let analysisWorker = null;

// Initialize Web Worker
function initWorker() {
    if (window.Worker) {
        analysisWorker = new Worker('analyzer.worker.js');
        analysisWorker.onmessage = handleWorkerMessage;
    }
}

// Enhanced feature detection configuration
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

async function analyzeCode() {
    const files = {
        html: document.getElementById('htmlFile').files[0],
        css: document.getElementById('cssFile').files[0],
        js: document.getElementById('jsFile').files[0]
    };

    // File size validation
    const sizeError = Object.values(files).some(f => f && f.size > MAX_FILE_SIZE);
    if (sizeError) {
        showError('File size exceeds 2MB limit');
        return;
    }

    // Web Worker execution
    if (analysisWorker) {
        analysisWorker.postMessage({ files });
        document.getElementById('status').textContent = 'Analyzing in secure environment...';
    } else {
        showError('Worker not available - using main thread');
        const result = await performMainThreadAnalysis(files);
        renderReport(result);
    }
}

// New: Viewport meta analysis
function analyzeViewport(html) {
    const viewportMeta = html.match(/<meta[^>]+name="viewport"[^>]*>/i);
    const requiredProps = ['width=device-width', 'initial-scale=1'];
    const missing = requiredProps.filter(p => !viewportMeta?.[0].includes(p));
    
    return {
        exists: !!viewportMeta,
        missingProps: missing,
        score: missing.length === 0 ? 100 : Math.max(0, 100 - (missing.length * 33))
    };
}

// Enhanced rendering with new sections
function renderReport(data) {
    // ... existing render code ...
    
    // New: Viewport analysis
    const viewportHtml = `
        <div class="touch-indicator">
            <span class="touch-badge">Viewport</span>
            Score: ${data.viewport.score}%
            ${data.viewport.missingProps.length > 0 ? 
                `Missing: ${data.viewport.missingProps.join(', ')}` : 'Optimal configuration'}
        </div>
    `;
    document.getElementById('viewportAnalysis').innerHTML = viewportHtml;

    // New: ES6 module support
    const es6Html = `
        <div class="feature-item">
            ES6 Modules: ${data.features.includes('es6-modules') ? '✅ Detected' : '❌ Not used'}
        </div>
    `;
    document.getElementById('es6Analysis').innerHTML = es6Html;
}

// Initialize worker on load
document.addEventListener('DOMContentLoaded', () => {
    initWorker();
    loadCaniuseData();
});
