const { execSync } = require("child_process");

const AWS_SECRET_NAME = "internAnalyticsDotEnv";
const AWS_REGION = "ap-southeast-2";

function loadEnvFromAWS() {
    try {
        console.log("🔒 Fetching secrets from AWS Secrets Manager...");
        const secretJSON = execSync(
            `aws secretsmanager get-secret-value --secret-id ${AWS_SECRET_NAME} --region ${AWS_REGION} --query SecretString --output text`,
            { encoding: "utf8" }
        ).trim();

        if (!secretJSON) {
            throw new Error("❌ No secrets retrieved from AWS.");
        }

        console.log("✅ Secrets loaded successfully!");

        secretJSON.split("\n").forEach(line => {
            if (line.trim() && !line.startsWith("#")) {
                const [key, ...valueParts] = line.split("=");
                if (key && valueParts.length > 0) {
                    process.env[key.trim()] = valueParts.join("=").trim();
                }
            }
        });

    } catch (err) {
        console.error("❌ Error loading secrets from AWS:", err.message);
        process.exit(1);
    }
}

loadEnvFromAWS();
console.log("🛠️ Environment variables set. Running script...");

const ExcelJS = require("exceljs");
const { Client } = require("pg");
const { Pool } = require("pg");
const axios = require("axios");

// Auth0
const domain = process.env.AUTH0_DOMAIN;
const clientId = process.env.AUTH0_MANAGEMENT_CLIENT_ID;
const clientSecret = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET;
const auth0Audience = `https://${domain}/api/v2/`;

// Stripe
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = require("stripe")(STRIPE_SECRET_KEY);

// Database connection
const connectionString = process.env.DATABASE_CONNECTIONSTRING;
const pool = new Pool({
  connectionString: connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 60000,
});

