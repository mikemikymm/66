// --- START OF FILE communication/slack.js ---

const axios = require('axios');

/**
 * Posts a message to a Slack webhook URL defined in environment variables.
 * @param {string} content - The main text content of the message.
 * @param {string} title - The title for the message attachment.
 * @returns {Promise<void>}
 */
const postToSlack = async (content, title) => {
    // Read Slack webhook URL from environment variable
    const SLACK_SERVICE_URL = process.env.SLACK_SERVICE; // Make sure this name matches your .env key

    // Check if the URL is configured
    if (!SLACK_SERVICE_URL) {
        console.warn("⚠️ SLACK_SERVICE URL not found in environment. Cannot post message to Slack.");
        return; // Exit gracefully if not configured
    }

    // Construct the payload in the format Slack expects for attachments
    const payload = {
        attachments: [
            {
                title: title,    // Title for the attachment block
                text: content,   // Main message content
                ts: Math.floor(Date.now() / 1000), // Timestamp (optional, but good practice)
                // can add more fields here like color, author_name, etc.
                // color: "#36a64f", // Example: Green color bar
            },
        ],
        //could add an optional top-level text field if desired
        // text: `New Report Generated: ${title}`
    };

    try {
        console.log(`   [Slack] Posting message titled "${title}"...`);
        const response = await axios.post(SLACK_SERVICE_URL, payload, {
            timeout: 10000 // Set a timeout for the request
        });
        // Slack usually returns 'ok' on success
        if (response.data === 'ok') {
            console.info(`✅ [Slack] Message posted successfully.`);
        } else {
            console.warn(`⚠️ [Slack] Message posted, but response was not 'ok':`, response.data);
        }
    } catch (error) {
        // Log detailed error information
        let errorMsg = error.message;
        if (error.response) {
            errorMsg = `Status ${error.response.status}: ${JSON.stringify(error.response.data)}`;
        } else if (error.request) {
            errorMsg = `No response received from Slack: ${error.message}`;
        }
        console.error(`❌ [Slack] Error posting message: ${errorMsg}`);
    }
};

module.exports = {
    postToSlack,
};

// --- END OF FILE communication/slack.js ---