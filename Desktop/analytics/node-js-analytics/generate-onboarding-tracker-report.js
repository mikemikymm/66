// node generate-onboarding-tracker-report.js
// This script generates an onboarding tracking report by fetching data, processing it, and exporting it to an Excel file.

// 1. Load Environment Variables First
require('./Config/load-env.js');
// 2. Require necessary modules/functions
const fs = require("fs");
const moment = require("moment");

// Import functions from the new modular structure
const { fetchOnboardingReportData } = require('./reporting/onboarding-fetchers.js'); // Fetches all raw data
const { mapTrackEvents } = require('./reporting/report-mapper.js'); // Maps raw data to report format
const { exportToExcel2 } = require('./reporting/excel-export.js'); // Excel export function



/**
 * Generate summary statistics from processed onboarding data.
 * (Function definition remains the same)
 * @param {Array} processedOnboardingData - The processed onboarding data to analyze (output of mapTrackEvents)
 */
async function generateSummaryStats(processedOnboardingData) {
  // Placeholder for summary stats by OS and week
  const summaryByOSAndWeek = {};

  // Helper function to get the first day of the signup week in ISO format
  const getFirstDayOfSignupWeek = (signupDate) => {
      // Added validation for signupDate
      if (!signupDate || !moment(signupDate, "YYYY-MM-DD", true).isValid()) {
          return "Unknown"; // Return 'Unknown' if date is invalid/missing
      }
      return moment(signupDate, "YYYY-MM-DD").startOf("isoWeek").format("YYYY-MM-DD");
  };


  // Process each user's processed data
  processedOnboardingData.forEach((userReport) => { // Iterate over the output of mapTrackEvents
    // Ensure userReport and its properties exist
    if (!userReport || !userReport.os || !userReport.reportConfig) {
        console.warn("[Summary] Skipping user report due to missing data:", userReport?.user_id || 'Unknown User');
        return;
    }

    const os = userReport.os.length > 0 ? userReport.os[0] : "Unknown";
    const report = userReport.reportConfig; // This is the array of metric objects

    // Extract the signup date (First Desktop Login Date)
    const signupDateItem = report.find(
      (item) => item.excel_column_name === "First desktop login date"
    );
    const signupDate = signupDateItem?.value; // Already formatted as YYYY-MM-DD or empty
    const signupWeek = getFirstDayOfSignupWeek(signupDate);

    // Create a combined key for OS and signup week
    const key = `${os}_${signupWeek}`;

    if (!summaryByOSAndWeek[key]) {
      summaryByOSAndWeek[key] = {
        os,
        signupWeek,
        activatedUsers: 0,
        paidUsers: 0,
        totalUsers: 0,
        day1Completers: 0,
        day2Completers: 0,
        day3Completers: 0,
        day4Completers: 0,
        day5Completers: 0,
        day6Completers: 0,
        day7Completers: 0,
      };
    }

    const stats = summaryByOSAndWeek[key];
    stats.totalUsers += 1;

    // Find "Did activate" status
    const activatedItem = report.find(
      (item) => item.excel_column_name === "Did activate"
    );
    // mapTrackEvents now returns boolean `true` or `false` for value
    const activated = activatedItem?.value === true;
    if (activated) stats.activatedUsers += 1;

    // Check subscription status
    const subscriptionItem = report.find(
      (item) => item.excel_column_name === "Subscription Status"
    );
    // Check against 'personal', handle potential null/undefined/empty values
    const paid = subscriptionItem?.value === "personal";
    if (paid) stats.paidUsers += 1;

    // Check completion for days 1-7
    // This part relies on the mapTrackEvents correctly populating the 'Did X on Day Y' values
    if (activated) { // Only count completers if the user activated at some point
        for (let day = 1; day <= 7; day++) {
            const morningHabits = report.find(item => item.excel_column_name === `Did morning habits on day ${day}`);
            const eveningHabits = report.find(item => item.excel_column_name === `Did evening habits on day ${day}`);
            const breaks = report.find(item => item.excel_column_name === `Used breaks on day ${day}`);
            const focus = report.find(item => item.excel_column_name === `Used focus mode on day ${day}`);

            // Check if the value exists and is greater than 0 (indicating the action was done)
            if (morningHabits?.value > 0 || eveningHabits?.value > 0 || breaks?.value > 0 || focus?.value > 0)
            {
                stats[`day${day}Completers`] += 1;
                // Optimization: If they completed anything on this day, break the inner checks for this day
                // break; // Removed this break, as we want to count if ANY activity happened, not just the first found.
            }
        }
    }
  });

  // Prepare the final summary with percentages
  const summaryArray = Object.values(summaryByOSAndWeek); // Get values from the map

  // Sort the summary for consistent CSV output (e.g., by OS then by Week)
  summaryArray.sort((a, b) => {
      if (a.os < b.os) return -1;
      if (a.os > b.os) return 1;
      if (a.signupWeek < b.signupWeek) return -1;
      if (a.signupWeek > b.signupWeek) return 1;
      return 0;
  });


  const csvData = summaryArray.map((stats) => { // Map over the sorted array
    // Avoid division by zero
    const totalUsers = stats.totalUsers || 1;
    const activatedUsers = stats.activatedUsers || 0;

    const activatedPct = (activatedUsers / totalUsers) * 100;
    const paidPct = (stats.paidUsers / totalUsers) * 100;
    const activatedPaidPct = activatedUsers > 0 ? (stats.paidUsers / activatedUsers) * 100 : 0;

    return {
      OS: stats.os,
      "Signup Week": stats.signupWeek,
      "Total Users": stats.totalUsers, // Report actual total users
      "% Activated": activatedPct.toFixed(2),
      "% Paid": paidPct.toFixed(2),
      "% Activated Users Who Paid": activatedPaidPct.toFixed(2),
      "% Completed Day 1": ((stats.day1Completers / totalUsers) * 100).toFixed(2),
      "% Completed Day 2": ((stats.day2Completers / totalUsers) * 100).toFixed(2),
      "% Completed Day 3": ((stats.day3Completers / totalUsers) * 100).toFixed(2),
      "% Completed Day 4": ((stats.day4Completers / totalUsers) * 100).toFixed(2),
      "% Completed Day 5": ((stats.day5Completers / totalUsers) * 100).toFixed(2),
      "% Completed Day 6": ((stats.day6Completers / totalUsers) * 100).toFixed(2),
      "% Completed Day 7": ((stats.day7Completers / totalUsers) * 100).toFixed(2),
    };
  });

  if (csvData.length > 0) {
      writeCsv(csvData);
      console.log("✅ Summary CSV file written successfully.");
  } else {
       console.log("ℹ️ No summary data generated to write to CSV.");
  }

}

