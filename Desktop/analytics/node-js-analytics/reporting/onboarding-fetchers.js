// File: onboarding-fetchers.js
// Description: Fetches user data for onboarding report, including track events, activities, focus modes, and devices.

const moment = require('moment');

// Services & Config
const { executeQueryUsingPool } = require('../services/db');
const { eventTypeConstant } = require('../Config/constants');

// Utilities
const { chunkArray, groupDataByKey } = require('../utils/core-utils');
const { fetchDeviceCredentials } = require('../services/auth0'); // Needed for OS fallback
const { parseDeviceFromCredentials } = require('../utils/os-utils'); // Needed for OS fallback
const { UNKNOWN_OPERATING_SYSTEM } = require('../Config/constants'); // Needed for OS fallback

/**
 * Fetches users created or updated in the last 45 days for the onboarding report.
 * Attempts to fetch team_id.
 * @returns {Promise<Array<object>>} Array of user objects.
 */
// async function printUserTableColumns() {
//     if (!pool) {
//         console.error("Database pool not initialized. Cannot print columns.");
//         return;
//     }
//     console.log("\n🔍 Attempting to fetch a sample row from the 'team_to_member' table to list columns...");
//     // Query to get just one row - adjust if your table might be empty
//     // Using LIMIT 1 is efficient
//     const query = `SELECT * FROM devices LIMIT 1;`;
//     const query2 = `SELECT * FROM users LIMIT 1;`;
//     try {
//         const result = await executeQueryUsingPool(query);
//         const result2 = await executeQueryUsingPool(query2);

//         if (result && result.length > 0) {
//             const firstUser = result[0];
//             const columns = Object.keys(firstUser);
//             const firstUser2 = result2[0];
//             const columns2 = Object.keys(firstUser2);
//             console.log("✅ Successfully fetched sample team_to_member row. Detected columns:");
//             console.log("--------------------------------------------------");
//             columns.forEach(col => console.log(` - ${col}`));
//             columns2.forEach(col => console.log(` - ${col}`));
//             console.log("--------------------------------------------------");
//             console.log("ℹ️ Look for likely candidates like 'team_id', 'organization_id', 'org_id', 'group_id', etc.");
//         } else {
//             console.warn("⚠️ Could not fetch a sample row (table might be empty or query failed silently). Unable to list columns.");
//         }
//     } catch (error) {
//         console.error("❌ Error executing query to fetch sample user row:", error.message);
//         console.error("   Check database connection and table/column permissions.");
//     }
//     console.log("🔍 Finished column detection attempt.\n");
     
// }

// // +++ UPDATED TEMPORARY FUNCTION TO CHECK USERS AND DEVICES TABLES +++
// async function checkSpecificUsersData(userIdsToCheck) {
//     if (!Array.isArray(userIdsToCheck) || userIdsToCheck.length === 0) {
//         console.log("ℹ️ [TempCheck] No specific user IDs provided to check.");
//         return;
//     }
//     console.log(`\nℹ️ [TempCheck] Checking specific user IDs in 'users' and 'devices' tables: ${userIdsToCheck.join(', ')}`);

//     // Query 1: Check 'users' table
//     const usersQuery = `SELECT id, auth0_id, created_at FROM users WHERE id = ANY($1::uuid[]);`;
//     // Query 2: Check 'devices' table
//     const devicesQuery = `SELECT user_id, operating_system AS device_table_os, created_at AS device_created_at FROM devices WHERE user_id = ANY($1::uuid[]) ORDER BY user_id, device_created_at DESC;`; // Get latest device first

//     try {
//         const [usersResults, devicesResults] = await Promise.all([
//             executeQueryUsingPool(usersQuery, [userIdsToCheck]),
//             executeQueryUsingPool(devicesQuery, [userIdsToCheck])
//         ]);

//         const usersFoundMap = new Map(usersResults.map(u => [u.id, u]));
//         const devicesFoundMap = groupDataByKey(devicesResults, 'user_id');

//         console.log("\n--- [TempCheck] User Data Check Results ---");
//         userIdsToCheck.forEach(userId => {
//             const userRecord = usersFoundMap.get(userId);
//             const userDevices = devicesFoundMap[userId] || [];

