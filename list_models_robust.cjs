const https = require('https');

const apiKey = process.argv[2];

if (!apiKey) {
    console.error("Usage: node list_models.cjs YOUR_API_KEY");
    process.exit(1);
}

const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: `/v1beta/models?key=${apiKey}`,
    method: 'GET'
};

console.log(`Connecting to: ${options.hostname}${options.path.replace(apiKey, 'REDACTED')}`);

const req = https.request(options, (res) => {
    let rawData = '';
    console.log(`Status Code: ${res.statusCode}`);
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        try {
            console.log("--- Full API Response ---");
            console.log(rawData);
            console.log("--------------------------");
            const parsedData = JSON.parse(rawData);
            if (parsedData.error) {
                console.error("API Error Object:", JSON.stringify(parsedData.error, null, 2));
            } else {
                console.log("Available Models:");
                if (parsedData.models) {
                    parsedData.models.forEach(m => {
                        console.log(`- ${m.name} | Methods: ${m.supportedGenerationMethods.join(', ')}`);
                    });
                } else {
                    console.log("No models found in the response.");
                }
            }
        } catch (e) {
            console.error("Parse error:", e.message);
            console.log("Raw Response was not JSON or Corrupted.");
        }
    });
});

req.on('error', (e) => {
    console.error(`Request fails: ${e.message}`);
});
req.end();
