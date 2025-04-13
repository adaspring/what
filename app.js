let caniuseData = null;

const browserMarketShare = {
    'chrome': { 
        versions: {'120': 35, '119': 25, '118': 20},
        devices: ['desktop', 'android'] 
    },
    'safari': {
        versions: {'17': 40, '16': 30, '15': 20},
        devices: ['ios', 'macos']
    },
    'firefox': {
        versions: {'120': 50, '119': 30},
        devices: ['desktop']
    },
    'edge': {
        versions: {'120': 60, '119': 30},
        devices: ['desktop', 'windows']
    }
};

const deviceCategories = {
    'mobile': ['ios', 'android'],
    'desktop': ['windows', 'macos', 'linux'],
    'tablet': ['ios', 'android']
};

// Initialize CanIUse data
async function loadCaniuseData() {
    try {
        document.getElementById('status').textContent = 'Loading compatibility data...';
        const response = await fetch('https://unpkg.com/caniuse-db@1.0.30001431/data.json');
        caniuseData = await response.json();
        document.getElementById('status').textContent = '';
    } catch (e) {
        document.getElementById('status').textContent = '⚠️ Failed to load compatibility data. Using limited dataset...';
        caniuseData = {};
    }
}

async function analyzeCode() {
    const report = document.getElementById('report');
    report.style.display = 'block';
    
    const [html, css, js] = await Promise.all([
        readFile(document.getElementById('htmlFile')),
        readFile(document.getElementById('cssFile')),
        readFile(document.getElementById('jsFile'))
    ]);

    const cssFeatures = await detectFeatures(css, 'css');
    const jsFeatures = await detectFeatures(js, 'js');
    const allFeatures = [...cssFeatures, ...jsFeatures];
    
    const compatibility = calculateCompatibility(allFeatures);
    const deviceScores = calculateDeviceScore(compatibility);
    
    renderReport(compatibility, allFeatures, deviceScores);
}

function readFile(input) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        input.files[0] ? reader.readAsText(input.files[0]) : resolve('');
    });
}

async function detectFeatures(code, type) {
    const features = new Set();
    
    if (type === 'css' && code) {
        try {
            const ast = csstree.parse(code, {
                positions: true,
                parseValue: true
            });
            
            csstree.walk(ast, (node) => {
                if (node.type === 'Declaration') {
                    if (node.property === 'display' && 
                        csstree.generate(node.value) === 'grid') {
                        features.add('css-grid');
                    }
                    if (node.property.startsWith('--')) {
                        features.add('css-variables');
                    }
                }
            });
        } catch (e) {
            console.error('CSS Parse Error:', e);
        }
    }
    
    if (type === 'js' && code) {
        try {
            const ast = acorn.parse(code, {
                ecmaVersion: 2022,
                locations: true
            });

            acornWalk.full(ast, (node) => {
                if (node.type === 'ArrowFunctionExpression') {
                    features.add('arrow-functions');
                }
                if (node.type === 'CallExpression' &&
                    node.callee.name === 'fetch') {
                    features.add('fetch-api');
                }
                if (node.type === 'VariableDeclaration' &&
                    (node.kind === 'let' || node.kind === 'const')) {
                    features.add('es6-declarations');
                }
            });
        } catch (e) {
            console.error('JS Parse Error:', e);
        }
    }
    
    return Array.from(features);
}

function calculateCompatibility(features) {
    const browserSupport = {};

    features.forEach(feature => {
        const data = caniuseData.data[feature];
        if (!data) return;

        Object.entries(data.stats).forEach(([browser, versions]) => {
            const supportPercentage = calculateVersionSupport(browser, versions);
            browserSupport[browser] = (browserSupport[browser] || 0) + supportPercentage;
        });
    });

    Object.keys(browserSupport).forEach(browser => {
        browserSupport[browser] = (browserSupport[browser] / features.length).toFixed(1);
    });

    return browserSupport;
}

function calculateVersionSupport(browser, versions) {
    let total = 0;
    Object.entries(versions).forEach(([version, status]) => {
        if (status.startsWith('y') && browserMarketShare[browser]?.versions[version]) {
            total += browserMarketShare[browser].versions[version];
        }
    });
    return total;
}

function calculateDeviceScore(browserSupport) {
    const deviceScores = {};
    
    Object.entries(deviceCategories).forEach(([category, devices]) => {
        let total = 0;
        let count = 0;
        
        Object.entries(browserSupport).forEach(([browser, score]) => {
            const browserInfo = browserMarketShare[browser];
            if (browserInfo?.devices.some(d => devices.includes(d))) {
                total += parseFloat(score);
                count++;
            }
        });
        
        deviceScores[category] = count > 0 ? (total / count).toFixed(1) : 0;
    });
    
    return deviceScores;
}

function renderReport(compatibility, features, deviceScores) {
    const overall = Object.values(compatibility).reduce((a, b) => a + parseFloat(b), 0) / Object.values(compatibility).length;
    document.getElementById('overallScore').innerHTML = `
        <h4>Overall Compatibility: ${overall.toFixed(1)}%</h4>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${overall}%; background: ${getColor(overall)}"></div>
        </div>
    `;

    document.getElementById('browserResults').innerHTML = Object.entries(compatibility).map(([browser, score]) => `
        <div class="browser-card">
            <h4>${browser.toUpperCase()}</h4>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${score}%; background: ${getColor(score)}"></div>
            </div>
            <div>${score}% supported</div>
        </div>
    `).join('');

    document.getElementById('deviceResults').innerHTML = Object.entries(deviceScores).map(([device, score]) => `
        <div class="browser-card">
            <h4>${device.toUpperCase()}</h4>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${score}%; background: ${getColor(score)}"></div>
            </div>
            <div>${score}% supported</div>
            <small>Platforms: ${deviceCategories[device].join(', ')}</small>
        </div>
    `).join('');

    document.getElementById('featureResults').innerHTML = `
        <div class="feature-list">
            ${features.map(f => `<div class="feature-item">${f}</div>`).join('')}
        </div>
    `;
}

function getColor(percentage) {
    if (percentage > 75) return '#2196F3';
    if (percentage > 50) return '#ff9800';
    return '#f44336';
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadCaniuseData();
});
