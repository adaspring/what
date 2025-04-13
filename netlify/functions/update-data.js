exports.handler = async () => {
    try {
        const [caniuseRes, statsRes] = await Promise.all([
            fetch('https://cdn.jsdelivr.net/npm/caniuse-db@1.0.30001431/data.json'),
            fetch('https://api.example.com/browser-stats')
        ]);

        return {
            statusCode: 200,
            body: JSON.stringify({
                caniuse: await caniuseRes.json(),
                stats: await statsRes.json()
            })
        };
    } catch (error) {
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: "Failed to fetch data" }) 
        };
    }
};
