// Description: This script generates a conversion rate report for a given period (last 30 days and last 24 hours) and writes the results to a file. 
// It fetches data from Auth0 and Stripe, processes it, and formats the output. The script is modularized for better organization and maintainability.

// 1. Load Environment Variables First!
require('./Config/load-env.js');

// 2. Require necessary modules/functions
const fs = require('fs'); // Moved fs require higher

// Import functions from the new modular structure
// Config (Optional - might not be needed directly if services handle it)
// const { pool, stripe } = require('./config/clients.js'); // Likely not needed directly
// const constants = require('./config/constants.js'); // Might need OS names if not handled internally

// Services
const { getUserFromAuth0 } = require('./services/auth0');    
const { getAllNewSubscribersFromStripe } = require('./services/stripe');

// Reporting / Data Aggregation
const {
    getDeviceForUser,
    getDeviceForStripeUser,
    getUsersSubscribedNotViaStripe
} = require('./reporting/data-aggregator'); 

// Communication (comment out when testing)
const { logEventInCliq } = require('./communication/cliq');

// --- Helper Function ---
const toArray = v => Array.isArray(v) ? v : (v ? [v] : []); // Modified to handle non-array truthy values

// --- Configuration ---
const filePath = "conversion-rate.txt";

// Calculate date ranges
const from30Days = new Date();
from30Days.setDate(from30Days.getDate() - 30);

const from24Hours = new Date();
from24Hours.setDate(from24Hours.getDate() - 1);

// --- Reporting Functions (Keep these as they are local to this script) ---
const getConversionRate = async (subUsers, signUpUsers) => {
    // Add null/undefined checks for safety
    const safeSubUsers = subUsers || [];
    const safeSignUpUsers = signUpUsers || [];
    const totalSignups = safeSignUpUsers.length;
    const totalSubs = safeSubUsers.length;

    // Helper to calculate rate safely
    const calculateRate = (subs, signs) => {
        const subCount = subs.length;
        const signCount = signs.length;
        if (signCount === 0) return "0.00"; // Avoid division by zero
        return ((subCount / signCount) * 100).toFixed(2);
    };

    // Filter functions (handle potential missing 'os' property)
    const filterByOS = (arr, osName) => (arr || []).filter(f => f?.os === osName); // Exact match now based on getDeviceForUser logic

    const macSubs = filterByOS(safeSubUsers, 'MacOS');
    const macSigns = filterByOS(safeSignUpUsers, 'MacOS');
    const winSubs = filterByOS(safeSubUsers, 'Windows');
    const winSigns = filterByOS(safeSignUpUsers, 'Windows');
    const iosSubs = filterByOS(safeSubUsers, 'iOS');
    const iosSigns = filterByOS(safeSignUpUsers, 'iOS');
    const androidSubs = filterByOS(safeSubUsers, 'Android');
    const androidSigns = filterByOS(safeSignUpUsers, 'Android');

    const content = `
  Message 1: conversion rate
    \u2022 total conversion rate (last 30 days): ${calculateRate(safeSubUsers, safeSignUpUsers)}% (${totalSubs}/${totalSignups})
    \u2022 total conversion rate Mac (last 30 days): ${calculateRate(macSubs, macSigns)}% (${macSubs.length}/${macSigns.length})
    \u2022 total conversion rate Windows (last 30 days): ${calculateRate(winSubs, winSigns)}% (${winSubs.length}/${winSigns.length})
    \u2022 total conversion rate iOS (last 30 days): ${calculateRate(iosSubs, iosSigns)}% (${iosSubs.length}/${iosSigns.length})
    \u2022 total conversion rate Android (last 30 days): ${calculateRate(androidSubs, androidSigns)}% (${androidSubs.length}/${androidSigns.length})`;

  return content;
};

