const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
dotenv.config();

async function run() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error("GOOGLE_API_KEY is missing");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        console.log("Listing models...");
        // We use the raw fetch or the SDK if it supports it
        // The current SDK has a simple way if supported, but let's try to fetch v1beta/models directly
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await resp.json();

        if (data.error) {
            console.error("API Error:", JSON.stringify(data.error, null, 2));
            return;
        }

        console.log("Available Models:");
        data.models.forEach(m => {
            console.log(`- ${m.name} (${m.displayName}) | Supports: ${m.supportedGenerationMethods.join(', ')}`);
        });

    } catch (e) {
        console.error("Diagnostic failed:", e);
    }
}

run();
