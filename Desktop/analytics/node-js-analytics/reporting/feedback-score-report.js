// --- START OF FILE reporting/feedback-score-report.js ---

const moment = require('moment');
const fs = require('fs'); // Require fs at the top as it's used for file writing

// Services & Config
const { executeQueryUsingPool } = require('../services/db'); // Adjust path as needed

/**
 * Fetches aggregated user feedback scores (ratings) by month for the last year
 * from the 'user_feedback' table.
 *
 * @returns {Promise<Array<object>>} Array of objects: { month: 'YYYY-MM', average_rating: number, count: number }.
 */
async function fetchMonthlyAverageFeedbackScores() {
    console.log(`⏳ [FeedbackReport] Fetching monthly average ratings from 'user_feedback' table (last 1 year)...`);
    const oneYearAgo = moment().subtract(1, 'year').toISOString();
    const query = `
        SELECT
            TO_CHAR(created_at, 'YYYY-MM') AS feedback_month,
            AVG(CAST(rating AS NUMERIC)) AS average_rating,
            COUNT(id) AS number_of_feedbacks
        FROM
            user_feedback
        WHERE
            rating IS NOT NULL
            AND created_at >= $1
        GROUP BY
            feedback_month
        ORDER BY
            feedback_month ASC;
    `;

    try {
        const results = await executeQueryUsingPool(query, [oneYearAgo]);
        console.log(`✅ [FeedbackReport] Fetched ${results.length} monthly feedback aggregates.`);
        return results.map(row => ({
            month: row.feedback_month,
            average_rating: parseFloat(parseFloat(row.average_rating).toFixed(2)),
            count: parseInt(row.number_of_feedbacks, 10)
        }));
    } catch (error) {
        console.error(`❌ [FeedbackReport] Error fetching monthly average feedback scores:`, error);
        const substitutedQuery = query.replace('$1', `'${oneYearAgo}'`);
        console.error(`   Query attempted: ${substitutedQuery}`);
        return [];
    }
}

/**
 * Converts an array of objects to a CSV string.
 * @param {Array<object>} dataArray - The array of data objects.
 * @param {Array<string>} headers - The CSV headers.
 * @returns {string} The CSV formatted string.
 */
function convertToCsv(dataArray, headers) {
    if (!dataArray || dataArray.length === 0) return "";

    const headerString = headers.join(',');
    const rows = dataArray.map(obj =>
        headers.map(header => {
            // Handle potential commas or newlines in data by quoting
            let value = obj[header.toLowerCase().replace(/ /g, '_')] // Match object keys (e.g., "Avg. Rating" -> "avg_rating")
                         || obj[header]; // Fallback to exact header if key mapping fails
            if (value === null || value === undefined) {
                value = '';
            }
            // Quote if it contains comma, newline, or double quote
            if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
                value = `"${value.replace(/"/g, '""')}"`; // Escape double quotes by doubling them
            }
            return value;
        }).join(',')
    );
    return [headerString, ...rows].join('\n');
}


/**
 * Main function to generate and output the feedback score data as CSV.
 */
async function generateFeedbackScoreData() {
    console.log("🚀 Starting Feedback Score Data Generation...");
    try {
        const feedbackData = await fetchMonthlyAverageFeedbackScores();

        if (feedbackData.length === 0) {
            console.log("ℹ️ [FeedbackReport] No feedback data found for the last year.");
            return;
        }

        console.log("\n📈 Monthly Average Feedback Ratings (Last 1 Year):");
        console.log("----------------------------------------------------");
        const tableHeaders = ["Month", "Avg. Rating", "Feedback Count"];
        console.log(tableHeaders.join('   | '));
        console.log("----------------------------------------------------");
        feedbackData.forEach(item => {
            const avgRatingStr = String(item.average_rating).padEnd(11);
            console.log(`${item.month}   | ${avgRatingStr} | ${item.count}`);
        });
        console.log("----------------------------------------------------");

        // Prepare data for CSV
        const csvHeaders = ["Month", "Average Rating", "Feedback Count"];
        const dataForCsv = feedbackData.map(item => ({
            month: item.month,
            average_rating: item.average_rating, // Keys should match those used in convertToCsv
            feedback_count: item.count
        }));

        const csvString = convertToCsv(dataForCsv, csvHeaders);
        const outputFilePath = 'monthly_feedback_ratings.csv'; // Changed extension
        fs.writeFileSync(outputFilePath, csvString, 'utf8'); // Specify encoding
        console.log(`✅ [FeedbackReport] Feedback data saved to ${outputFilePath}`);

        console.log("✅ [FeedbackReport] Feedback score data generation completed successfully.");

    } catch (error) {
        console.error("❌ [FeedbackReport] Error during feedback score data generation:", error);
        process.exitCode = 1;
    }
}

module.exports = {
    generateFeedbackScoreData,
    fetchMonthlyAverageFeedbackScores,
};

// --- END OF FILE reporting/feedback-score-report.js ---