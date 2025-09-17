// --- START OF FILE run-productivity-report.js ---
require('./Config/load-env.js'); // Ensure env vars are loaded first

const { generateProductivityImpactReport } = require('./reporting/productivity-impact-report');

async function main() {
    await generateProductivityImpactReport();
}

main().catch(err => {
    console.error("Unhandled error in main execution:", err);
    process.exit(1);
});
// --- END OF FILE run-productivity-report.js ---