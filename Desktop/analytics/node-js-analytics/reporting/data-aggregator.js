// This file aggregates device and subscription information for users.
// It fetches data from the database and Auth0, processes it, and returns structured data for reporting.

const moment = require('moment'); // For date calculations

// Configurations and Constants
const {
    UNKNOWN_OPERATING_SYSTEM,
    ANDROID_OPERATION_SYSTEM,
} = require('../Config/constants'); 

// Services
const { executeQueryUsingPool } = require('../services/db'); 
const { fetchDeviceCredentials } = require('../services/auth0'); 
const { getSubscriptionByUserId } = require('../services/stripe'); 

// Utilities
const { chunkArray, groupDataByKey } = require('../utils/core-utils');
const { buildOsCombination, parseDeviceFromCredentials } = require('../utils/os-utils');

/**
 * Aggregates device and subscription information for a list of Auth0 users.
 * Fetches data primarily from the DB, falling back to Auth0 for device info if needed.
 * Relies on DB for subscription status by default.
 * @param {Array<object>} auth0Users - Array of user objects from Auth0 (must include user_id, email, name, created_at).
 * @returns {Promise<Array<object>>} Array of processed user data objects for reporting.
 */
const getDeviceForUser = async (auth0Users) => {
    if (!Array.isArray(auth0Users) || auth0Users.length === 0) return [];
    console.log(`⏳ [Aggregator] Processing device/sub info for ${auth0Users.length} Auth0 users...`);

    const auth0Ids = auth0Users.map(u => u.user_id);
    const auth0IdChunks = chunkArray(auth0Ids, 500);
    let dbUsers = [];
    let dbDevices = [];

    // --- Fetch DB Data ---
    console.log(`   [Aggregator] Fetching user details from DB...`);
    for (const chunk of auth0IdChunks) {
        const userQuery = `SELECT id, auth0_id, stripe_customer_id, revenue_cat_status, created_at FROM users WHERE auth0_id = ANY($1::text[])`;
        try { dbUsers = dbUsers.concat(await executeQueryUsingPool(userQuery, [chunk])); }
        catch (e) { console.error("   [Aggregator] ❌ Failed to fetch user details chunk from DB", e); }
    }
    const dbUserMap = new Map(dbUsers.map(u => [u.auth0_id, u]));
    console.log(`   [Aggregator] Found ${dbUserMap.size} matching users in DB.`);

    const userDbIds = dbUsers.map(u => u.id).filter(Boolean);
    const userDbIdChunks = chunkArray(userDbIds, 500);

    console.log(`   [Aggregator] Fetching device details from DB...`);
    for (const chunk of userDbIdChunks) {
        const deviceQuery = `SELECT user_id, operating_system, created_at AS device_created_at FROM devices WHERE user_id = ANY($1::uuid[]) ORDER BY user_id, device_created_at ASC`;
        try { dbDevices = dbDevices.concat(await executeQueryUsingPool(deviceQuery, [chunk])); }
        catch (e) { console.error("   [Aggregator] ❌ Failed to fetch device details chunk from DB", e); }
    }
    const dbDevicesByUserDbId = groupDataByKey(dbDevices, 'user_id');
    console.log(`   [Aggregator] Found ${dbDevices.length} device records in DB.`);
    // --- End Fetch DB Data ---

    // --- Determine OS (DB First, Auth0 Fallback) ---
    const usersNeedingAuth0Check = [];
    const initialDeviceDataMap = new Map();

    for (const auth0User of auth0Users) {
        const dbUser = dbUserMap.get(auth0User.user_id);
        if (!dbUser) {
            console.log(`   [Aggregator] User ${auth0User.user_id}: Not found in DB. Assigning Unknown.`);
            initialDeviceDataMap.set(auth0User.user_id, { os: UNKNOWN_OPERATING_SYSTEM, osCombination: UNKNOWN_OPERATING_SYSTEM, devices: [] });
            continue;
        }
        const userDbDevices = dbDevicesByUserDbId[dbUser.id] || [];
        const validDbDevices = userDbDevices.filter(d => d.operating_system && d.operating_system !== UNKNOWN_OPERATING_SYSTEM);
        if (validDbDevices.length > 0) {
            const firstOs = validDbDevices[0].operating_system;
            // console.log(`   [Aggregator] User ${auth0User.user_id}: Found OS '${firstOs}' in DB.`); // Logged if needed
            initialDeviceDataMap.set(auth0User.user_id, { os: firstOs, osCombination: buildOsCombination(validDbDevices), devices: validDbDevices });
        } else {
            // console.log(`   [Aggregator] User ${auth0User.user_id}: No valid devices in DB. Marking for Auth0 check.`); // Logged if needed
            usersNeedingAuth0Check.push(auth0User.user_id);
            initialDeviceDataMap.set(auth0User.user_id, { os: UNKNOWN_OPERATING_SYSTEM, osCombination: UNKNOWN_OPERATING_SYSTEM, devices: [] });
        }
    }
    console.log(`   [Aggregator] ${usersNeedingAuth0Check.length} users marked for potential Auth0 device credential check.`);

    let auth0CredentialsByUser = {};
    if (usersNeedingAuth0Check.length > 0) {
        const rawCredentials = await fetchDeviceCredentials(usersNeedingAuth0Check); // Uses delays
        auth0CredentialsByUser = parseDeviceFromCredentials(rawCredentials); // Uses enhanced logging
    }
    // --- End Determine OS ---


    // --- Combine Results & Determine Subscription ---
    const finalUserData = [];
    console.log(`   [Aggregator] Combining data and determining subscription status (from DB)...`);
    for (const auth0User of auth0Users) {
        const auth0Id = auth0User.user_id;
        const initialDeviceData = initialDeviceDataMap.get(auth0Id);
        let finalOs = initialDeviceData?.os || UNKNOWN_OPERATING_SYSTEM;
        let finalOsCombination = initialDeviceData?.osCombination || UNKNOWN_OPERATING_SYSTEM;
        let auth0CheckAttempted = usersNeedingAuth0Check.includes(auth0Id);

        if (auth0CheckAttempted && auth0CredentialsByUser[auth0Id]?.length > 0) {
            const auth0Devices = auth0CredentialsByUser[auth0Id];
            finalOs = auth0Devices[0].operating_system; // Assuming first is primary
            finalOsCombination = buildOsCombination(auth0Devices);
        }

        // Log final OS determination if Auth0 was checked
        if (auth0CheckAttempted) {
            const initialOs = initialDeviceData?.os || UNKNOWN_OPERATING_SYSTEM;
            if (finalOs !== initialOs && finalOs !== UNKNOWN_OPERATING_SYSTEM) {
                 console.log(`   [Aggregator] User ${auth0Id}: Updated OS to '${finalOs}' via Auth0.`);
            } else if (finalOs === UNKNOWN_OPERATING_SYSTEM && initialOs === UNKNOWN_OPERATING_SYSTEM) {
                const credsFound = auth0CredentialsByUser[auth0Id]?.length > 0;
                console.log(`   [Aggregator] User ${auth0Id}: Auth0 check done. ${credsFound ? 'Could not parse OS from credentials.' : 'No usable credentials found.'} Remains Unknown.`);
            }
        }

        const dbUser = dbUserMap.get(auth0Id);
        let isSubscribed = false;
        if (dbUser) {
            if (dbUser.revenue_cat_status === 'personal') { isSubscribed = true; }
            // Stripe check remains commented out
            // else if (dbUser.stripe_customer_id && stripe) { /* ... call getSubscriptionByUserId ... */ }
        }

        // Filter internal users before adding
        if (auth0User.email && !auth0User.email.includes("@focusbear")) {
            finalUserData.push({
                auth_id: auth0Id, email: auth0User.email, name: auth0User.name,
                created_at: auth0User.created_at, db_created_at: dbUser?.created_at,
                os: finalOs, osCombination: finalOsCombination, isSubscribed: isSubscribed,
                // Do not include full subscription list unless explicitly needed downstream
            });
        }
    }
    console.log(`✅ [Aggregator] Processed device/sub info for ${finalUserData.length} non-internal users.`);
    return finalUserData;
};