const getSignupConversionRate = async (users, userFromLast24h) => {
    const safeUsers = users || [];
    const safeUsers24h = userFromLast24h || [];

    // Filter function (handles missing 'os')
    const filterByOS = (arr, osName) => (arr || []).filter(f => f?.os === osName);
    const filterUnknown = (arr) => (arr || []).filter(f => !f?.os || f?.os === 'Unknown');

    const content = `
  Message 2: signups
    \u2022 total signups: ${safeUsers24h.length} (last 24hrs) / ${safeUsers.length} (last 30 days)
    \u2022 Mac: ${filterByOS(safeUsers24h, 'MacOS').length} (last 24hrs) / ${filterByOS(safeUsers, 'MacOS').length} (last 30 days)
    \u2022 Windows: ${filterByOS(safeUsers24h, 'Windows').length} (last 24hrs) / ${filterByOS(safeUsers, 'Windows').length} (last 30 days)
    \u2022 iOS: ${filterByOS(safeUsers24h, 'iOS').length} (last 24hrs) / ${filterByOS(safeUsers, 'iOS').length} (last 30 days)
    \u2022 Android: ${filterByOS(safeUsers24h, 'Android').length} (last 24hrs) / ${filterByOS(safeUsers, 'Android').length} (last 30 days)
    \u2022 Signups (unknown source): ${filterUnknown(safeUsers24h).length} (last 24hrs) / ${filterUnknown(safeUsers).length} (last 30 days)`;

  return content;
};

const getSubscriptionConversionRate = async (users, userFromLast24h) => {
    const safeUsers = users || [];
    const safeUsers24h = userFromLast24h || [];

    // Filter function
    const filterByOS = (arr, osName) => (arr || []).filter(f => f?.os === osName);
    const filterUnknown = (arr) => (arr || []).filter(f => !f?.os || f?.os === 'Unknown'); // Add unknown filter

    const content = `
  Message 3: subscriptions
    \u2022 total subscriptions: ${safeUsers24h.length} (last 24hrs) / ${safeUsers.length} (last 30 days)
    \u2022 Mac: ${filterByOS(safeUsers24h, 'MacOS').length} (last 24hrs) / ${filterByOS(safeUsers, 'MacOS').length} (last 30 days)
    \u2022 Windows: ${filterByOS(safeUsers24h, 'Windows').length} (last 24hrs) / ${filterByOS(safeUsers, 'Windows').length} (last 30 days)
    \u2022 iOS: ${filterByOS(safeUsers24h, 'iOS').length} (last 24hrs) / ${filterByOS(safeUsers, 'iOS').length} (last 30 days)
    \u2022 Android: ${filterByOS(safeUsers24h, 'Android').length} (last 24hrs) / ${filterByOS(safeUsers, 'Android').length} (last 30 days)
    \u2022 Subscriptions (unknown source): ${filterUnknown(safeUsers24h).length} (last 24hrs) / ${filterUnknown(safeUsers).length} (last 30 days)`; // Added unknown

  return content;
};

