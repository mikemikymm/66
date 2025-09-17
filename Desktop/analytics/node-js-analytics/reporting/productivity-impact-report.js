// --- START OF FILE reporting/productivity-impact-report.js ---

const moment = require('moment');

// Services & Config
const { executeQueryUsingPool } = require('../services/db.js'); // Adjust path
const { exportToExcel } = require('./excel-export.js'); // Using the simpler exportToExcel for this one, or exportToExcel2 if preferred for multi-sheet
const { UNKNOWN_OPERATING_SYSTEM } = require('../Config/constants.js'); // Just an example if OS was needed, not here.

/**
 * Fetches data related to a specific impact category and logged quantities
 * from activities, completed_activities, and users tables for the last year.
 * @returns {Promise<Array<object>>} Array of objects.
 */
async function fetchProductivityImpactData() {
    console.log(`⏳ [ProductivityReport] Fetching data for ALL impact categories: (last 1 year)...`);

    const oneYearAgo = moment().subtract(4, 'month').toISOString();

    const query = `
        SELECT
            a.id AS activity_id,
            a.impact_category,
            ca.user_id,                         -- This is the user_id from completed_activities (DB UUID)
            u.created_at AS user_signup_date,  -- User's creation date from the users table
            lqa.logged_value AS quantity_logged, -- Assuming this is the correct column for quantity
            ca.created_at AS completion_timestamp -- Timestamp of when the activity was completed
            -- Optionally, include u.auth0_id if you need it for display/linking
            -- , u.auth0_id AS user_auth0_id
        FROM
            activities a
        INNER JOIN -- Changed to INNER JOIN if a completed_activity MUST have an activity
            completed_activities ca ON a.id = ca.activity_id
        INNER JOIN -- Changed to INNER JOIN if quantity MUST come from log_quantity_answers
            log_quantity_answers lqa ON a.id = lqa.activity_id
            -- Consider if the join to log_quantity_answers should also include ca.id or ca.user_id
            -- e.g., AND ca.id = lqa.completed_activity_id (if such a column exists)
            -- OR AND ca.user_id = lqa.user_id AND date_trunc('day', ca.created_at) = date_trunc('day', lqa.created_at) (if it's user+day specific answer)
            -- The current join (ON a.id = lqa.activity_id) might create a Cartesian product if one activity has multiple log_quantity_answers
            -- and multiple completions. This needs clarification based on schema.
        LEFT JOIN -- Use LEFT JOIN for users in case a user_id in completed_activities is somehow not in users
            users u ON ca.user_id = u.id
        WHERE
            a.impact_category is not null -- Ensure the activity has an impact category
            and ca.created_at >= $1 -- Filter completed activities within the last year
            AND lqa.logged_value IS NOT NULL -- Filter where the actual quantity is logged
        ORDER BY
            ca.created_at DESC;
    `;

    try {
        const results = await executeQueryUsingPool(query, [oneYearAgo]);
        console.log(`✅ [ProductivityReport] Fetched ${results.length} records for ALL impact categories.`);

        // Format data for output
        return results.map(row => ({
            activity_id: row.activity_id,
            user_id: row.user_id,
            user_signup_date: row.user_signup_date ? moment(row.user_signup_date).format('YYYY-MM-DD') : 'N/A', // Format user signup
            impact_category: row.impact_category,
            quantity_logged: row.quantity_logged, // This now comes from log_quantity_answers.logged_value
            completion_date: moment(row.completion_timestamp).format('YYYY-MM-DD HH:mm:ss'),
        }));
    } catch (error) {
        console.error(`❌ [ProductivityReport] Error fetching productivity impact data:`, error);
        return [];
    }
}

/**
 * Main function to generate the productivity impact report.
 */
async function generateProductivityImpactReport() {
    console.log("🚀 Starting Productivity Impact Report Generation...");
    try {
        const productivityData = await fetchProductivityImpactData();

        if (productivityData.length === 0) {
            console.log("ℹ️ [ProductivityReport] No data found for the specified impact category and time range.");
            return;
        }

        // Define headers for the Excel file
        const headers = [
            "Activity ID",
            "User DB ID",
            "User Signup Date", // Updated Header
            "Impact Category",
            "Quantity Logged",
            "Completion Date"
        ];
        // Map data to fit the headers
        const excelData = productivityData.map(item => ({
            "Activity ID": item.activity_id,
            "User DB ID": item.user_id,
            "User Signup Date": item.user_signup_date, // Updated field
            "Impact Category": item.impact_category,
            "Quantity Logged": item.quantity_logged,
            "Completion Date": item.completion_date
        }));

        const filePath = "productivity_impact_report.xlsx";
        console.log(`📄 [ProductivityReport] Exporting data to ${filePath}...`);
        await exportToExcel(excelData, filePath, headers);

        console.log("✅ [ProductivityReport] Report generation completed successfully.");

    } catch (error) {
        console.error("❌ [ProductivityReport] Error during report generation:", error);
        process.exitCode = 1;
    }
}

module.exports = {
    generateProductivityImpactReport,
    fetchProductivityImpactData,
};

// --- END OF FILE reporting/productivity-impact-report.js ---