/**
 * Aggregates device information for a list of Stripe customers.
 * Fetches data only from the DB based on stripe_customer_id.
 * @param {Array<object>} stripeCustomers - Array of customer objects (must include customer_id, email, name, created_at).
 * @returns {Promise<Array<object>>} Array of processed user data objects for reporting.
 */
const getDeviceForStripeUser = async (stripeCustomers) => {
    if (!Array.isArray(stripeCustomers) || stripeCustomers.length === 0) return [];
    console.log(`⏳ [Aggregator] Processing device info for ${stripeCustomers.length} Stripe customers...`);

    const customerIds = stripeCustomers.map(c => c.customer_id).filter(Boolean);
    if (customerIds.length === 0) { console.log("   [Aggregator] No valid Stripe customer IDs provided."); return []; }

    // --- Fetch DB Data ---
    const customerIdChunks = chunkArray(customerIds, 500);
    let dbUsers = []; let dbDevices = [];
    console.log(`   [Aggregator] Fetching user details from DB via Stripe ID...`);
    for (const chunk of customerIdChunks) {
        const userQuery = `SELECT id, auth0_id, stripe_customer_id, created_at FROM users WHERE stripe_customer_id = ANY($1::text[])`;
        try { dbUsers = dbUsers.concat(await executeQueryUsingPool(userQuery, [chunk])); }
        catch(e) { console.error("   [Aggregator] ❌ Failed to fetch Stripe user details chunk from DB", e); }
    }
    const dbUserMap = new Map(dbUsers.map(u => [u.stripe_customer_id, u]));
    console.log(`   [Aggregator] Found ${dbUserMap.size} matching users in DB for Stripe IDs.`);

    const userDbIds = dbUsers.map(u => u.id).filter(Boolean);
    const userDbIdChunks = chunkArray(userDbIds, 500);
    console.log(`   [Aggregator] Fetching device details from DB for Stripe-matched users...`);
    for (const chunk of userDbIdChunks) {
        const deviceQuery = `SELECT user_id, operating_system, created_at AS device_created_at FROM devices WHERE user_id = ANY($1::uuid[]) ORDER BY user_id, device_created_at ASC`;
         try { dbDevices = dbDevices.concat(await executeQueryUsingPool(deviceQuery, [chunk])); }
         catch (e) { console.error("   [Aggregator] ❌ Failed to fetch device details chunk from DB", e); }
    }
    const dbDevicesByUserDbId = groupDataByKey(dbDevices, 'user_id');
    console.log(`   [Aggregator] Found ${dbDevices.length} device records for Stripe-matched users.`);
    // --- End Fetch DB Data ---

    // --- Combine Results ---
    const finalUserData = [];
    for (const stripeCustomer of stripeCustomers) {
        if (!stripeCustomer.customer_id || (stripeCustomer.email && stripeCustomer.email.includes('@focusbear'))) continue;

        const dbUser = dbUserMap.get(stripeCustomer.customer_id);
        let os = UNKNOWN_OPERATING_SYSTEM; let osCombination = UNKNOWN_OPERATING_SYSTEM;

        if (dbUser) {
            const userDbDevices = dbDevicesByUserDbId[dbUser.id] || [];
            const validDbDevices = userDbDevices.filter(d => d.operating_system && d.operating_system !== UNKNOWN_OPERATING_SYSTEM);
            if (validDbDevices.length > 0) {
                os = validDbDevices[0].operating_system; osCombination = buildOsCombination(validDbDevices);
                // console.log(`   [Aggregator] Stripe Customer ${stripeCustomer.customer_id}: Found OS '${os}' in DB.`); // Logged if needed
            } else {
                 console.log(`   [Aggregator] Stripe Customer ${stripeCustomer.customer_id}: No valid devices found in DB. Assigning Unknown.`);
            }
        } else { console.warn(`   [Aggregator] ⚠️ No user found in DB for Stripe Customer ID: ${stripeCustomer.customer_id}`); }

        finalUserData.push({
            stripe_id: stripeCustomer.customer_id, email: stripeCustomer.email, name: stripeCustomer.name,
            created_at: stripeCustomer.created_at, // This is Stripe Sub/Customer creation
            db_user_created_at: dbUser?.created_at, // This is user creation in your DB
            os: os, osCombination: osCombination,
        });
    }
    console.log(`✅ [Aggregator] Processed device info for ${finalUserData.length} Stripe customers.`);
    return finalUserData;
};