const COLUMN_NAME_MAPPING = {
  USER_ID: "Userid",
  FIRST_DESKTOP_LOGIN_DATE: "First desktop login date",
  LAST_UPDATED_DATE: "Last updated date",
  SUBSCRIPTION_STATUS: "Subscription Status",
  PERCENT_DAYS_DID_MORNING_ROUTINE:
    "% of days since signup did morning routine habit",
  PERCENT_DAYS_DID_EVENING_ROUTINE:
    "% of days since signup did evening routine habit",
  PERCENT_DAYS_DID_BREAK_ROUTINE: "% of days since signup did break habit",
  PERCENT_DAYS_DID_FOCUS_SESSION: "% of days since signup did focus session",
  DID_ACTIVE: "Did activate",
  AVERAGE_HOURS_DEEP_WORK_PER_WEEK: "Average hours of deep work per week",
  NUMBER_MORNING_ROUTINE_HABITS: "Number of morning routine habits",
  NUMBER_EVENING_ROUTINE_HABITS: "Number of evening routine habits",
  NUMBER_BREAK_HABITS: "Number of break habits",
  NUMBER_OF_FOCUS_MODE: "Number of focus modes",
  SATISFACTION_WITH_BREAK_TIMING: "Satisfaction with break timing",
  COMPLETED_MENU_TOUR: "Completed menu tour",
  STARTED_BREAK_ACTIVITY: "Started a break activity",
  COMPLETED_BREAK_ACTIVITY: "Completed a break activity",
  STARTED_MORNING_ROUTINE: "Started morning routine",
  COMPLETED_MORNING_ROUTINE: "Completed a morning routine",
  STARTED_EVENING_ROUTINE: "Started evening routine",
  COMPLETED_EVENING_ROUTINE: "Completed an evening routine",
  STARTED_FOCUS_MODE: "Started focus mode",
  STARTED_POMODORO: "Started pomodoro",
  SWITCH_TO_GEEK_MODE: "Switched to geek mode",
  SWITCH_TO_SIMPLE_MODE: "Switched to simple mode",
  BLOCKED_AN_APP: "Blocked an app",
  BLOCKED_A_URL: "Blocked a url",
  BLOCKED_ON_MOBILE: "Blocked on mobile",
  SIGNED_UP_ON_MOBILE: "Signed Up on mobile",
  SIGNED_UP_ON_MOBILE_DATE: "Signed Up on mobile Date",
  COMMITMENT_LEVEL_FOR_HABITS: "Commitment level for habits",
  CARE_FACTOR_FOR_BREAKS: "Care factor for breaks",

  DID_MORNING_HABIT_ON_DAY_1: "Did morning habits on day 1",
  USED_BREAKS_ON_DAY_1: "Used breaks on day 1",
  USED_FOCUS_MODE_ON_DAY_1: "Used focus mode on day 1",
  DID_EVENING_HABIT_ON_DAY_1: "Did evening habits on day 1",

  DID_MORNING_HABIT_ON_DAY_2: "Did morning habits on day 2",
  USED_BREAKS_ON_DAY_2: "Used breaks on day 2",
  USED_FOCUS_MODE_ON_DAY_2: "Used focus mode on day 2",
  DID_EVENING_HABIT_ON_DAY_2: "Did evening habits on day 2",

  DID_MORNING_HABIT_ON_DAY_3: "Did morning habits on day 3",
  USED_BREAKS_ON_DAY_3: "Used breaks on day 3",
  USED_FOCUS_MODE_ON_DAY_3: "Used focus mode on day 3",
  DID_EVENING_HABIT_ON_DAY_3: "Did evening habits on day 3",

  DID_MORNING_HABIT_ON_DAY_4: "Did morning habits on day 4",
  USED_BREAKS_ON_DAY_4: "Used breaks on day 4",
  USED_FOCUS_MODE_ON_DAY_4: "Used focus mode on day 4",
  DID_EVENING_HABIT_ON_DAY_4: "Did evening habits on day 4",

  DID_MORNING_HABIT_ON_DAY_5: "Did morning habits on day 5",
  USED_BREAKS_ON_DAY_5: "Used breaks on day 5",
  USED_FOCUS_MODE_ON_DAY_5: "Used focus mode on day 5",
  DID_EVENING_HABIT_ON_DAY_5: "Did evening habits on day 5",

  DID_MORNING_HABIT_ON_DAY_6: "Did morning habits on day 6",
  USED_BREAKS_ON_DAY_6: "Used breaks on day 6",
  USED_FOCUS_MODE_ON_DAY_6: "Used focus mode on day 6",
  DID_EVENING_HABIT_ON_DAY_6: "Did evening habits on day 6",

  DID_MORNING_HABIT_ON_DAY_7: "Did morning habits on day 7",
  USED_BREAKS_ON_DAY_7: "Used breaks on day 7",
  USED_FOCUS_MODE_ON_DAY_7: "Used focus mode on day 7",
  DID_EVENING_HABIT_ON_DAY_7: "Did evening habits on day 7",

  DID_MORNING_HABIT_ON_DAY_8: "Did morning habits on day 8",
  USED_BREAKS_ON_DAY_8: "Used breaks on day 8",
  USED_FOCUS_MODE_ON_DAY_8: "Used focus mode on day 8",
  DID_EVENING_HABIT_ON_DAY_8: "Did evening habits on day 8",

  DID_MORNING_HABIT_ON_DAY_9: "Did morning habits on day 9",
  USED_BREAKS_ON_DAY_9: "Used breaks on day 9",
  USED_FOCUS_MODE_ON_DAY_9: "Used focus mode on day 9",
  DID_EVENING_HABIT_ON_DAY_9: "Did evening habits on day 9",

  DID_MORNING_HABIT_ON_DAY_10: "Did morning habits on day 10",
  USED_BREAKS_ON_DAY_10: "Used breaks on day 10",
  USED_FOCUS_MODE_ON_DAY_10: "Used focus mode on day 10",
  DID_EVENING_HABIT_ON_DAY_10: "Did evening habits on day 10",

  DID_MORNING_HABIT_ON_DAY_11: "Did morning habits on day 11",
  USED_BREAKS_ON_DAY_11: "Used breaks on day 11",
  USED_FOCUS_MODE_ON_DAY_11: "Used focus mode on day 11",
  DID_EVENING_HABIT_ON_DAY_11: "Did evening habits on day 11",

  DID_MORNING_HABIT_ON_DAY_12: "Did morning habits on day 12",
  USED_BREAKS_ON_DAY_12: "Used breaks on day 12",
  USED_FOCUS_MODE_ON_DAY_12: "Used focus mode on day 12",
  DID_EVENING_HABIT_ON_DAY_12: "Did evening habits on day 12",

  DID_MORNING_HABIT_ON_DAY_13: "Did morning habits on day 13",
  USED_BREAKS_ON_DAY_13: "Used breaks on day 13",
  USED_FOCUS_MODE_ON_DAY_13: "Used focus mode on day 13",
  DID_EVENING_HABIT_ON_DAY_13: "Did evening habits on day 13",

  DID_MORNING_HABIT_ON_DAY_14: "Did morning habits on day 14",
  USED_BREAKS_ON_DAY_14: "Used breaks on day 14",
  USED_FOCUS_MODE_ON_DAY_14: "Used focus mode on day 14",
  DID_EVENING_HABIT_ON_DAY_14: "Did evening habits on day 14",

  DID_MORNING_HABIT_ON_DAY_15: "Did morning habits on day 15",
  USED_BREAKS_ON_DAY_15: "Used breaks on day 15",
  USED_FOCUS_MODE_ON_DAY_15: "Used focus mode on day 15",
  DID_EVENING_HABIT_ON_DAY_15: "Did evening habits on day 15",

  DID_MORNING_HABIT_ON_DAY_16: "Did morning habits on day 16",
  USED_BREAKS_ON_DAY_16: "Used breaks on day 16",
  USED_FOCUS_MODE_ON_DAY_16: "Used focus mode on day 16",
  DID_EVENING_HABIT_ON_DAY_16: "Did evening habits on day 16",

  DID_MORNING_HABIT_ON_DAY_17: "Did morning habits on day 17",
  USED_BREAKS_ON_DAY_17: "Used breaks on day 17",
  USED_FOCUS_MODE_ON_DAY_17: "Used focus mode on day 17",
  DID_EVENING_HABIT_ON_DAY_17: "Did evening habits on day 17",

  DID_MORNING_HABIT_ON_DAY_18: "Did morning habits on day 18",
  USED_BREAKS_ON_DAY_18: "Used breaks on day 18",
  USED_FOCUS_MODE_ON_DAY_18: "Used focus mode on day 18",
  DID_EVENING_HABIT_ON_DAY_18: "Did evening habits on day 18",

  DID_MORNING_HABIT_ON_DAY_19: "Did morning habits on day 19",
  USED_BREAKS_ON_DAY_19: "Used breaks on day 19",
  USED_FOCUS_MODE_ON_DAY_19: "Used focus mode on day 19",
  DID_EVENING_HABIT_ON_DAY_19: "Did evening habits on day 19",

  DID_MORNING_HABIT_ON_DAY_20: "Did morning habits on day 20",
  USED_BREAKS_ON_DAY_20: "Used breaks on day 20",
  USED_FOCUS_MODE_ON_DAY_20: "Used focus mode on day 20",
  DID_EVENING_HABIT_ON_DAY_20: "Did evening habits on day 20",

  DID_MORNING_HABIT_ON_DAY_21: "Did morning habits on day 21",
  USED_BREAKS_ON_DAY_21: "Used breaks on day 21",
  USED_FOCUS_MODE_ON_DAY_21: "Used focus mode on day 21",
  DID_EVENING_HABIT_ON_DAY_21: "Did evening habits on day 21",

  DID_MORNING_HABIT_ON_DAY_22: "Did morning habits on day 22",
  USED_BREAKS_ON_DAY_22: "Used breaks on day 22",
  USED_FOCUS_MODE_ON_DAY_22: "Used focus mode on day 22",
  DID_EVENING_HABIT_ON_DAY_22: "Did evening habits on day 22",

  DID_MORNING_HABIT_ON_DAY_23: "Did morning habits on day 23",
  USED_BREAKS_ON_DAY_23: "Used breaks on day 23",
  USED_FOCUS_MODE_ON_DAY_23: "Used focus mode on day 23",
  DID_EVENING_HABIT_ON_DAY_23: "Did evening habits on day 23",

  DID_MORNING_HABIT_ON_DAY_24: "Did morning habits on day 24",
  USED_BREAKS_ON_DAY_24: "Used breaks on day 24",
  USED_FOCUS_MODE_ON_DAY_24: "Used focus mode on day 24",
  DID_EVENING_HABIT_ON_DAY_24: "Did evening habits on day 24",

  DID_MORNING_HABIT_ON_DAY_25: "Did morning habits on day 25",
  USED_BREAKS_ON_DAY_25: "Used breaks on day 25",
  USED_FOCUS_MODE_ON_DAY_25: "Used focus mode on day 25",
  DID_EVENING_HABIT_ON_DAY_25: "Did evening habits on day 25",

  DID_MORNING_HABIT_ON_DAY_26: "Did morning habits on day 26",
  USED_BREAKS_ON_DAY_26: "Used breaks on day 26",
  USED_FOCUS_MODE_ON_DAY_26: "Used focus mode on day 26",
  DID_EVENING_HABIT_ON_DAY_26: "Did evening habits on day 26",

  DID_MORNING_HABIT_ON_DAY_27: "Did morning habits on day 27",
  USED_BREAKS_ON_DAY_27: "Used breaks on day 27",
  USED_FOCUS_MODE_ON_DAY_27: "Used focus mode on day 27",
  DID_EVENING_HABIT_ON_DAY_27: "Did evening habits on day 27",

  DID_MORNING_HABIT_ON_DAY_28: "Did morning habits on day 28",
  USED_BREAKS_ON_DAY_28: "Used breaks on day 28",
  USED_FOCUS_MODE_ON_DAY_28: "Used focus mode on day 28",
  DID_EVENING_HABIT_ON_DAY_28: "Did evening habits on day 28",

  OCCUPATION: "Occupation",
  ENABLE_TIME_TRACKER: "Enabled Time Tracker",
  ENABLE_LATE_NO_MORE: "Enabled Late No More",
  QUIT_WITHIN_7_DAYS: "Quit within 7 days",
  GOALS_FOR_FOCUS_BEAR: "Hopes for using Focus Bear",
  UNINSTALLED_APP: "Uninstalled app",
};

const eventTypeConstant = {
  USER_ID: "user_id",
  LOGIN_HOMEMADE: "login-homemade",
  UPDATED_AT: "updated_at",
  REVENUE_CAT_STATUS: "revenue_cat_status",
  COMPLETE_MORNING_ROUTINE_ACTIVITY: "complete-morning-routine-activity",
  COMPLETE_EVENING_ROUTINE_ACTIVITY: "complete-evening-routine-activity",
  COMPLETE_BREAK_ACTIVITY: "complete-break-activity",
  START_POMODORO_MODE_MANUALLY: "start-pomodoro-mode-manually",
  START_FOCUS_MODE_MANUALLY: "start-focus-mode-manually",
  COMPLETED_FOCUS_SESSION: "completed-focus-session",
  MORNING: "morning",
  EVENING: "evening",
  BREAKING: "breaking",
  FOCUS_MODE: "focus-mode",
  BREAK_FEEDBACK_LEFT: "break-feedback-left",
  MENU_TOUR_SETUP_COMPLETE: "menu_tour_setup_complete",
  START_BREAK_ACTIVITY: "start-break-activity",
  COMPLETE_BREAK_ACTIVITY: "complete-break-activity",
  START_MORNING_ROUTINE: "start-morning-routine",
  COMPLETE_MORNING_ROUTINE: "complete-morning-routine",
  START_EVENING_ROUTINE: "start-evening-routine",
  COMPLETE_EVENING_ROUTINE: "complete-evening-routine",
  SWITCH_TO_GEEK_MODE: "switch-to-geek-mode",
  SWITCH_TO_SIMPLE_MODE: "switch-to-simple-mode",
  BLOCK_DISTRACTING_APP: "block-distracting-app",
  BLOCK_DISTRACTING_URL: "block-distracting-url",
  BLOCK_DISTRACTION: "block-distraction",
  SIGNUP: "signup",
  CARE_ABOUT_HABITS: "care-about-habits",
  CARE_ABOUT_BREAKS: "cares-about-breaks",
  OCCUPATION_SELECTED: "occupation-selected",
  SETTING_CHANGED_ENABLE_TIME_TRACKER: "settings-changed-enable-time-tracker",
  SHOW_LATE_NO_MORE_WINDOW: "show-latenomore-window",
  APP_QUIT: "app-quit",
  LOGIN: "login",
  GOALS_FOR_FOCUS_BEAR: "custom-goal-selected",
  UNINSTALL: "uninstall",
};