//             console.log(`\n--- User ID: ${userId} ---`);

//             // User Table Info
//             if (userRecord) {
//                 console.log(`   USERS Table: Found. Auth0 ID: ${userRecord.auth0_id}, Created: ${userRecord.created_at}`);
                
//             } else {
//                 console.log(`   USERS Table: NOT FOUND for this ID.`);
//             }

//             // Devices Table Info
//             if (userDevices.length > 0) {
//                 console.log(`   DEVICES Table: Found ${userDevices.length} record(s):`);
//                 userDevices.forEach(device => {
//                     console.log(`     - OS: '${device.device_table_os}', Created: ${device.device_created_at}`);
//                 });
//                 const validDbOSDevice = userDevices.find(d => d.device_table_os && d.device_table_os !== UNKNOWN_OPERATING_SYSTEM);
//                 if (validDbOSDevice) {
//                     console.log(`     ==> Devices Table Conclusion: Valid OS ('${validDbOSDevice.device_table_os}') found. Auth0 should NOT have been primary.`);
//                 } else {
//                     console.log(`     ==> Devices Table Conclusion: No valid OS found (all are null/Unknown). Auth0 check is EXPECTED.`);
//                 }
//             } else {
//                 console.log(`   DEVICES Table: No records found. Auth0 check is EXPECTED.`);
//             }
//              console.log(`--- End User ID: ${userId} ---`);
//         });
//     } catch (error) {
//         console.error(`❌ [TempCheck] Error querying tables for specific users:`, error);
//     }
//     console.log("ℹ️ [TempCheck] Finished checking specific users.\n");
// }
// // +++ END UPDATED TEMPORARY FUNCTION +++

// // Call the function early in the script execution
// printUserTableColumns()
//     .then(() => {
//         console.log("Continuing with main script execution...");
//         // If your main script logic is wrapped in an async function, call it here.
//         // e.g., main();
//         // If not, the script will just continue after this promise resolves.
//     })
//     .catch(err => {
//         console.error("Error during column printing:", err);
//         // Decide if you want to exit or continue
//         // process.exit(1);
//     });


const fetchUserUpdatedIn45Days = async () => {
    console.log("⏳ [Fetcher] Fetching users for onboarding report (last 45 days)...");
    const ThirtyDaysAgo = moment().subtract(30, 'days').toISOString();
    // Try to select team_id, alias it
    const query = `
        SELECT
            u.id,                     -- User's primary ID
            u.auth0_id,               -- User's Auth0 ID
            u.created_at,             -- User's creation date
            u.updated_at,             -- User's last update date
            u.revenue_cat_status,     -- User's subscription status
            u.stripe_customer_id,     -- User's Stripe ID
            ttm.team_id              -- Team ID from the joined table
        FROM
            users u                   -- Alias users table as 'u'
        LEFT JOIN
            team_to_member ttm        -- Alias linking table as 'ttm'
        ON
            u.id = ttm.member_id      -- JOIN condition: users.id matches team_to_member.member_id
        WHERE
            u.created_at >= $1 OR u.updated_at >= $1 -- Filter users based on activity date
        ORDER BY
            u.created_at DESC;        -- Order by user creation date
    `;

    try {
        const users = await executeQueryUsingPool(query, [ThirtyDaysAgo]);
        // Filter internal users (example: based on auth0_id containing '@focusbear')
        const nonInternalUsers = users.filter(u => !(u.auth0_id?.includes('@focusbear')));
        console.log(`✅ [Fetcher] Found ${nonInternalUsers.length} relevant users for onboarding report.`);
         if (nonInternalUsers.some(u => u.team_id !== null && u.team_id !== undefined)) { console.log("   [Fetcher] ✅ Found non-null 'team_id' values."); }
         else { console.log("   [Fetcher] ⚠️ Did not find non-null 'team_id' values."); }
        return nonInternalUsers;
    } catch(error) {
        // Handle missing team_id column gracefully
        if (error.message.includes('column "team_id" does not exist')) {
             console.warn("   [Fetcher] ⚠️ Column 'team_id' not found. Proceeding without Team ID.");
             const fallbackQuery = `SELECT id, auth0_id, created_at, updated_at, revenue_cat_status, stripe_customer_id FROM users WHERE created_at >= $1 OR updated_at >= $1 ORDER BY created_at DESC`;
             try {
                 const usersFallback = await executeQueryUsingPool(fallbackQuery, [ThirtyDaysAgo]);
                 const nonInternalUsersFallback = usersFallback.filter(u => !(u.auth0_id?.includes('@focusbear')));
                 console.log(`   [Fetcher] ✅ Fallback fetch successful (${nonInternalUsersFallback.length} users).`);
                 return nonInternalUsersFallback.map(u => ({ ...u, team_id: null })); // Add null team_id
             } catch (fallbackError) { console.error("❌ [Fetcher] Error fetching users in fallback:", fallbackError); return []; }
        } else { console.error("❌ [Fetcher] Error fetching users:", error); return []; }
    }
};