/**
 * Write the data to a CSV file grouped by OS
 * (Function definition remains largely the same)
 * @param {Array} data - The data to write to CSV
 */
function writeCsv(data) {
  // Group data by OS first
  const groupedData = groupByOS(data); // Use helper function below

  // Create CSV string
  const csvRowData = groupedData.map((group) => {
      // Sort data within the group by Signup Week for consistent column order
      group.data.sort((a, b) => a["Signup Week"] < b["Signup Week"] ? -1 : 1);

      const headers = [group.OS, ...group.data.map((d) => d["Signup Week"])].join(",");
      const rows = [
          "Activation Rate," + group.data.map((d) => d["% Activated"]).join(","),
          "Trial To Paid," + group.data.map((d) => d["% Paid"]).join(","),
          "Total Users," + group.data.map((d) => d["Total Users"]).join(","),
          "% Activated Users Who Paid," + group.data.map((d) => d["% Activated Users Who Paid"]).join(","),
          "% Completed Day 1," + group.data.map((d) => d["% Completed Day 1"]).join(","),
          "% Completed Day 2," + group.data.map((d) => d["% Completed Day 2"]).join(","),
          "% Completed Day 3," + group.data.map((d) => d["% Completed Day 3"]).join(","),
          "% Completed Day 4," + group.data.map((d) => d["% Completed Day 4"]).join(","),
          "% Completed Day 5," + group.data.map((d) => d["% Completed Day 5"]).join(","),
          "% Completed Day 6," + group.data.map((d) => d["% Completed Day 6"]).join(","),
          "% Completed Day 7," + group.data.map((d) => d["% Completed Day 7"]).join(","),
      ];
      return [headers, ...rows].join("\n");
  }).join("\n\n"); // Add extra newline between OS groups

  try {
      fs.writeFileSync("os_signup_week_summary.csv", csvRowData, 'utf8'); // Specify encoding
  } catch (error) {
      console.error("❌ Error writing CSV file:", error);
  }
}

