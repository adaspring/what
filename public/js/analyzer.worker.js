self.addEventListener('message', async (e) => {
    const { files } = e.data;
    
    const readFile = (file) => {
        return new Promise(resolve => {
            if (!file) return resolve('');
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.readAsText(file);
        });
    };

    try {
        const [html, css, js] = await Promise.all([
            readFile(files.html),
            readFile(files.css),
            readFile(files.js)
        ]);

        const features = [
            ...detectCSSFeatures(css),
            ...detectJSFeatures(js),
            ...analyzeHTMLFeatures(html)
        ];

        self.postMessage({
            type: 'analysisResult',
            data: {
                features,
                viewport: analyzeViewport(html),
                touchSupport: detectTouchSupport(js)
            }
        });
    } catch (error) {
        self.postMessage({ type: 'error', data: error.message });
    }
});

function detectCSSFeatures(code) {
    // CSS feature detection logic
}

function detectJSFeatures(code) {
    // JS feature detection logic
}

function analyzeHTMLFeatures(html) {
    // HTML analysis logic
}
