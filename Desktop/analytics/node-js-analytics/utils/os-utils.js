// Description: Utility functions to parse and build operating system combinations from Auth0 device credentials.
// This module provides functions to parse device credentials and build OS combinations.

// Require necessary constants
const {
    UNKNOWN_OPERATING_SYSTEM,
    MACOS_OPERATION_SYSTEM,
    WINDOWS_OPERATION_SYSTEM,
    IOS_OPERATION_SYSTEM,
    ANDROID_OPERATION_SYSTEM,
    ANDROID_DEVICE_NAME,
    MAC_CLIENT_ID,
    WINDOWS_CLIENT_ID,
    MOBILE_CLIENT_ID,
} = require('../Config/constants'); 

// Require utilities if needed (e.g., groupDataByKey) - moved require here
const { groupDataByKey } = require('./core-utils'); 

/**
 * Builds a distinct, sorted, underscore-joined string of operating systems from a list.
 * @param {Array<object | string>} list - Array of strings or objects with an operating_system property.
 * @returns {string} The OS combination string (e.g., "MacOS_Windows") or UNKNOWN_OPERATING_SYSTEM.
 */
const buildOsCombination = list => {
    if (!list || list.length === 0) return UNKNOWN_OPERATING_SYSTEM; // Return constant on empty
    const osSet = new Set(
        list
          .map(d => (typeof d === 'string' ? d : d?.operating_system)) // Safer access
          .filter(Boolean) // Filter out null/undefined/empty strings
    );
    if (osSet.size === 0) {
        return UNKNOWN_OPERATING_SYSTEM; // Return constant if all were filtered
    }
    return [...osSet]
      .sort()
      .join('_');
};

/**
 * Parses Auth0 device credentials to determine the operating system(s) used by a user.
 * Groups results by user ID.
 * @param {Array<object>} credentials - Array of Auth0 credential objects, each potentially having a user_id property.
 * @returns {object} An object where keys are user IDs and values are arrays of device objects ({ operating_system: string }).
 */
const parseDeviceFromCredentials = (credentials) => {
    const credentialsByUser = groupDataByKey(credentials, 'user_id'); // Group credentials first
    const devicesByUser = {};

    for (const userId in credentialsByUser) {
        const userCredentials = credentialsByUser[userId];
        const devices = [];
        let foundRecognizedOS = false; // Flag to track if any parsing succeeded

        if (userCredentials?.length > 0) {
            for (const item of userCredentials) {
                let operationSystem = "";
                let recognized = false; // Flag per credential

                // Check known Client IDs
                if (item.client_id === MAC_CLIENT_ID) { operationSystem = MACOS_OPERATION_SYSTEM; recognized = true; }
                else if (item.client_id === WINDOWS_CLIENT_ID) { operationSystem = WINDOWS_OPERATION_SYSTEM; recognized = true; }
                else if (MOBILE_CLIENT_ID.includes(item.client_id)) {
                    operationSystem = item.device_name === ANDROID_DEVICE_NAME ? ANDROID_OPERATION_SYSTEM : IOS_OPERATION_SYSTEM;
                    recognized = true;
                } else {
                    // Fallback: Guess from device_name
                    const deviceNameLower = (item.device_name || "").toLowerCase();
                    if (deviceNameLower.includes('mac')) { operationSystem = MACOS_OPERATION_SYSTEM; recognized = true; } // Consider 'recognized' true if guessed
                    else if (deviceNameLower.includes('windows')) { operationSystem = WINDOWS_OPERATION_SYSTEM; recognized = true; }
                    else if (deviceNameLower.includes('iphone') || deviceNameLower.includes('ipad')) { operationSystem = IOS_OPERATION_SYSTEM; recognized = true; }
                    else if (deviceNameLower.includes(ANDROID_DEVICE_NAME) || deviceNameLower.includes('android')) { operationSystem = ANDROID_OPERATION_SYSTEM; recognized = true; }
                }

                // If OS was determined, add it to the list
                if (operationSystem) {
                    devices.push({ operating_system: operationSystem });
                    if(recognized) foundRecognizedOS = true;
                }

                // Log unrecognized credentials (helps debugging "Unknown" OS)
                if (!recognized) {
                    console.log(`   [parseDeviceFromCredentials] User ${userId}: Unrecognized credential - Client ID: ${item.client_id || 'N/A'}, Device Name: ${item.device_name || 'N/A'}`);
                }
            }
        }
        // Log if credentials existed but parsing failed
        if (!foundRecognizedOS && userCredentials?.length > 0) {
            console.log(`   [parseDeviceFromCredentials] User ${userId}: Processed ${userCredentials.length} credential(s), but none resulted in a recognized OS.`);
        }
        devicesByUser[userId] = devices; // Store the list of determined OS for the user
    }
    return devicesByUser; // Return the map { userId: [{os}, {os}], ... }
};

module.exports = {
    buildOsCombination,
    parseDeviceFromCredentials,
};

// --- END OF FILE utils/os-utils.js ---