/**
 * Fetches relevant track events for a list of user IDs.
 * @param {Array<string>} userIds - Array of user DB IDs.
 * @returns {Promise<object>} Object mapping user ID to an array of track events.
 */
const fetchTrackEventsForUsers = async (userIds) => {
    if (!Array.isArray(userIds) || userIds.length === 0) return {};
    console.log(`⏳ [Fetcher] Fetching track events for ${userIds.length} users...`);
    const userChunks = chunkArray(userIds, 200); let allEvents = [];
    // Get relevant event types from constants
    const eventTypes = Object.values(eventTypeConstant).filter(v => typeof v === 'string' && !['user_data_team_id', 'morning', 'evening', 'breaking', 'focus-mode'].includes(v));
    for (const chunk of userChunks) {
        const query = `SELECT user_id, created_at, event_type, event_data, operating_system FROM public.track_event WHERE user_id = ANY($1::uuid[]) AND event_type = ANY($2::text[]) ORDER BY user_id, created_at ASC`;
        try { allEvents = allEvents.concat(await executeQueryUsingPool(query, [chunk, eventTypes])); }
        catch (error) { console.error(`   [Fetcher] ❌ Error fetching track events chunk:`, error); }
    }
    console.log(`✅ [Fetcher] Fetched ${allEvents.length} total track events.`);
    return groupDataByKey(allEvents, 'user_id');
};

/**
 * Fetches activities for a list of user IDs.
 * @param {Array<string>} userIds - Array of user DB IDs.
 * @returns {Promise<object>} Object mapping user ID to an array of activities.
 */
const fetchActivitiesForUsers = async (userIds) => {
    if (!Array.isArray(userIds) || userIds.length === 0) return {};
    console.log(`⏳ [Fetcher] Fetching activities for ${userIds.length} users...`);
     const query = `SELECT user_id, id, created_at, updated_at, activity_type FROM activities WHERE user_id = ANY($1::uuid[]) ORDER BY user_id, created_at ASC`;
    const userChunks = chunkArray(userIds, 500); let allActivities = [];
     for (const chunk of userChunks) {
        try { allActivities = allActivities.concat(await executeQueryUsingPool(query, [chunk])); }
        catch (error) { console.error(`   [Fetcher] ❌ Error fetching activities chunk:`, error); }
     }
    console.log(`✅ [Fetcher] Fetched ${allActivities.length} activities.`); return groupDataByKey(allActivities, 'user_id');
};

/**
 * Fetches focus modes for a list of user IDs.
 * @param {Array<string>} userIds - Array of user DB IDs.
 * @returns {Promise<object>} Object mapping user ID to an array of focus modes.
 */
const fetchFocusModesForUsers = async (userIds) => {
    if (!Array.isArray(userIds) || userIds.length === 0) return {};
    console.log(`⏳ [Fetcher] Fetching focus modes for ${userIds.length} users...`);
     const query = `SELECT user_id, id, created_at FROM focus_modes WHERE user_id = ANY($1::uuid[]) ORDER BY user_id, created_at ASC`;
    const userChunks = chunkArray(userIds, 500); let allFocusModes = [];
     for (const chunk of userChunks) {
        try { allFocusModes = allFocusModes.concat(await executeQueryUsingPool(query, [chunk])); }
        catch (error) { console.error(`   [Fetcher] ❌ Error fetching focus modes chunk:`, error); }
     }
    console.log(`✅ [Fetcher] Fetched ${allFocusModes.length} focus modes.`); return groupDataByKey(allFocusModes, 'user_id');
};

