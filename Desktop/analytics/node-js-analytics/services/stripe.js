// Stripe API integration for fetching subscription and customer data
// This module provides functions to retrieve subscription details and new subscribers from Stripe.

// Requires the initialized stripe client
const { stripe } = require('../Config/clients'); // Adjust path as needed

/**
 * Retrieves subscription details for a given Stripe Customer ID.
 * WARNING: Can be slow if called repeatedly. Use bulk methods where possible.
 * @param {string} stripeCustomerId - The Stripe Customer ID.
 * @returns {Promise<Array<object> | null>} Array of subscription details or null on error/no ID.
 */
const getSubscriptionByUserId = async (stripeCustomerId) => {
    if (!stripe) {
        console.warn("Stripe client not initialized, cannot get subscription by user ID.");
        return null;
    }
    if (!stripeCustomerId) {
        // console.log("   [Stripe] No Stripe Customer ID provided for getSubscriptionByUserId.");
        return null;
    }

    try {
        // console.log(`   [Stripe] Fetching subscriptions for Customer ID: ${stripeCustomerId}...`);
        const subscriptions = await stripe.subscriptions.list({
            customer: stripeCustomerId,
            status: 'all', // Get all statuses
            limit: 10 // Usually sufficient
        });
        // console.log(`   [Stripe] Found ${subscriptions.data.length} subscriptions for ${stripeCustomerId}.`);
        return subscriptions.data.map((sub) => ({
            subscriptionId: sub.id,
            status: sub.status,
            startDate: new Date(sub.created * 1000),
            // Add other fields if needed (current_period_end, etc.)
        }));
    } catch (error) {
        if (error.statusCode === 429) {
            console.warn(`   ⚠️ Stripe Rate Limit hit for customer ${stripeCustomerId}.`);
        } else {
            console.error(`   ❌ Error retrieving Stripe subscriptions for ${stripeCustomerId}:`, error.message);
        }
        return null; // Return null on error
    }
};

/**
 * Fetches all new Stripe subscriptions created since a specified date. Handles pagination.
 * @param {Date} fromDate - The starting date to fetch subscriptions from.
 * @returns {Promise<Array<object>>} A promise resolving to an array of subscription objects (with customer details).
 */
const getAllNewSubscribersFromStripe = async (fromDate) => {
    if (!stripe) {
        console.warn("Stripe client not initialized, cannot get new subscribers.");
        return [];
    }
    console.log(`⏳ Fetching new subscribers from Stripe since ${fromDate.toISOString()}...`);
    let allSubscribers = [];
    let startingAfter = undefined;
    const fromTimestamp = Math.floor(fromDate.getTime() / 1000);

    try {
        while (true) {
            const options = {
                limit: 100,
                expand: ["data.customer"], // Need customer ID/email
                created: { gte: fromTimestamp }, // Filter server-side
            };
            if (startingAfter) {
                options.starting_after = startingAfter;
            }

            console.log(`   Stripe Subs: Requesting page${startingAfter ? ` after ${startingAfter}` : ''}...`);
            const subscriptions = await stripe.subscriptions.list(options);

            if (!subscriptions.data || subscriptions.data.length === 0) {
                console.log(`   Stripe Subs: No more subscriptions found.`);
                break;
            }
            allSubscribers = allSubscribers.concat(subscriptions.data);
            console.log(`   Stripe Subs: Retrieved ${subscriptions.data.length}. Total: ${allSubscribers.length}`);

            if (!subscriptions.has_more) {
                console.log(`   Stripe Subs: Last page reached.`);
                break;
            }
            startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
            // Safety break
            if (allSubscribers.length > 10000) { // Adjust limit if needed
                console.warn("⚠️ Stripe subscription fetch limit reached (10k). Exiting loop.");
                break;
            }
        }
        console.log(`✅ Fetched ${allSubscribers.length} new subscriptions from Stripe.`);
        // Map to desired format, ensuring customer object exists
        return allSubscribers.map((sub) => {
            const customer = sub.customer;
            if (!customer || typeof customer !== 'object' || customer.deleted) {
                console.warn(`   ⚠️ Subscription ${sub.id} has missing or deleted customer.`);
                return null; // Skip this one
            }
            return {
                id: sub.id, // Subscription ID
                customer_id: customer.id,
                name: customer.name, // May be null
                email: customer.email, // May be null
                created_at: new Date(sub.created * 1000), // Subscription creation date
                status: sub.status
            };
        }).filter(Boolean); // Remove null entries

    } catch (error) {
        console.error("❌ Stripe Error fetching subscriptions:", error.message);
        if (error.requestId) console.error(`   Stripe Request ID: ${error.requestId}`);
        return []; // Return empty array on error
    }
};