const breakDownByPropertyConstant = {
  COUNT: "count",
  EVENT_COUNT: "eventCount",
  COUNT_WITH_MULTIPLE_TYPES: "count_with_multiple_types",
};

const highlightRuleConstant = {
  RED: "red",
  GREEN: "green",
};

const WEB_OPERATION_SYSTEM = "Web";
const IOS_OPERATION_SYSTEM = "iOS";
const MACOS_OPERATION_SYSTEM = "MacOS";
const WINDOWS_OPERATION_SYSTEM = "Windows";
const ANDROID_OPERATION_SYSTEM = "Android";
const UNKNOWN_OPERATING_SYSTEM = "Unknown";
const ANDROID_DEVICE_NAME = "okhttp";
const MAC_CLIENT_ID = "dgMrlNC5mM634Sxi9SLqIqi0WvgVpwX7";
const WINDOWS_CLIENT_ID = "YAYPDa7sAVKuheZy3dYWyzNncOSZq98I";
const MOBILE_CLIENT_ID = [
  "cZ2J5dR8FliHiTyOdlyk18wKottWxPaC",
  ["9hhQ3ymKQQsrAHkHlrVYzMPoJ9VZqrJ8"],
];

const exportToExcel = async (datas, filePath, headers) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sheet 1");

  worksheet.addRow(headers);

  const headerRow = worksheet.getRow(1);

  headerRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFF00" },
    };
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
    const headerWidth = headers[colNumber - 1].length * 1.2;
    worksheet.getColumn(colNumber).width = headerWidth > 40 ? headerWidth : 30;
  });

  datas.forEach((data) => {
    const rowData = [];
    headers.forEach((header) => {
      rowData.push(data[header]);
    });
    worksheet.addRow(rowData);
  });

  await workbook.xlsx.writeFile(filePath);
  console.log("Excel file has been created successfully.");
};

const exportToExcel2 = async (datas, filePath) => {
  const operatingSystems = [
    IOS_OPERATION_SYSTEM,
    MACOS_OPERATION_SYSTEM,
    WINDOWS_OPERATION_SYSTEM,
    ANDROID_OPERATION_SYSTEM,
    WEB_OPERATION_SYSTEM,
    UNKNOWN_OPERATING_SYSTEM,
  ];

  try {
    const workbook = new ExcelJS.Workbook();

    const uniqueOS = new Set();
    datas.forEach((datum) => {
      if (datum.os?.length) {
        uniqueOS.add(datum.os[0]);
      }
    });

    console.log("UNIQUEOS,", uniqueOS);

    operatingSystems.forEach((os) => {
      const sheetData = filterDataByOS(datas, os);
      if (sheetData.length > 0) {
        createWorksheet(workbook, os, sheetData);
      }
    });

    await workbook.xlsx.writeFile(filePath);
    console.log(`Report exported successfully to ${filePath}`);
  } catch (err) {
    console.error("Error exporting report to Excel:", err.message);
    throw new Error(`Error exporting report to Excel: ${err.message}`);
  }
};

const filterDataByOS = (datas, os) => {
  return datas.filter((data) => {
    if (!data.os) return false;

    return os === UNKNOWN_OPERATING_SYSTEM
      ? (data.os.length === 1 && data.os[0] === null) ||
          data.os[0] === UNKNOWN_OPERATING_SYSTEM ||
          data.os.length === 0
      : data.os[0] === os;
  });
};

const createWorksheet = (workbook, os, sheetData) => {
  const worksheet = workbook.addWorksheet(os);
  if (sheetData.length > 0) {
    worksheet.columns = createColumns(sheetData[0].reportConfig);
  }
  sheetData.forEach((userReport) => {
    const addedRow = worksheet.addRow(createRow(userReport.reportConfig));
    applyHighlightRules(addedRow, userReport.reportConfig);
  });
  autoSizeColumns(worksheet);
};

const createColumns = (reportConfig) => {
  return reportConfig.map((config) => ({
    header: config.excel_column_name,
    key: config.excel_column_name,
  }));
};

const createRow = (reportConfig) => {
  return reportConfig.reduce((acc, config) => {
    acc[config.excel_column_name] = config.value;
    return acc;
  }, {});
};

const applyHighlightRules = (row, reportConfig) => {
  reportConfig.forEach((config, index) => {
    if (config.excel_column_name !== "Userid") {
      const cell = row.getCell(index + 1);
      if (config.highlightRule === "green") {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "C6EFCE" },
        };
      } else if (config.highlightRule === "red") {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFC7CE" },
        };
      }
    }
  });
};

const autoSizeColumns = (worksheet) => {
  worksheet.columns.forEach((column) => {
    let maxLength = column.header.length;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const cellLength = cell.value ? cell.value.toString().length : 0;
      maxLength = Math.max(maxLength, cellLength);
    });
    column.width = maxLength + 2;
  });
};

const getAccessToken = async () => {
  const response = await axios.post(`https://${domain}/oauth/token`, {
    client_id: clientId,
    client_secret: clientSecret,
    audience: auth0Audience,
    grant_type: "client_credentials",
  });

  return response.data.access_token;
};

const getSubscriptionByUserId = async (stripeCustomerId) => {
  try {
    if (!stripeCustomerId) {
      // If there's no associated Stripe customer ID, the user doesn't have a subscription
      return null;
    }

    // Retrieve the subscriptions associated with the Stripe customer ID
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      expand: ["data.plan.product"], // Include product information in the response,
    });

    // Extract subscription details including subscription date
    const subscriptionDetails = subscriptions.data.map((subscription) => {
      return {
        subscriptionId: subscription.id,
        startDate: new Date(subscription.created * 1000), // Convert UNIX timestamp to JavaScript Date object
      };
    });

    // Return the subscription details
    return subscriptionDetails;
  } catch (error) {
    console.error("Error retrieving subscriptions:", error);
    throw error;
  }
};

const executeQuery = async (query) => {
  const client = new Client({
    connectionString: connectionString,
  });

  await client.connect();
  await client.query("BEGIN");
  const users = await client.query(query);
  await client.end();
  return users.rows;
};

