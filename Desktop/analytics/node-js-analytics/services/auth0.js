// File: auth0.js
// Description: This module handles interactions with the Auth0 Management API.

const axios = require('axios');

// Configurations and Constants
const { MAC_CLIENT_ID, WINDOWS_CLIENT_ID, MOBILE_CLIENT_ID } = require('../Config/constants'); // Required for parsing credentials

// Utilities
const { chunkArray, sleep } = require('../utils/core-utils'); // Adjust path as needed
const { parseDeviceFromCredentials } = require('../utils/os-utils'); // Adjust path as needed

// --- Auth0 Token Cache (Internal to this module) ---
let auth0AccessToken = null;
let tokenExpiryTime = 0;
// --- End Auth0 Token Cache ---

/**
 * Gets a valid Auth0 Management API access token, requesting a new one if necessary.
 * Reads configuration directly from process.env.
 * @returns {Promise<string>} A promise resolving to the access token.
 * @throws {Error} If configuration is missing or token fetching fails.
 */
const getAccessToken = async () => {
    // Read Auth0 config directly from process.env inside the function
    const domain = process.env.AUTH0_DOMAIN;
    const clientId = process.env.AUTH0_MANAGEMENT_CLIENT_ID;
    const clientSecret = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET;
    const auth0Audience = domain ? `https://${domain}/api/v2/` : undefined; // Derive audience safely

    if (!domain || !clientId || !clientSecret || !auth0Audience) {
         console.error("❌ Cannot get Auth0 token: Missing Auth0 configuration environment variables.");
         throw new Error("Missing Auth0 configuration");
    }

    const now = Date.now();
    // Refresh token if it's null or expired (or close to expiry)
    if (!auth0AccessToken || now >= tokenExpiryTime - (5 * 60 * 1000)) {
        console.log("🔑 Requesting new Auth0 Management API token...");
        try {
            const tokenUrl = `https://${domain}/oauth/token`;
            console.log(`   Requesting token from: ${tokenUrl}`);
            const response = await axios.post(tokenUrl, {
                client_id: clientId,
                client_secret: clientSecret,
                audience: auth0Audience,
                grant_type: "client_credentials",
            }, { timeout: 15000 }); // Add timeout

            auth0AccessToken = response.data.access_token;
            const expiresIn = response.data.expires_in || 3600;
            tokenExpiryTime = now + expiresIn * 1000;
            console.log("🔑 New Auth0 token obtained.");
        } catch (error) {
             let errorMsg = error.message;
             if (error.response) { errorMsg = `Status ${error.response.status}: ${JSON.stringify(error.response.data)}`; }
             else if (error.request) { errorMsg = `No response received: ${error.message}`; }
             console.error("❌ Failed to get Auth0 access token:", errorMsg);
             // Reset cached token on failure
             auth0AccessToken = null;
             tokenExpiryTime = 0;
             throw new Error(`Failed to obtain Auth0 token: ${errorMsg}`);
        }
    }
    return auth0AccessToken;
};

/**
 * Fetches users from Auth0 created since a specified date. Handles pagination.
 * @param {Date} fromDate - The starting date to fetch users from.
 * @returns {Promise<Array<object>>} A promise resolving to an array of Auth0 user objects.
 */