/**
 * Fetches all Stripe customers created since a specified date. Handles pagination.
 * Used for signup tracking if relying on Stripe customer creation.
 * @param {Date} fromDate - The starting date to fetch customers from.
 * @returns {Promise<Array<object>>} A promise resolving to an array of simplified customer objects.
 */
const getAllNewUserSignupsFromStripe = async (fromDate) => {
    if (!stripe) {
        console.warn("Stripe client not initialized, cannot get new user signups.");
        return [];
    }
    console.log(`⏳ Fetching new customers (signups) from Stripe since ${fromDate.toISOString()}...`);
    try {
        let allSignups = [];
        let hasMore = true;
        let startingAfter = null;
        const fromTimestamp = Math.floor(fromDate.getTime() / 1000);

        while (hasMore) {
            const options = {
                limit: 100,
                created: { gte: fromTimestamp } // Filter server-side
            };
            if (startingAfter) {
                options.starting_after = startingAfter;
            }
            console.log(`   Stripe Customers: Requesting page${startingAfter ? ` after ${startingAfter}` : ''}...`);
            const customers = await stripe.customers.list(options);

            if (!customers.data || customers.data.length === 0) {
                 console.log(`   Stripe Customers: No more customers found.`);
                 break;
            }
            allSignups = allSignups.concat(customers.data);
             console.log(`   Stripe Customers: Retrieved ${customers.data.length}. Total: ${allSignups.length}`);


            hasMore = customers.has_more;
            startingAfter = customers.data.length > 0 ? customers.data[customers.data.length - 1].id : null;

            // Exit conditions
            if (!hasMore) {
                console.log(`   Stripe Customers: Last page reached.`);
                 break;
            }
            if (!startingAfter) { // Safety break if ID isn't returned but has_more was true
                console.warn("⚠️ Stripe customers list: starting_after is null but loop expected more. Breaking.");
                break;
            }
             // Safety break
            if (allSignups.length > 20000) { // Adjust limit if needed
                console.warn("⚠️ Stripe customer fetch limit reached (20k). Exiting loop.");
                break;
            }
        }
        console.log(`✅ Fetched ${allSignups.length} new customers from Stripe.`);
        // Map to the format expected by the calling script
        return allSignups.map((m) => ({
            id: m.id, // Stripe Customer ID
            name: m.name,
            email: m.email,
            // Extract relevant metadata if needed (like original OS source)
            os: m.metadata?.platform || "", // Example metadata field
            isInternalUser: m.metadata?.is_internal_user || "", // Example metadata field
            created_at: new Date(m.created * 1000), // Customer creation timestamp
        }));
    } catch (error) {
        console.error("❌ Stripe Error fetching customers:", error.message);
         if (error.requestId) console.error(`   Stripe Request ID: ${error.requestId}`);
        return []; // Return empty array on error
    }
};

module.exports = {
    getSubscriptionByUserId,
    getAllNewSubscribersFromStripe,
    getAllNewUserSignupsFromStripe,
};

// --- END OF FILE services/stripe.js ---