/**
 * Fetches device records for a list of user DB IDs.
 * @param {Array<string>} userDbIds - Array of user DB IDs.
 * @returns {Promise<object>} Object mapping user ID to an array of device records.
 */
const fetchDevicesForUsers = async (userDbIds) => {
    if (!Array.isArray(userDbIds) || userDbIds.length === 0) return {};
    console.log(`⏳ [Fetcher] Fetching devices for ${userDbIds.length} users (by DB ID)...`);
    const query = `SELECT user_id, operating_system, created_at FROM public.devices WHERE user_id = ANY($1::uuid[]) ORDER BY user_id, created_at ASC`;
    const chunks = chunkArray(userDbIds, 500); let allDevices = [];
    for (const chunk of chunks) {
         try { allDevices = allDevices.concat(await executeQueryUsingPool(query, [chunk])); }
         catch (error) { console.error(`   [Fetcher] ❌ Error fetching devices chunk:`, error); }
    }
    console.log(`✅ [Fetcher] Fetched ${allDevices.length} device records.`); return groupDataByKey(allDevices, 'user_id');
};


/**
 * Orchestrates fetching all data needed for the onboarding report.
 * Determines primary OS for each user (DB first, then Auth0 fallback).
 * @returns {Promise<object>} Object containing fetched data: { users, trackEventsByUser, activitiesByUser, focusModesByUser, userPrimaryOsMap }.
 */