const executeQueryUsingPool = async (query) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const res = await client.query(query);
    await client.query("COMMIT");
    return res.rows;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const fetchDeviceCredentials = async (userId) => {
  const token = await getAccessToken();
  const response = await axios.get(
    `https://${domain}/api/v2/device-credentials?user_id=${userId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

const getUserFromAuth0 = async (fromDate) => {
  try {
    const token = await getAccessToken();
    const accessToken = token;

    let allUsers = [];
    let page = 0;

    while (true) {
      const userUrl = `https://${domain}/api/v2/users`;
      const headers = {
        Authorization: `Bearer ${accessToken}`,
      };
      const params = {
        q: `created_at:[${fromDate.toISOString()} TO *]`,
        sort: "created_at:1",
        page: page,
        per_page: 100,
        search_engine: "v3",
      };

      const userResponse = await axios.get(userUrl, { headers, params });

      allUsers = allUsers.concat(userResponse.data);

      if (userResponse.data.length < params.per_page) break;
      
      console.log(`Retrieved page ${page} of users`)
      page++;
    }

    return allUsers;
  } catch (error) {
    console.error(
      "Error retrieving users:",
      error.response ? error.response.data : error.message
    );
    throw new Error("Error retrieving users");
  }
};

const getDeviceForUser = async (users) => {
  try {
    console.log('Retrieving devices from DB...');
    const auth0Ids = users.map((m) => `'${m.user_id}'`);
    const userQuery = `
    SELECT devices.operating_system, users.auth0_id, devices.created_at AS devices_created_at, users.stripe_customer_id
    FROM users
    LEFT JOIN devices ON devices.user_id = users.id
    WHERE users.auth0_id IN (${auth0Ids.join(",")})
    `;

    const usersFromDb = await executeQuery(userQuery);

    const usersData = [];

    let counter = 0;
    for (item of users) {
      counter += 1;
      if (counter % 10 === 0) {
        console.log("Processed device credentials for user ", counter);
      }
      if (item.email && !item.email.includes("@focusbear")) {
        const deviceDatas = usersFromDb
          .filter((f) => f.auth0_id == item.user_id)
          .map((m) => {
            return {
              operating_system: m.operating_system,
              devices_created_at: m.devices_created_at,
              stripe_customer_id: m.stripe_customer_id,
            };
          });

        let osCombination = "";

        let os = deviceDatas.sort(
          (a, b) => a.devices_created_at - b.devices_created_at
        )[0]?.operating_system;

        // If not existed any devices in DB, fetch from auth0
        if (!os || os === UNKNOWN_OPERATING_SYSTEM) {
          const credentials = await fetchDeviceCredentials(item.user_id);
          const devicesFromCredential = await parseDeviceFromCredentials(
            credentials
          );

          os =
            devicesFromCredential.length > 0
              ? devicesFromCredential[0].operating_system
              : "";
          osCombination =
            devicesFromCredential.length > 0
              ? devicesFromCredential.sort().reduce((pre, cur) => {
                  if (!pre.includes(cur)) {
                    return pre + "_" + cur;
                  }
                  return pre;
                })
              : "";
        } else {
          osCombination = deviceDatas
            .map((m) => m.operating_system)
            .sort()
            .reduce((pre, cur) => {
              if (!pre.includes(cur)) {
                return pre + "_" + cur;
              }
              return pre;
            });
        }

        const subscriptions = await getSubscriptionByUserId(
          deviceDatas[0]?.stripe_customer_id
        );

        usersData.push({
          auth_id: item.user_id,
          email: item.email,
          name: item.name,
          created_at: item.created_at,
          osCombination: osCombination,
          os: os,
          isSubscribed: subscriptions ? subscriptions.length > 0 : false,
          subscriptions: subscriptions ? subscriptions : [],
        });
      }
    }

    console.log('Retrieved devices from DB...');
    return usersData;
  } catch (err) {
    console.error(err);
  }
};

const getNewSubscriptionsLastMonth = async (fromDate) => {
  try {
    console.log('Retrieving data from Stripe')
    const subscriptions = await stripe.subscriptions.list({
      created: {
        gte: fromDate,
      },
      expand: ["data.customer"],
    });

    console.log('Retrieved data from Stripe')
    return subscriptions.data.map((subscription) => {
      return {
        id: subscription.id,
        email: subscription.customer.email,
        customer_id: subscription.customer.id,
      };
    });
  } catch (error) {
    console.error("Error retrieving subscriptions:", error);
    throw new Error('subs');
  }
};

const getDeviceForStripeUser = async (users) => {
  console.log('Retrieving device data for Stripe users from DB');
  const token = await getAccessToken();
  const stripeIds = users.map((m) => `'${m.id}'`);
  const query = `
  SELECT devices.operating_system, users.auth0_id, users.stripe_customer_id, devices.created_at AS devices_created_at
  FROM users
  LEFT JOIN devices ON devices.user_id = users.id
  WHERE users.stripe_customer_id IN (${stripeIds.join(",")})
  `;

  const usersFromDb = await executeQuery(query);

  const usersData = [];

  for (userItem of users) {
    if (!userItem.email.includes("@focusbear")) {
      const user = usersFromDb.filter(
        (f) => f.stripe_customer_id == userItem.id
      );
      const deviceDatas = user.map((m) => {
        return {
          operating_system: m.operating_system,
          devices_created_at: m.devices_created_at,
        };
      });

      let osCombination = "";

      osCombination = deviceDatas
        .map((m) => m.operating_system)
        .sort()
        .reduce((pre, cur) => {
          if (!pre.includes(cur)) {
            return pre + "_" + cur;
          }
          return pre;
        });

      const os = deviceDatas.sort((s) => s.devices_created_at)[0]
        .operating_system;

      usersData.push({
        stripe_id: userItem.id,
        email: userItem.email,
        name: userItem.name,
        created_at: userItem.created_at,
        osCombination: osCombination,
        os: os,
      });
    }
  }

  console.log('Retrieved device data for Stripe users from DB');
  return usersData;
};

const getAllNewUserSignupsFromStripe = async (fromDate) => {
  
  console.log('Starting getAllNewUserSignupsFromStripe');
  try {
    let allSignups = [];
    let hasMore = true;
    let startingAfter = null;

    while (hasMore) {
      // Retrieve a page of customers from Stripe
      const options = { limit: 100 };
      if (startingAfter) {
        options.starting_after = startingAfter;
      }
      const customers = await stripe.customers.list(options);

      // Filter customers based on the provided fromDate
      const newSignups = customers.data.filter((customer) => {
        const createdDate = new Date(customer.created * 1000); // Stripe returns Unix timestamps (seconds since epoch)
        return createdDate >= fromDate;
      });

      // Concatenate new signups to the existing list
      allSignups = allSignups.concat(newSignups);

      // Update the startingAfter parameter for the next page
      startingAfter =
        customers.data.length > 0
          ? customers.data[customers.data.length - 1].id
          : null;

      // Check if there are more pages
      hasMore = customers.has_more;
    }

    console.log('Finished getAllNewUserSignupsFromStripe');

    return allSignups.map((m) => {
      return {
        id: m.id,
        name: m.name,
        email: m.email,
        os: m.metadata ? m.metadata.platform : "",
        isInternalUser: m.metadata ? m.metadata.is_internal_user : "",
      };
    });
  } catch (error) {
    // Handle any errors from Stripe
    console.error("Stripe Error:", error);
    return null;
  }
};

const getAllNewSubscribersFromStripe = async (fromDate) => {
  console.log('Starting getAllNewSubscribersFromStripe');

  try {
    let allSubscribers = [];
    let hasMore = true;
    let startingAfter = undefined; // Set to undefined initially

    while (hasMore) {
      // Retrieve a page of subscriptions from Stripe
      const options = { limit: 100, expand: ["data.customer"] };
      if (startingAfter !== undefined) {
        options.starting_after = startingAfter; // Only set if not undefined
      }
      const subscriptions = await stripe.subscriptions.list(options);

      // Filter subscriptions based on the provided fromDate
      const newSubscribers = subscriptions.data.filter((subscription) => {
        const createdDate = new Date(subscription.created * 1000); // Stripe returns Unix timestamps (seconds since epoch)
        return createdDate >= fromDate;
      });

      // Concatenate new subscribers to the existing list
      allSubscribers = allSubscribers.concat(newSubscribers);

      // Update the startingAfter parameter for the next page
      if (subscriptions.data.length > 0) {
        startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
      } else {
        // No more subscriptions, break the loop
        break;
      }

      // Check if there are more pages
      hasMore = subscriptions.has_more;
    }

    console.log('Finished getAllNewUserSignupsFromStripe');

    return allSubscribers.map((m) => {
      return {
        id: m.customer.id,
        name: m.customer.name,
        email: m.customer.email,
        created_at: new Date(m.created * 1000).toLocaleString(),
      };
    });
  } catch (error) {
    // Handle any errors from Stripe
    console.error("Stripe Error:", error);
    return null;
  }
};

