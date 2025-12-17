
/**
 * Google Spreadsheet Logger
 * Sends logs to a Google Apps Script (GAS) Webhook for business analysis.
 */

export async function logToSheet(data: {
    userId: string;
    type: string;
    userContent: string;
    aiResponse: string;
    timestamp?: string;
}) {
    const WEBHOOK_URL = process.env.LOG_WEBHOOK_URL;

    if (!WEBHOOK_URL) {
        console.warn('LOG_WEBHOOK_URL is not set. Skipping log.');
        return;
    }

    try {
        const payload = {
            ...data,
            timestamp: data.timestamp || new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
            source: 'AI-18-Page'
        };

        // GAS expects a POST request. We use 'no-cors' if it's from browser, 
        // but here it's from server-side, so simple fetch is fine.
        await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log('Log sent to Spreadsheet successfully.');
    } catch (error) {
        console.error('Failed to log to Spreadsheet:', error);
    }
}