const getUserFromAuth0 = async (fromDate) => {
    console.log(`⏳ Fetching users from Auth0 created since ${fromDate.toISOString()}...`);
    try {
        const token = await getAccessToken(); // Get token (will request new if needed)
        const domain = process.env.AUTH0_DOMAIN; // Get domain for URL
        if (!domain) throw new Error("Missing Auth0 domain configuration");

        let allUsers = []; let page = 0; const perPage = 100;
        while (true) {
            const userUrl = `https://${domain}/api/v2/users`;
            const headers = { Authorization: `Bearer ${token}` };
            const params = {
                q: `created_at:[${fromDate.toISOString()} TO *]`,
                sort: "created_at:1",
                page: page,
                per_page: perPage,
                search_engine: "v3"
                // Consider adding 'fields' and 'include_fields: true' to limit data transfer
            };
            console.log(`   Auth0 Users: Requesting page ${page}...`);
            const userResponse = await axios.get(userUrl, { headers, params, timeout: 20000 });

            if (!userResponse.data || userResponse.data.length === 0) {
                 console.log(`   Auth0 Users: No more users found on page ${page}.`);
                 break;
            }
            allUsers = allUsers.concat(userResponse.data);
            console.log(`   Auth0 Users: Retrieved ${userResponse.data.length} users on page ${page}. Total: ${allUsers.length}`);

            if (userResponse.data.length < perPage) {
                console.log(`   Auth0 Users: Last page reached.`);
                break;
            }
            page++;
        }
        console.log(`✅ Fetched ${allUsers.length} users from Auth0.`);
        return allUsers;
    } catch (error) {
        // Avoid double logging token errors
        if (!error.message.includes("Failed to obtain Auth0 token") && !error.message.includes("Missing Auth0 configuration")) {
            console.error("❌ Error retrieving users from Auth0:", error.response ? `${error.response.status} ${JSON.stringify(error.response.data)}` : error.message);
        }
        return []; // Return empty array on any error
    }
};

/**
 * Fetches device credentials for a list of user IDs from Auth0.
 * Includes delays to mitigate rate limiting.
 * @param {Array<string>} userIds - Array of Auth0 user IDs.
 * @returns {Promise<Array<object>>} A promise resolving to an array of Auth0 credential objects (with user_id added).
 */
const fetchDeviceCredentials = async (userIds) => {
    if (!Array.isArray(userIds) || userIds.length === 0) return [];

    const domain = process.env.AUTH0_DOMAIN;
    if (!domain) {
        console.error("❌ Cannot fetch device credentials: AUTH0_DOMAIN missing.");
        return [];
    }

    let token;
    try {
        token = await getAccessToken(); // Get token once
    } catch (tokenError) {
        return []; // Cannot proceed without token
    }

    const allCredentials = [];
    const userChunks = chunkArray(userIds, 50); // Group for logical processing
    console.log(`⏳ Fetching Auth0 device credentials for ${userIds.length} users (with delays)...`);
    let fetchedCount = 0;
    const delayBetweenRequestsMs = 2500; // ADJUST IF HITTING RATE LIMIT

    for (const chunk of userChunks) {
        // Process requests within a chunk with delays
        const promises = chunk.map(async (userId) => {
            await sleep(delayBetweenRequestsMs); // Wait before making the request
            try {
                const url = `https://${domain}/api/v2/device-credentials?user_id=${userId}`;
                const response = await axios.get(url, {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 15000 // Request timeout
                });
                // Add user_id to each credential for easier mapping later
                return response.data.map(cred => ({ ...cred, user_id: userId }));
            } catch (error) {
                if (error.response?.status === 429) {
                     console.warn(`   ⚠️ Rate limit (429) hit for user ${userId}. Consider increasing delay.`);
                } else {
                    console.warn(`   ⚠️ Failed to fetch credentials for user ${userId}:`, error.response ? error.response.status : error.message);
                }
                return []; // Return empty array for this user on error
            }
        });

        // Wait for all requests in the current batch to settle
        const results = await Promise.allSettled(promises);
        results.forEach(result => {
            if (result.status === 'fulfilled' && Array.isArray(result.value)) {
                allCredentials.push(...result.value);
            }
            // Errors are logged inside the map function
        });
        fetchedCount += chunk.length;
        console.log(`   Auth0 Credentials: Processed batch. Checked ${fetchedCount}/${userIds.length} users.`);
        // Optional: Add a longer sleep between chunks if necessary
        // await sleep(500);
    }
    console.log(`✅ Fetched ${allCredentials.length} total credentials from Auth0.`);
    return allCredentials;
};

module.exports = {
    getAccessToken,
    getUserFromAuth0,
    fetchDeviceCredentials,
    // Note: parseDeviceFromCredentials is moved to os-utils.js as it's OS-specific logic
};

// --- END OF FILE services/auth0.js ---