const parseDeviceFromCredentials = async (credentials) => {
  const devices = [];
  if (credentials && credentials.length > 0) {
    for (let index = 0; index < credentials.length; index++) {
      const item = credentials[index];
      let operationSystem = "";
      if (item.client_id === MAC_CLIENT_ID) {
        operationSystem = MACOS_OPERATION_SYSTEM;
      } else if (item.client_id === WINDOWS_CLIENT_ID) {
        operationSystem = WINDOWS_OPERATION_SYSTEM;
      } else if (MOBILE_CLIENT_ID.find((f) => f === item.client_id)) {
        operationSystem =
          item.device_name === ANDROID_DEVICE_NAME
            ? ANDROID_OPERATION_SYSTEM
            : IOS_OPERATION_SYSTEM;
      }

      if (operationSystem) {
        devices.push({
          operating_system: operationSystem,
        });
      }
    }
  }

  return devices;
};

const getUsersSubscribedNotViaStripe = async (fromDate) => {
  
  console.log('Starting getUsersSubscribedNotViaStripe');
  const query = `
  SELECT auth0_id, last_date_revenue_cat_data_synced, stripe_customer_id, created_at FROM users
  WHERE revenue_cat_status = 'personal' 
  AND last_date_revenue_cat_data_synced >= NOW() - INTERVAL '14 days'
  AND created_at::date >= date '${fromDate.getFullYear()}-${
    fromDate.getMonth() + 1
  }-${fromDate.getDate()}'  `;

  const users = await executeQuery(query);

  console.log('Finished getUsersSubscribedNotViaStripe');
  return users.map((m) => {
    return {
      user_id: m.auth0_id,
      os: ANDROID_OPERATION_SYSTEM,
      last_date_revenue_cat_data_synced: new Date(
        m.last_date_revenue_cat_data_synced
      ),
      created_at: m.created_at,
      stripe_id: m.stripe_customer_id,
    };
  });
};

const fs = require("fs");

const getTrackEventOnboardReport = async () => {
  try {
    const onboardingData = [];
    const users = await fetchUserUpdatedIn45Days();

    const userChunks = chunkArray(users.slice(0), 20);
    let chunkNumber = 0;
    for (const chunk of userChunks) {
      const promises = chunk.map(async (user) => {
        const trackEvents = await fetchTrackEventByUserId(user.id);
        if (trackEvents.length === 0) {
          // most likely an internal test user
          return;
        }
        const activities = await fetchActivityByUserFromDb(user.id);
        const devices = await fetchDeviceByUserId(user.id);
        const focusModeDatas = await fetchFocusModesDataByUserFromDb(user.id);

        const item = mapTrackEvents({
          user_id: user.id,
          created_at: user.created_at,
          updated_at: user.updated_at,
          revenue_cat_status: user.revenue_cat_status,
          track_events: trackEvents,
          activities: activities,
          focusModeDatas: focusModeDatas,
          devices: devices,
        });
        onboardingData.push(item);
      });
      await Promise.all(promises);
      console.log("completed chunk", chunkNumber);
      chunkNumber++;
    }

    fs.writeFileSync("onboardingData.json", JSON.stringify(onboardingData));

    return onboardingData;
  } catch (err) {
    console.error("Error fetching track events:", err);
    throw err;
  }
};

const fetchUserUpdatedIn45Days = async () => {
  const query = `
    SELECT id, created_at, updated_at, revenue_cat_status FROM users
    WHERE updated_at >= NOW() - INTERVAL '45 days' AND created_at >= NOW() - INTERVAL '45 days'
  `;

  return await executeQueryUsingPool(query);
};

const fetchTrackEventByUserId = async (userId) => {
  const query = `
  SELECT
        track_event.id, 
        track_event.user_id, 
        track_event.created_at,
        users.created_at AS user_created_at,
        track_event.event_type, 
        track_event.event_data,
        track_event.operating_system
    FROM
        public.track_event
    INNER JOIN
        users ON track_event.user_id = users.id
    WHERE
        track_event.event_type IN (
            'login-homemade', 'login', 'menu_tour_Skip_clicked', 'menu_tour_setup_complete',
            'start-break-activity', 'complete-break-activity', 'start-morning-routine', 
            'complete-morning-routine', 'start-evening-routine', 'complete-evening-routine',
            'start-focus-mode-manually', 'start-pomodoro-mode-manually', 'switch-to-geek-mode',
            'switch-to-simple-mode', 'block-distracting-app', 'block-distracting-url', 'block-distraction',
            'complete-break-activity', 'complete-morning-routine-activity', 'complete-evening-routine-activity',
            'signup', 'app-quit', 'occupation-selected', 'break-feedback-left', 'completed-focus-session', 'care-about-habits',
            'cares-about-breaks', 'custom-goal-selected', 'uninstall'
        ) AND users.id = '${userId}'
    ORDER BY 
        track_event.user_id DESC, 
        track_event.created_at DESC;`;

  return await executeQueryUsingPool(query);
};

const fetchActivityByUserFromDb = async (userId) => {
  const query = `
    SELECT 
      id, created_at, updated_at, activity_type
    FROM activities
    WHERE user_id = '${userId}'
    ORDER BY created_at DESC
  `;

  return await executeQueryUsingPool(query);
};

const fetchFocusModesDataByUserFromDb = async (userId) => {
  const query = `
    SELECT id, created_at
    FROM focus_modes
    WHERE user_id = '${userId}'
    ORDER BY created_at DESC
  `;

  return await executeQueryUsingPool(query);
};

const fetchDeviceByUserId = async (userId) => {
  const query = `
    SELECT operating_system FROM public.devices
    WHERE devices.user_id = '${userId}'
    ORDER BY created_at ASC
    LIMIT 1
  `;

  const latestDevice = await executeQueryUsingPool(query);

  if (
    latestDevice.length &&
    latestDevice?.[0]?.operating_system !== UNKNOWN_OPERATING_SYSTEM
  ) {
    return latestDevice;
  }

  const auth0Query = `
    SELECT auth0_id as "user_id", 'FAKE' as "email" FROM public.users
    WHERE id = '${userId}'
    ORDER BY created_at ASC
    LIMIT 1
  `;

  const auth0IdResult = await executeQueryUsingPool(auth0Query);
  const deviceResult = await getDeviceForUser(auth0IdResult);
  const processedDeviceResult = deviceResult.slice(0, 1).map((device) => ({
    operating_system: device.os || UNKNOWN_OPERATING_SYSTEM,
  }));
  return processedDeviceResult;
};

const chunkArray = (array, size) => {
  const chunkedArr = [];
  for (let i = 0; i < array.length; i += size) {
    chunkedArr.push(array.slice(i, i + size));
  }
  return chunkedArr;
};

