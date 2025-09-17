// generate a report for the number of new auth0 signups per month
// and how many of those users eventually subscribed to the app

require("dotenv").config();

const ExcelJS = require("exceljs");
const axios = require("axios");
const { Client } = require("pg");

// Auth0
const domain = process.env.AUTH0_DOMAIN;
const clientId = process.env.AUTH0_MANAGEMENT_CLIENT_ID;
const clientSecret = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET;
const audience = `https://${domain}/api/v2/`;

// Stripe
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = require("stripe")(STRIPE_SECRET_KEY);

// Database connection
const connectionString = process.env.DATABASE_CONNECTIONSTRING;
const client = new Client({
  connectionString: connectionString,
});

const filePath = "users.xlsx";
const date = new Date();
const fromDate = new Date(date.getFullYear(), date.getMonth(), 1);

async function exportToExcel(data, filePath) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sheet 1");

  const headers = Object.keys({
    auth_id: "auth_id",
    auth_email: "auth_email",
    name: "name",
    auth_created_at: "auth_created_at",
    users_stripe_id: "users_stripe_id",
    os: "os",
    stripe_subscription_date: "stripe_subscription_date",
  });

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

  data.forEach((row) => {
    const rowData = [];
    headers.forEach((header) => {
      rowData.push(row[header]);
    });
    worksheet.addRow(rowData);
  });

  await workbook.xlsx.writeFile(filePath);
  console.log("Excel file has been created successfully.");
}

async function getUsersCreatedLastMonth() {
  try {
    const token = await getAccessToken();
    const accessToken = token;

    const oneMonthAgo = fromDate.toISOString();

    let allUsers = [];
    let page = 0;

    // Get all user from auth0, one month before
    while (true) {
      const userUrl = `https://${domain}/api/v2/users`;
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      };
      const params = {
        q: `created_at:[${oneMonthAgo} TO *]`,
        sort: "created_at:1",
        page: ++page,
        per_page: 100,
      };

      const userResponse = await axios.get(userUrl, { headers, params });

      allUsers = allUsers.concat(userResponse.data);

      if (userResponse.data.length < params.per_page) break;
    }

    // Get user from Database
    const usersFromDb = await getUsersFromDb();

    const usersData = [];

    // Get Subcription if user have stripe_customer_id
    for (item of allUsers) {
      const userItem = usersFromDb.find((f) => f.auth0_id === item.user_id);

      let stripe_subscription_date = "";
      if (userItem && userItem.stripe_customer_id) {
        const subsctiption = await getSubscriptionFromUserId(
          userItem.stripe_customer_id
        );

        if (subsctiption[0])
          stripe_subscription_date = subsctiption[0].startDate;
      }

      if (userItem)
        usersData.push({
          auth_id: item.user_id,
          auth_email: item.email,
          name: item.name,
          auth_created_at: item.created_at,
          users_stripe_id: userItem.stripe_customer_id,
          stripe_subscription_date: stripe_subscription_date,
          os: userItem.operating_system,
        });
    }

    return usersData;
  } catch (error) {
    console.error(
      "Error retrieving users:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
}

async function getUsersFromDb() {
  await client.connect();

  await client.query("BEGIN");

  const usersQuery = `SELECT devices.user_id, devices.operating_system, users.stripe_customer_id, users.auth0_id, COUNT(*) AS subscription_count
                FROM devices
                INNER JOIN users ON devices.user_id = users.id
                WHERE users.created_at::date >= date '${fromDate.getFullYear()}-${
    fromDate.getMonth() + 1
  }-${fromDate.getDate()}'
                GROUP BY devices.user_id, devices.operating_system, users.stripe_customer_id, users.auth0_id`;

  const users = await client.query(usersQuery);
  return users.rows;
}

const getAccessToken = async () => {
  const response = await axios.post(`https://${domain}/oauth/token`, {
    client_id: clientId,
    client_secret: clientSecret,
    audience: audience,
    grant_type: "client_credentials",
  });
  return response.data.access_token;
};

async function getSubscriptionFromUserId(stripeCustomerId) {
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
}

const main = async () => {
  const users = await getUsersCreatedLastMonth();

  exportToExcel(users, filePath)
    .then(() => console.log("Export completed"))
    .catch((err) => console.error("Error exporting to Excel:", err));
};

main();
