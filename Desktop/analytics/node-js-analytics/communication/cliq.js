// --- START OF FILE communication/cliq.js ---

const axios = require('axios');

/**
 * Logs a message to a specific Zoho Cliq channel using a bot webhook.
 * Reads necessary configuration from environment variables.
 * @param {string} content - The main text content of the message.
 * @param {string} title - A title or prefix for the message.
 * @returns {Promise<void>}
 */
const logEventInCliq = async (content, title) => {
    // Read Zoho Cliq configuration from environment variables
    const ZOHO_CLIQ_BACKEND_BOT_WEBHOOK = process.env.ZOHO_CLIQ_BACKEND_BOT_WEBHOOK;
    const ZOHO_CLIQ_API_KEY = process.env.ZOHO_CLIQ_API_KEY;
    const ZOHO_CLIQ_CHANNEL = process.env.ZOHO_CLIQ_CHANNEL;

    // Check if all required configurations are present
    if (!ZOHO_CLIQ_BACKEND_BOT_WEBHOOK || !ZOHO_CLIQ_API_KEY || !ZOHO_CLIQ_CHANNEL) {
        console.warn("⚠️ One or more Zoho Cliq environment variables (WEBHOOK, API_KEY, CHANNEL) missing. Cannot log event to Cliq.");
        return; // Exit gracefully if not fully configured
    }

    try {
        // Construct the full webhook URL
        const cliqUrl = `${ZOHO_CLIQ_BACKEND_BOT_WEBHOOK}?zapikey=${ZOHO_CLIQ_API_KEY}`;

        console.log(`   [Cliq] Preparing to log message titled "${title}" to channel ${cliqUrl}...`);

        // Construct the message payload for Cliq bot
        // (Adjust format if your bot expects something different, e.g., cards)
        const body = {
            message: `*${title}*\n${content}`, // Simple text message format
            card: { title: title, theme: "modern-inline" },
            channel: ZOHO_CLIQ_CHANNEL, // Specify the target channel
        };

        console.log(`   [Cliq] Logging message titled "${title}" to channel ${ZOHO_CLIQ_CHANNEL}...`);
        // Log the body for debugging (optional)
        // console.log("      Cliq Payload:", JSON.stringify(body));

        // Post the message to the Cliq webhook
        const cliqResponse = await axios.post(cliqUrl, body, {
            timeout: 10000 // Set a timeout for the request
        });

        // Check Cliq response for success (structure might vary)
        if (cliqResponse.data?.status === 'success' || cliqResponse.status === 200 || cliqResponse.status === 204) { // Common success indicators
             console.log(`✅ [Cliq] Successfully logged "${title}". Response:`, JSON.stringify(cliqResponse.data));
        } else {
            console.warn(`⚠️ [Cliq] Logged "${title}", but received unexpected response:`, JSON.stringify(cliqResponse.data));
        }

    } catch (error) {
        // Log detailed error information
        let errorMsg = error.message;
        if (error.response) {
            errorMsg = `Status ${error.response.status}: ${JSON.stringify(error.response.data)}`;
        } else if (error.request) {
            errorMsg = `No response received from Cliq: ${error.message}`;
        }
        console.error(`❌ [Cliq] Error logging event: ${errorMsg}`);
        // Don't re-throw, logging failure shouldn't stop the main script
    }
};

module.exports = {
    logEventInCliq,
};

// --- END OF FILE communication/cliq.js ---