const reportConfig = [
  {
    excel_column_name: COLUMN_NAME_MAPPING.USER_ID,
    event_type: eventTypeConstant.USER_ID,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.FIRST_DESKTOP_LOGIN_DATE,
    event_type: eventTypeConstant.LOGIN_HOMEMADE,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.LAST_UPDATED_DATE,
    event_type: eventTypeConstant.UPDATED_AT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.OCCUPATION,
    event_type: eventTypeConstant.OCCUPATION_SELECTED,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.SUBSCRIPTION_STATUS,
    event_type: eventTypeConstant.REVENUE_CAT_STATUS,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.GOALS_FOR_FOCUS_BEAR,
    event_type: eventTypeConstant.GOALS_FOR_FOCUS_BEAR,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.UNINSTALLED_APP,
    event_type: eventTypeConstant.UNINSTALL,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.PERCENT_DAYS_DID_MORNING_ROUTINE,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.PERCENT_DAYS_DID_EVENING_ROUTINE,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.PERCENT_DAYS_DID_BREAK_ROUTINE,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.PERCENT_DAYS_DID_FOCUS_SESSION,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_ACTIVE,
    event_type: `${eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY}, ${eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY}, ${eventTypeConstant.START_POMODORO_MODE_MANUALLY}, ${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.COUNT_WITH_MULTIPLE_TYPES,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.AVERAGE_HOURS_DEEP_WORK_PER_WEEK,
    event_type: eventTypeConstant.COMPLETED_FOCUS_SESSION,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.NUMBER_MORNING_ROUTINE_HABITS,
    event_type: eventTypeConstant.MORNING,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.NUMBER_EVENING_ROUTINE_HABITS,
    event_type: eventTypeConstant.EVENING,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.NUMBER_BREAK_HABITS,
    event_type: eventTypeConstant.BREAKING,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.NUMBER_OF_FOCUS_MODE,
    event_type: eventTypeConstant.FOCUS_MODE,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.SATISFACTION_WITH_BREAK_TIMING,
    event_type: eventTypeConstant.BREAK_FEEDBACK_LEFT,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.COMPLETED_MENU_TOUR,
    event_type: eventTypeConstant.MENU_TOUR_SETUP_COMPLETE,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.STARTED_BREAK_ACTIVITY,
    event_type: eventTypeConstant.START_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.COMPLETED_BREAK_ACTIVITY,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.STARTED_MORNING_ROUTINE,
    event_type: eventTypeConstant.START_MORNING_ROUTINE,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.COMPLETED_MORNING_ROUTINE,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.STARTED_EVENING_ROUTINE,
    event_type: eventTypeConstant.START_EVENING_ROUTINE,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.COMPLETED_EVENING_ROUTINE,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.STARTED_FOCUS_MODE,
    event_type: eventTypeConstant.START_FOCUS_MODE_MANUALLY,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.STARTED_POMODORO,
    event_type: eventTypeConstant.START_POMODORO_MODE_MANUALLY,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.SWITCH_TO_GEEK_MODE,
    event_type: eventTypeConstant.SWITCH_TO_GEEK_MODE,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.SWITCH_TO_SIMPLE_MODE,
    event_type: eventTypeConstant.SWITCH_TO_SIMPLE_MODE,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.BLOCKED_AN_APP,
    event_type: eventTypeConstant.BLOCK_DISTRACTING_APP,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.BLOCKED_A_URL,
    event_type: eventTypeConstant.BLOCK_DISTRACTING_URL,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.BLOCKED_ON_MOBILE,
    event_type: eventTypeConstant.BLOCK_DISTRACTION,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.SIGNED_UP_ON_MOBILE,
    event_type: eventTypeConstant.SIGNUP,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.SIGNED_UP_ON_MOBILE_DATE,
    event_type: eventTypeConstant.SIGNUP,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },

  {
    excel_column_name: COLUMN_NAME_MAPPING.COMMITMENT_LEVEL_FOR_HABITS,
    event_type: eventTypeConstant.CARE_ABOUT_HABITS,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.CARE_FACTOR_FOR_BREAKS,
    event_type: eventTypeConstant.CARE_ABOUT_BREAKS,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },

  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_1,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 0,
    endHours: 24,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_1,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 0,
    endHours: 24,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_1,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 0,
    endHours: 24,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_1,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 0,
    endHours: 24,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_2,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 25,
    endHours: 48,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_2,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 25,
    endHours: 48,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_2,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 25,
    endHours: 48,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_2,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 25,
    endHours: 48,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_3,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 49,
    endHours: 72,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_3,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 49,
    endHours: 72,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_3,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 49,
    endHours: 72,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_3,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 49,
    endHours: 72,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_4,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 73,
    endHours: 96,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_4,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 73,
    endHours: 96,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_4,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 73,
    endHours: 96,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_4,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 73,
    endHours: 96,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_5,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 97,
    endHours: 120,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_5,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 97,
    endHours: 120,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_5,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 97,
    endHours: 120,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_5,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 97,
    endHours: 120,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_6,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 121,
    endHours: 144,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_6,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 121,
    endHours: 144,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_6,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 121,
    endHours: 144,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_6,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 121,
    endHours: 144,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_7,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 145,
    endHours: 168,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_7,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 145,
    endHours: 168,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_7,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 145,
    endHours: 168,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_7,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 145,
    endHours: 168,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_8,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 169,
    endHours: 192,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_8,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 169,
    endHours: 192,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_8,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 169,
    endHours: 192,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_8,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 169,
    endHours: 192,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_9,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 193,
    endHours: 216,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_9,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 193,
    endHours: 216,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_9,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 193,
    endHours: 216,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_9,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 193,
    endHours: 216,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_10,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 217,
    endHours: 240,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_10,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 217,
    endHours: 240,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_10,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 217,
    endHours: 240,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_10,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 217,
    endHours: 240,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_11,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 241,
    endHours: 264,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_11,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 241,
    endHours: 264,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_11,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 241,
    endHours: 264,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_11,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 241,
    endHours: 264,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_12,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 265,
    endHours: 288,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_12,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 265,
    endHours: 288,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_12,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 265,
    endHours: 288,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_12,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 265,
    endHours: 288,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_13,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 289,
    endHours: 312,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_13,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 289,
    endHours: 312,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_13,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 289,
    endHours: 312,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_13,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 289,
    endHours: 312,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_14,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 313,
    endHours: 336,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_14,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 313,
    endHours: 336,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_14,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 313,
    endHours: 336,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_14,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 313,
    endHours: 336,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_15,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 337,
    endHours: 360,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_15,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 337,
    endHours: 360,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_15,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 337,
    endHours: 360,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_15,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 337,
    endHours: 360,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_16,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 361,
    endHours: 384,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_16,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 361,
    endHours: 384,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_16,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 361,
    endHours: 384,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_16,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 361,
    endHours: 384,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_17,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 385,
    endHours: 408,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_17,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 385,
    endHours: 408,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_17,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 385,
    endHours: 408,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_17,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 385,
    endHours: 408,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_18,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 409,
    endHours: 432,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_18,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 409,
    endHours: 432,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_18,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 409,
    endHours: 432,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_18,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 409,
    endHours: 432,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_19,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 433,
    endHours: 456,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_19,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 433,
    endHours: 456,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_19,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 433,
    endHours: 456,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_19,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 433,
    endHours: 456,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_20,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 457,
    endHours: 480,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_20,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 457,
    endHours: 480,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_20,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 457,
    endHours: 480,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_20,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 457,
    endHours: 480,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_21,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 481,
    endHours: 504,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_21,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 481,
    endHours: 504,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_21,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 481,
    endHours: 504,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_21,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 481,
    endHours: 504,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_22,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 505,
    endHours: 528,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_22,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 505,
    endHours: 528,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_22,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 505,
    endHours: 528,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_22,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 505,
    endHours: 528,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_23,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 529,
    endHours: 552,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_23,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 529,
    endHours: 552,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_23,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 529,
    endHours: 552,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_23,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 529,
    endHours: 552,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_24,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 553,
    endHours: 576,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_24,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 553,
    endHours: 576,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_24,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 553,
    endHours: 576,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_24,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 553,
    endHours: 576,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_25,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 577,
    endHours: 600,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_25,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 577,
    endHours: 600,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_25,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 577,
    endHours: 600,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_25,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 577,
    endHours: 600,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_26,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 601,
    endHours: 624,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_26,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 601,
    endHours: 624,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_26,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 601,
    endHours: 624,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_26,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 601,
    endHours: 624,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_27,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 625,
    endHours: 648,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_27,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 625,
    endHours: 648,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_27,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 625,
    endHours: 648,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_27,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 625,
    endHours: 648,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_MORNING_HABIT_ON_DAY_28,
    event_type: eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 649,
    endHours: 672,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_BREAKS_ON_DAY_28,
    event_type: eventTypeConstant.COMPLETE_BREAK_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 649,
    endHours: 672,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.USED_FOCUS_MODE_ON_DAY_28,
    event_type: `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 649,
    endHours: 672,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.DID_EVENING_HABIT_ON_DAY_28,
    event_type: eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY,
    breakDownByProperty: breakDownByPropertyConstant.EVENT_COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
    startHours: 649,
    endHours: 672,
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.ENABLE_TIME_TRACKER,
    event_type: eventTypeConstant.SETTING_CHANGED_ENABLE_TIME_TRACKER,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.ENABLE_LATE_NO_MORE,
    event_type: eventTypeConstant.SHOW_LATE_NO_MORE_WINDOW,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
  {
    excel_column_name: COLUMN_NAME_MAPPING.QUIT_WITHIN_7_DAYS,
    event_type: eventTypeConstant.APP_QUIT,
    breakDownByProperty: breakDownByPropertyConstant.COUNT,
    highlightRule: "",
    timeframe: { offset: "", offsetDays: "" },
    value: "",
  },
];

const mapTrackEvents = ({
  user_id,
  created_at,
  updated_at,
  revenue_cat_status,
  track_events,
  activities,
  focusModeDatas,
  devices,
}) => {
  const active_days = calculateDaysBetweenDates(created_at, updated_at);

  const setConfigValues = (config, value) => {
    config.value = value;
    config.highlightRule = value
      ? highlightRuleConstant.GREEN
      : highlightRuleConstant.RED;
  };

  const getRoutineDetails = (
    event_type,
    track_events,
    breakDownByProperty,
    excel_column_name,
    active_days,
    startHours,
    endHours,
    user_id
  ) => {
    return breakDownByProperty === breakDownByPropertyConstant.EVENT_COUNT
      ? countRoutineEvent(
          event_type,
          track_events,
          startHours,
          endHours,
          user_id
        )
      : excel_column_name === COLUMN_NAME_MAPPING.COMPLETED_BREAK_ACTIVITY
      ? getEventDetails(event_type, track_events, excel_column_name)
      : getPercentOfDayDidRoutineHabit(event_type, track_events, active_days);
  };

  const getDetailsAndSetConfig = (config, details) => {
    config.timeframe.offset = details.offset;
    config.timeframe.offsetDays = details.offsetDays;
    config.value = details.value;
    config.highlightRule = details.value
      ? highlightRuleConstant.GREEN
      : highlightRuleConstant.RED;
  };

  const reportConfigWithDetails = reportConfig.map((config) => {
    const {
      event_type,
      excel_column_name,
      breakDownByProperty,
      startHours,
      endHours,
    } = config;

    switch (event_type) {
      case eventTypeConstant.USER_ID:
        setConfigValues(config, user_id);
        break;

      case eventTypeConstant.UPDATED_AT:
        setConfigValues(config, updated_at ? formatDate(updated_at) : null);
        break;

      case eventTypeConstant.LOGIN_HOMEMADE:
        setConfigValues(config, created_at ? formatDate(created_at) : null);
        break;

      case eventTypeConstant.REVENUE_CAT_STATUS:
        setConfigValues(config, revenue_cat_status ? revenue_cat_status : null);
        break;

      case eventTypeConstant.APP_QUIT:
        getDetailsAndSetConfig(
          config,
          didQuitWithinDays(event_type, track_events, 7)
        );
        break;

      case eventTypeConstant.COMPLETE_MORNING_ROUTINE_ACTIVITY:
      case eventTypeConstant.COMPLETE_BREAK_ACTIVITY:
      case eventTypeConstant.COMPLETE_EVENING_ROUTINE_ACTIVITY:
      case eventTypeConstant.UNINSTALL:
      case `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`:
        const routineDetails = getRoutineDetails(
          event_type,
          track_events,
          breakDownByProperty,
          excel_column_name,
          active_days,
          startHours,
          endHours,
          user_id
        );

        getDetailsAndSetConfig(config, routineDetails);
        break;

      case eventTypeConstant.COMPLETED_FOCUS_SESSION:
        getDetailsAndSetConfig(
          config,
          getAverageHoursDeepWorkPerWeek(event_type, track_events, active_days)
        );
        break;

      case eventTypeConstant.OCCUPATION_SELECTED:
        getDetailsAndSetConfig(
          config,
          getEventPropertyValue(event_type, track_events, ["occupation"])
        );
        break;

      case eventTypeConstant.GOALS_FOR_FOCUS_BEAR:
        getDetailsAndSetConfig(
          config,
          getEventPropertyValue(event_type, track_events, [
            "custom-goal",
            "customGoal",
          ])
        );
        break;

      case eventTypeConstant.BREAK_FEEDBACK_LEFT:
        getDetailsAndSetConfig(
          config,
          calculateAverageOfBreakTiming(track_events)
        );
        break;

      case eventTypeConstant.MORNING:
      case eventTypeConstant.EVENING:
      case eventTypeConstant.BREAKING:
        getDetailsAndSetConfig(
          config,
          getActivityConfigDetail(activities, event_type)
        );
        break;

      case eventTypeConstant.FOCUS_MODE:
        getDetailsAndSetConfig(
          config,
          getFocusModeConfigDetail(focusModeDatas)
        );
        break;

      default:
        const data =
          breakDownByProperty ===
          breakDownByPropertyConstant.COUNT_WITH_MULTIPLE_TYPES
            ? getEventDetailsWithMultipleType(event_type, track_events)
            : getEventDetails(event_type, track_events, excel_column_name);
        getDetailsAndSetConfig(config, data);
        break;
    }

    return { ...config };
  });

  return {
    os: devices.map((d) => d.operating_system),
    reportConfig: reportConfigWithDetails,
  };
};

const getActivityConfigDetail = (activities, type) => {
  const filteredActivities = activities.filter((f) => f.activity_type === type);
  const offset =
    filteredActivities.length > 0 ? filteredActivities[0].created_at : null;
  const offsetDays = offset
    ? calculateDaysBetweenDates(offset, new Date().toISOString())
    : 0;
  const value = filteredActivities.length;
  return { offset, offsetDays, value };
};

const getFocusModeConfigDetail = (datas) => {
  const offset = datas.length > 0 ? datas[0].created_at : null;
  const offsetDays = offset
    ? calculateDaysBetweenDates(offset, new Date().toISOString())
    : 0;
  const value = datas.length;
  return { offset, offsetDays, value };
};

const getPercentOfDayDidRoutineHabit = (
  event_type,
  track_events,
  active_days
) => {
  const { offset, offsetDays, value } = countRoutineDays(
    event_type,
    track_events
  );
  const percentValue =
    active_days === 0
      ? 0
      : parseFloat(((value * 100) / active_days).toFixed(1));
  return { offset, offsetDays, value: percentValue };
};

const getAverageHoursDeepWorkPerWeek = (eventType, events, active_days) => {
  const filteredEvents = events
    .filter((event) => event.event_type === eventType)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const sumFocusDurationMinutes = calculateTotalByEventDataType(
    filteredEvents,
    "focusDurationMinutes"
  );
  const offset =
    filteredEvents.length > 0 ? filteredEvents[0].created_at : null;
  const offsetDays = offset
    ? calculateDaysBetweenDates(offset, new Date().toISOString())
    : 0;
  const value =
    active_days === 0
      ? 0
      : parseFloat(
          (sumFocusDurationMinutes / (active_days / 7) / 60).toFixed(1)
        );
  return { offset, offsetDays, value };
};

const getEventDetailsWithMultipleType = (eventTypes, events) => {
  const filteredEvents = events.filter((event) =>
    eventTypes.includes(event.event_type)
  );
  const latestEvent = filteredEvents.reduce(
    (oldest, current) =>
      !oldest || new Date(current.created_at) < new Date(oldest.created_at)
        ? current
        : oldest,
    null
  );
  const offset = latestEvent ? latestEvent.created_at : null;
  const offsetDays = offset
    ? calculateDaysBetweenDates(offset, new Date().toISOString())
    : 0;
  const value = !!latestEvent;
  return { offset, offsetDays, value };
};

const getEventDetails = (eventType, events, excel_column_name) => {
  const filteredEvents = events.filter(
    (event) => event.event_type === eventType
  );
  const event = filteredEvents.reduce(
    (oldest, current) =>
      !oldest || new Date(current.created_at) < new Date(oldest.created_at)
        ? current
        : oldest,
    null
  );
  const offset = event ? event.created_at : null;
  const offsetDays = offset
    ? calculateDaysBetweenDates(offset, new Date().toISOString())
    : 0;
  const value =
    [
      eventTypeConstant.LOGIN_HOMEMADE,
      eventTypeConstant.LOGIN,
      eventTypeConstant.SIGNUP,
    ].includes(eventType) &&
    excel_column_name !== COLUMN_NAME_MAPPING.SIGNED_UP_ON_MOBILE
      ? event
        ? formatDate(event.created_at)
        : ""
      : !!event;
  return { offset, offsetDays, value };
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${year}-${month}-${day}`;
};

const didQuitWithinDays = (eventType, events, targetDay) => {
  const firstLoginDetails = getEventDetails(
    eventTypeConstant.LOGIN_HOMEMADE,
    events
  );
  const quitDetails = getEventDetails(eventType, events);
  if (!firstLoginDetails.offset || !quitDetails.offset) {
    return { ...quitDetails, value: false };
  }
  const quitWithinDays =
    calculateDaysBetweenDates(firstLoginDetails.offset, quitDetails.offset) <=
    targetDay;
  return { ...quitDetails, value: quitWithinDays };
};

const countRoutineEvent = (
  eventType,
  events,
  startHours = null,
  endHours = null,
  user_id
) => {
  const signupTime = new Date(events[0]?.user_created_at);
  if (!signupTime) return { offset: null, offsetDays: 0, value: 0 };

  const types = eventType.split(",");
  let filteredEvents = events
    .filter((event) => types.includes(event.event_type))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  if (startHours !== null && endHours !== null) {
    const startTime = new Date(signupTime);
    startTime.setUTCHours(signupTime.getUTCHours() + startHours);

    const endTime = new Date(signupTime);
    endTime.setUTCHours(signupTime.getUTCHours() + endHours);

    filteredEvents = filteredEvents.filter(
      (event) =>
        new Date(event.created_at) >= startTime &&
        new Date(event.created_at) <= endTime
    );
  }

  const offset =
    filteredEvents.length > 0 ? filteredEvents[0].created_at : null;
  const offsetDays = offset
    ? calculateDaysBetweenDates(offset, new Date().toISOString())
    : 0;
  const value =
    eventType ===
    `${eventTypeConstant.START_POMODORO_MODE_MANUALLY},${eventTypeConstant.START_FOCUS_MODE_MANUALLY}`
      ? calculateTotalByEventDataType(filteredEvents, "focusDuration")
      : filteredEvents.length;

  return { offset, offsetDays, value };
};

const countRoutineDays = (eventType, events) => {
  const types = eventType.split(",");
  const filteredEvents = events
    .filter((event) => types.includes(event.event_type))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  let distinctEvents = [];
  let seenDates = new Set();

  filteredEvents.forEach((event) => {
    let eventDate = new Date(event.created_at).toISOString().split("T")[0];
    if (!seenDates.has(eventDate)) {
      distinctEvents.push(event);
      seenDates.add(eventDate);
    }
  });

  const offset =
    distinctEvents.length > 0 ? distinctEvents[0].created_at : null;
  const offsetDays = offset
    ? calculateDaysBetweenDates(offset, new Date().toISOString())
    : 0;
  const value = distinctEvents.length;

  return { offset, offsetDays, value };
};

const calculateTotalByEventDataType = (events, event_data_type) => {
  const value = events.reduce((pre, cur) => {
    const curValue = parseInt(cur?.event_data?.data?.[event_data_type]) || 0;
    return pre + curValue;
  }, 0);
  return value;
};

const calculateAverageOfBreakTiming = (events) => {
  const filteredEvents = events
    .filter(
      (event) => event.event_type === eventTypeConstant.BREAK_FEEDBACK_LEFT
    )
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const offset =
    filteredEvents.length > 0 ? filteredEvents[0].created_at : null;
  const offsetDays = offset
    ? calculateDaysBetweenDates(offset, new Date().toISOString())
    : 0;

  const sumBreakingTiming = filteredEvents.reduce((pre, cur) => {
    const breakingTimingValue =
      parseInt(cur?.event_data?.data?.["breaking-timing"]) || 0;
    return pre + breakingTimingValue;
  }, 0);

  const value =
    filteredEvents.length === 0
      ? 0
      : Math.round(sumBreakingTiming / filteredEvents.length);

  return { offset, offsetDays, value };
};

const calculateDaysBetweenDates = (date1, date2) => {
  const differenceInMilliseconds = new Date(date2) - new Date(date1);
  return Math.floor(differenceInMilliseconds / (1000 * 60 * 60 * 24)) + 1;
};

const getEventPropertyValue = (eventType, events, propertyNames) => {
  // Filter events based on event type
  const filteredEvents = events.filter(
    (event) => event.event_type === eventType
  );

  // Find the oldest event based on creation date
  const oldestEvent = filteredEvents.reduce(
    (oldest, current) =>
      !oldest || new Date(current.created_at) < new Date(oldest.created_at)
        ? current
        : oldest,
    null
  );

  // Calculate offset and offsetDays
  const offset = oldestEvent ? oldestEvent.created_at : null;
  const offsetDays = offset
    ? calculateDaysBetweenDates(offset, new Date().toISOString())
    : 0;

  // Extract values dynamically based on the propertyName
  const value = joinUniqueStrings(
    filteredEvents.map((event) => {
      let value = "";
      propertyNames.forEach((propertyName) => {
        if (event.event_data.data?.[propertyName]) {
          value = JSON.stringify(event.event_data.data[propertyName]);
        }
      });

      return value;
    })
  );

  return { offset, offsetDays, value };
};

const joinUniqueStrings = (array) => {
  const uniqueSet = new Set(array);
  return Array.from(uniqueSet).join(" ");
};

const postToSlack = async (content, title) => {
  const payload = {
    attachments: [
      {
        title: title,
        text: content,
        created_at: new Date(),
      },
    ],
  };

  axios
    .post(process.env.SLACK_SERVICE, payload)
    .then((response) => {
      console.info(`Message posted successfully: ${response}`);
    })
    .catch((error) => {
      console.error(`Error posting message to Slack API: ${error}`);
    });
};


module.exports = {
  exportToExcel2,
  exportToExcel,
  getAccessToken,
  getSubscriptionByUserId,
  executeQuery,
  getUserFromAuth0,
  fetchDeviceCredentials,
  getDeviceForUser,
  getNewSubscriptionsLastMonth,
  getDeviceForStripeUser,
  getAllNewUserSignupsFromStripe,
  getAllNewSubscribersFromStripe,
  postToSlack,
  getUsersSubscribedNotViaStripe,
  getTrackEventOnboardReport,
  mapTrackEvents,
};
