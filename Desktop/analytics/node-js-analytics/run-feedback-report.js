// --- START OF FILE run-feedback-report.js ---
require('./Config/load-env.js'); // Ensure env vars are loaded first

const { generateFeedbackScoreData } = require('./reporting/feedback-score-report');

async function main() {
    await generateFeedbackScoreData();
}

main().catch(err => {
    console.error("Unhandled error in main feedback report execution:", err);
    process.exit(1);
});
// --- END OF FILE run-feedback-report.js ---