/**
 * Fetches users who subscribed via RevenueCat (non-Stripe) since a specified date.
 * @param {Date} fromDate - The starting date for user creation.
 * @returns {Promise<Array<object>>} Array of user objects with assumed mobile OS.
 */
const getUsersSubscribedNotViaStripe = async (fromDate) => {
    console.log(`⏳ [Aggregator] Fetching users subscribed via RevenueCat since ${fromDate.toISOString()}...`);
    const query = `
      SELECT auth0_id, stripe_customer_id, created_at, last_date_revenue_cat_data_synced
      FROM users
      WHERE revenue_cat_status = 'personal' -- Assuming 'personal' means paid
      AND last_date_revenue_cat_data_synced >= $1 -- Recently synced
      AND created_at >= $2`; // Created since fromDate
    const fourteenDaysAgo = moment().subtract(14, 'days').toDate();
    try {
        const users = await executeQueryUsingPool(query, [fourteenDaysAgo, fromDate]);
        console.log(`✅ [Aggregator] Found ${users.length} RevenueCat subscribed users.`);
        return users.map(u => ({
            user_id: u.auth0_id, // Usually the Auth0 ID
            os: ANDROID_OPERATION_SYSTEM, // Assuming mobile, default Android (could refine)
            osCombination: ANDROID_OPERATION_SYSTEM,
            last_date_revenue_cat_data_synced: u.last_date_revenue_cat_data_synced,
            created_at: u.created_at, // User creation date
            stripe_id: u.stripe_customer_id, // Might be null
            isSubscribed: true, // True by query definition
        }));
    } catch (error) {
        console.error("❌ [Aggregator] Error fetching RevenueCat subscribed users. Returning empty list.");
        return []; // Return empty array on error
    }
};



module.exports = {
    getDeviceForUser,
    getDeviceForStripeUser,
    getUsersSubscribedNotViaStripe,
    
};

// --- END OF FILE reporting/data-aggregator.js ---