// Union function (Keep as is)
function unionArrays(arr1 = [], arr2 = [], key) { // Added default empty arrays
  const map = new Map();
  if (!key) {
      console.error("UnionArrays requires a key.");
      return [];
  }
  // Add all objects from the first array to the map
  arr1.forEach((item) => item && item[key] && map.set(item[key], item)); // Add checks

  // Add all objects from the second array to the map (overwriting duplicates)
  arr2.forEach((item) => item && item[key] && map.set(item[key], item)); // Add checks

  // Convert the map values to an array
  return Array.from(map.values());
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- Main Execution Logic ---
const main = async () => {
  console.log("🚀 Starting Conversion Rate Generation...");
  let conversionRate = "";
  let signUps = "";
  let subscriptions = "";

  try {
    // Use Promise.all to fetch independent data concurrently
    console.log("⏳ Fetching data concurrently...");
    const [
        auth0UsersList,         // Raw Auth0 users (30d)
        auth0UsersList24h,      // Raw Auth0 users (24h)
        stripeSubsList,         // Raw Stripe subs (30d)
        stripeSubsList24h,      // Raw Stripe subs (24h)
        nonStripeSubsList       // Raw RevenueCat subs (30d, already filtered in helper)
    ] = await Promise.all([
        getUserFromAuth0(from30Days),
        getUserFromAuth0(from24Hours),
        getAllNewSubscribersFromStripe(from30Days),
        getAllNewSubscribersFromStripe(from24Hours),
        getUsersSubscribedNotViaStripe(from30Days) // Fetches for last 30d, will filter for 24h later
    ]);
    console.log("✅ Concurrent data fetching complete.");

    // Process data that depends on the previous fetches
    // Get device info for Auth0 signups (can also run concurrently for 30d and 24h)
    console.log("⏳ Processing device info for signups...");
    const [
        auth0UserDevices,       // Processed Auth0 users with devices (30d)
        auth0UserDevices24h     // Processed Auth0 users with devices (24h)
    ] = await Promise.all([
         getDeviceForUser(auth0UsersList),
         getDeviceForUser(auth0UsersList24h)
    ]);
    console.log("✅ Device info for signups processed.");

    // Get device info for Stripe subscribers (can also run concurrently)
    console.log("⏳ Processing device info for Stripe subscribers...");
     const [
        stripeSubDevices,       // Processed Stripe subs with devices (30d)
        stripeSubDevices24h     // Processed Stripe subs with devices (24h)
    ] = await Promise.all([
        getDeviceForStripeUser(stripeSubsList),
        getDeviceForStripeUser(stripeSubsList24h)
    ]);
    console.log("✅ Device info for Stripe subscribers processed.");

    // Filter non-stripe subs for last 24h (simple filter, quick)
    const nonStripeSubsList24h = nonStripeSubsList.filter(
      (f) => f.created_at >= from24Hours
    );

    // Combine subscribers (use results with devices)
    console.log("⏳ Combining subscriber data...");
    // Pass the processed device arrays to unionArrays
    const combinedSubUsers = unionArrays(
      stripeSubDevices, // Already includes device info
      nonStripeSubsList, // Already includes assumed device info
      "user_id" // Union based on user_id (assuming this is the common key, adjust if needed)
      // Make sure both inputs have a 'user_id' property and the OS info ('os')
    );
    const combinedSubUsers24h = unionArrays(
      stripeSubDevices24h,
      nonStripeSubsList24h,
      "user_id" // Use the same key
    );
     console.log("✅ Subscriber data combined.");


    // Generate report messages
    console.log("📝 Generating report messages...");
    // Pass the processed device arrays
    conversionRate = await getConversionRate(combinedSubUsers, auth0UserDevices);
    signUps = await getSignupConversionRate(auth0UserDevices, auth0UserDevices24h);
    subscriptions = await getSubscriptionConversionRate(combinedSubUsers, combinedSubUsers24h);
    console.log("✅ Report messages generated.");

    // Post to Cliq
    if (logEventInCliq) { // Check if function exists
        console.log("📤 Sending messages to Cliq...");
        await logEventInCliq(conversionRate, "Conversion Rate");
        await sleep(1000); // Simple delay between messages
        await logEventInCliq(signUps, "Signups");
        await sleep(1000);
        await logEventInCliq(subscriptions, "Subscriptions");
         console.log("✅ Messages sent to Cliq.");
    }

  } catch (error) {
    console.error("❌ Error during conversion rate generation:", error);
    process.exitCode = 1; // Indicate failure
    // Ensure variables are strings even on error to avoid issues writing file
    conversionRate = `ERROR: ${error.message}`;
    signUps = "ERROR";
    subscriptions = "ERROR";
  }

  // --- Output ---
  console.log("\n--- Conversion Rate Report ---");
  console.log(conversionRate);
  console.log(signUps);
  console.log(subscriptions);
  console.log("------------------------------");

  // Write to file
  try {
    console.log(`💾 Writing results to ${filePath}...`);
    fs.writeFileSync(
      filePath,
      `${conversionRate}\n\n${signUps}\n\n${subscriptions}`,
      'utf8'
    );
    console.log(`✅ Results written to ${filePath}`);
  } catch (writeError) {
    console.error("❌ Error writing results to file:", writeError);
    if (!process.exitCode) process.exitCode = 1; // Indicate failure if not already set
  }

  console.log("🏁 Conversion Rate Generation Finished.");
};

// Execute main function
main();

// --- END OF FILE generate-conversion-rate.js ---