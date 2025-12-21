const https = require('https');

const apiKey = process.argv[2];

if (!apiKey) {
    console.error("Usage: node list_models.cjs YOUR_API_KEY");
    process.exit(1);
}

async function fetchModels(pageToken = '') {
    return new Promise((resolve, reject) => {
        const path = `/v1/models?key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
        const options = {
            hostname: 'generativelanguage.googleapis.com',
            port: 443,
            path: path,
            method: 'GET'
        };

        const req = https.request(options, (res) => {
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(rawData);
                    resolve(parsedData);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });
        req.end();
    });
}

async function run() {
    let pageToken = '';
    console.log("All Available Models:");
    try {
        do {
            const data = await fetchModels(pageToken);
            if (data.error) {
                console.error("API Error:", JSON.stringify(data.error, null, 2));
                break;
            }
            if (data.models) {
                data.models.forEach(m => {
                    console.log(`- ${m.name}`);
                });
            }
            pageToken = data.nextPageToken;
        } while (pageToken);
        console.log("--- End of List ---");
    } catch (e) {
        console.error("Error:", e.message);
    }
}

run();