const fetchOnboardingReportData = async () => {
    // 1. Get relevant users
    const users = await fetchUserUpdatedIn45Days();
    if (!users || users.length === 0) {
        console.log("[Orchestrator] No users found for onboarding report.");
        return { users: [], trackEventsByUser: {}, activitiesByUser: {}, focusModesByUser: {}, userPrimaryOsMap: new Map() };
    }
    const userIds = users.map(u => u.id);
    
    // 2. Bulk fetch all related data in parallel
    console.log("[Orchestrator] Starting parallel bulk data fetch (TrackEvents, Activities, FocusModes, Devices)... This may take a moment...");
    let progressDots = "";
    const progressInterval = setInterval(() => {
        progressDots += ".";
        if (progressDots.length > 3) progressDots = ".";
        process.stdout.write(`\r   [Orchestrator] Bulk fetching in progress${progressDots}  `); // \r to overwrite line
     }, 2000); // Log every 2 seconds
    const [
        trackEventsByUser,
        activitiesByUser,
        focusModesByUser,
        devicesByUserDbId
    ] = await Promise.all([
        fetchTrackEventsForUsers(userIds),
        fetchActivitiesForUsers(userIds),
        fetchFocusModesForUsers(userIds),
        fetchDevicesForUsers(userIds) // This is for the original DB devices check
    ]);
    clearInterval(progressInterval); // Stop the progress indicator
    process.stdout.write("\r                                                        \r"); // Clear the progress line

    console.log("✅ [Orchestrator] Completed parallel bulk data fetch."); // This log will now appear after the "in progress" is cleared

    // 3. Determine device OS (DB first, then Auth0 fallback)
    console.log("⚙️ [Orchestrator] Determining primary OS for users...");
    const userPrimaryOsMap = new Map();
    const usersNeedingAuth0Check = [];

    for (const user of users) {
        const userDbDevices = devicesByUserDbId[user.id] || [];
        const validDbDevices = userDbDevices.filter(d => d.operating_system && d.operating_system !== UNKNOWN_OPERATING_SYSTEM);

        if (validDbDevices.length > 0) {
             userPrimaryOsMap.set(user.id, validDbDevices[0].operating_system);
        } else {
            if (user.auth0_id) { usersNeedingAuth0Check.push(user.auth0_id); }
            userPrimaryOsMap.set(user.id, UNKNOWN_OPERATING_SYSTEM);
        }
    }

    // Fetch Auth0 credentials ONLY for those needing it
    if (usersNeedingAuth0Check.length > 0) {
        console.log(`🚀[Orchestrator] Need to check Auth0 credentials for ${usersNeedingAuth0Check.length} users.`);
        const rawCredentials = await fetchDeviceCredentials(usersNeedingAuth0Check);
        const auth0CredentialsByUser = parseDeviceFromCredentials(rawCredentials);

        // --- MODIFIED LOGGING SECTION ---
        let updatedByAuth0Count = 0;
        let stillUnknownAfterAuth0WithCreds = 0;
        let stillUnknownAfterAuth0NoCreds = 0;

        for (const user of users) {
            const auth0Id = user.auth0_id;
            // Check if this user was in the list for Auth0 check and its OS is still Unknown
            if (userPrimaryOsMap.get(user.id) === UNKNOWN_OPERATING_SYSTEM && usersNeedingAuth0Check.includes(auth0Id)) {
                if (auth0Id && auth0CredentialsByUser[auth0Id]?.length > 0) {
                     const auth0Devices = auth0CredentialsByUser[auth0Id];
                     const firstAuth0Os = auth0Devices[0].operating_system; // Assuming first is primary
                     if (firstAuth0Os && firstAuth0Os !== UNKNOWN_OPERATING_SYSTEM) {
                         userPrimaryOsMap.set(user.id, firstAuth0Os);
                         updatedByAuth0Count++;
                         // console.log(`   [Orchestrator] User ${user.id} (Auth0 ${auth0Id}): Updated OS to '${firstAuth0Os}' via Auth0.`); // Old verbose log
                     } else {
                         stillUnknownAfterAuth0WithCreds++;
                         // console.log(`   [Orchestrator] User ${user.id} (Auth0 ${auth0Id}): Auth0 check attempted, credentials found but OS unparsable. Remains Unknown.`); // Old verbose log
                     }
                } else {
                     stillUnknownAfterAuth0NoCreds++;
                     // console.log(`   [Orchestrator] User ${user.id} (Auth0 ${auth0Id}): Auth0 check attempted, no usable credentials found. Remains Unknown.`); // Old verbose log
                }
            }
        }

        // Consolidated Log Messages
        if (updatedByAuth0Count > 0) {
            console.log(`🚀[Orchestrator] ✅ Updated OS for ${updatedByAuth0Count} user(s) via Auth0 credentials.`);
        }
        if (stillUnknownAfterAuth0WithCreds > 0) {
            console.log(`🚀[Orchestrator] ⚠️ ${stillUnknownAfterAuth0WithCreds} user(s) had Auth0 credentials but OS could not be parsed; remain Unknown.`);
        }
        if (stillUnknownAfterAuth0NoCreds > 0) {
            console.log(`🚀[Orchestrator] ℹ️ ${stillUnknownAfterAuth0NoCreds} user(s) had no usable Auth0 credentials found; remain Unknown after check.`);
        }
        if (updatedByAuth0Count === 0 && stillUnknownAfterAuth0WithCreds === 0 && stillUnknownAfterAuth0NoCreds === 0 && usersNeedingAuth0Check.length > 0) {
            console.log(`🚀[Orchestrator] ℹ️ All ${usersNeedingAuth0Check.length} users requiring Auth0 check either had no credentials or OS was unparsable.`);
        }
        // --- END MODIFIED LOGGING SECTION ---

    } else {
        console.log("🚀[Orchestrator] No users required an Auth0 credential check for OS determination.");
    }
    console.log("✅ [Orchestrator] Primary OS determined.");

    return { users, trackEventsByUser, activitiesByUser, focusModesByUser, userPrimaryOsMap };
};

module.exports = {
    fetchUserUpdatedIn45Days,
    fetchTrackEventsForUsers,
    fetchActivitiesForUsers,
    fetchFocusModesForUsers,
    fetchDevicesForUsers, // Keep exporting as it's part of the original fallback OS logic
    fetchOnboardingReportData,
};