/**
 * Group data by operating system helper function
 * (Function definition remains the same)
 * @param {Array} data - The data to group
 * @returns {Array} Grouped data by OS
 */
function groupByOS(data) {
  const grouped = data.reduce((acc, row) => {
    const os = row.OS || "Unknown"; // Default to Unknown if OS is missing
    let existingGroup = acc.find((group) => group.OS === os);

    if (!existingGroup) {
        existingGroup = { OS: os, data: [] };
        acc.push(existingGroup);
    }
    existingGroup.data.push(row);
    return acc;
  }, []);

   // Sort the groups by OS name for consistent output file structure
   grouped.sort((a, b) => a.OS < b.OS ? -1 : 1);

  return grouped;
}

/**
 * Main function to generate onboarding tracking report
 */
const main = async () => {
  console.log("🚀 Starting Onboarding Report Generation...");
  try {
    // 1. Fetch all necessary raw data using the orchestrator function
    const fetchedData = await fetchOnboardingReportData();

    // Destructure the fetched data
    const { users, trackEventsByUser, activitiesByUser, focusModesByUser, userPrimaryOsMap } = fetchedData;

    if (!users || users.length === 0) {
        console.log("⏹️ No users found matching the criteria. Exiting report generation.");
        return;
    }

    console.log(`📊 Mapping data for ${users.length} users...`);
    // 2. Map the raw data to the final report structure for each user
    const processedOnboardingData = users.map(user => {
        const userId = user.id;
        // Prepare the data object expected by mapTrackEvents
        const mapInput = {
            user_id: userId,
            auth0_id: user.auth0_id,
            team_id: user.team_id,
            created_at: user.created_at,
            updated_at: user.updated_at,
            revenue_cat_status: user.revenue_cat_status,
            track_events: trackEventsByUser[userId] || [],
            activities: activitiesByUser[userId] || [],
            focusModeDatas: focusModesByUser[userId] || [],
            devices: [{ operating_system: userPrimaryOsMap.get(userId) || 'Unknown' }]
        };
        return mapTrackEvents(mapInput);
    }).filter(Boolean); // Filter out any potential null/undefined results from mapping

    if (processedOnboardingData.length === 0) {
        console.log("ℹ️ No user data could be processed into the report format.");
        return;
    }

    // 3. Generate Summary Statistics (CSV)
    console.log("📝 Generating summary statistics...");
    await generateSummaryStats(processedOnboardingData); // Pass processed data

    // 4. Export Detailed Data to Excel
    console.log("📄 Exporting detailed data to Excel...");
    await exportToExcel2(processedOnboardingData, "onboarding_tracking_report.xlsx"); // Pass processed data
    console.log("✅ Report generation completed successfully.");

  } catch (error) {
    console.error("❌ Error during onboarding report generation:", error);
    // Optionally add more error handling, e.g., exit code
    process.exitCode = 1;
  }
  
};

// Execute the main function
main();

// --- END OF FILE generate-onboarding-tracker-report.js ---