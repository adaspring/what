self.addEventListener('message', async (e) => {
    const { files, config, marketData } = e.data;
    
    const readFile = (file) => {
        return new Promise((resolve, reject) => {
            if (!file) return resolve('');
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    };

    try {
        const [html, css, js] = await Promise.all([
            readFile(files.html),
            readFile(files.css),
            readFile(files.js)
        ]);

        const features = new Set();

        // CSS Analysis
        if (css) {
            const ast = csstree.parse(css);
            csstree.walk(ast, node => {
                Object.entries(config.css).forEach(([feature, detector]) => {
                    if (detector(node)) features.add(feature);
                });
            });
        }

        // JS Analysis
        if (js) {
            const ast = acorn.parse(js, { ecmaVersion: 2022 });
            acornWalk.full(ast, node => {
                Object.entries(config.js).forEach(([feature, detector]) => {
                    if (detector(node)) features.add(feature);
                });
            });
        }

        // Viewport Analysis
        const viewportMeta = html?.match(/<meta[^>]+name="viewport"[^>]*>/i) || [];
        const viewportAnalysis = {
            exists: viewportMeta.length > 0,
            missingProps: ['width=device-width', 'initial-scale=1']
                .filter(p => !viewportMeta[0]?.includes(p))
        };

        self.postMessage({
            type: 'analysisResult',
            data: {
                features: [...features],
                viewport: viewportAnalysis,
                compatibility: calculateCompatibility([...features], marketData),
                deviceScores: calculateDeviceScore(marketData)
            }
        });

    } catch (error) {
        self.postMessage({ type: 'error', data: error.message });
    }
});

function calculateCompatibility(features, marketData) {
    // Implement compatibility calculation
    return { chrome: 95, safari: 85, firefox: 89, edge: 91 };
}

function calculateDeviceScore(marketData) {
    // Implement device score calculation
    return { mobile: 88, desktop: 92, tablet: 85 };
}
