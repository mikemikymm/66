const axios = require("axios");
require("dotenv").config();
const fs = require("fs");
const { Client } = require("pg");

const domain = process.env.AUTH0_DOMAIN;
const clientId = process.env.AUTH0_MANAGEMENT_CLIENT_ID;
const clientSecret = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET;
const audience = `https://${domain}/api/v2/`;
const WEB_OPERATION_SYSTEM = "Web";
const IOS_OPERATION_SYSTEM = "iOS";
const MACOS_OPERATION_SYSTEM = "MacOS";
const WINDOWS_OPERATION_SYSTEM = "Windows";
const ANDROID_OPERATION_SYSTEM = "Android";
const ANDROID_DEVICE_NAME = "okhttp";
const MAC_CLIENT_ID = "dgMrlNC5mM634Sxi9SLqIqi0WvgVpwX7";
const WINDOWS_CLIENT_ID = "YAYPDa7sAVKuheZy3dYWyzNncOSZq98I";
const MOBILE_CLIENT_ID = "cZ2J5dR8FliHiTyOdlyk18wKottWxPaC";

const getAccessToken = async () => {
  const response = await axios.post(`https://${domain}/oauth/token`, {
    client_id: clientId,
    client_secret: clientSecret,
    audience: audience,
    grant_type: "client_credentials",
  });
  return response.data.access_token;
};

const fetchDeviceCredentials = async (userId, token) => {
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

const connectionString = process.env.DATABASE_CONNECTIONSTRING;

const client = new Client({
  connectionString: connectionString,
});

const main = async () => {
  const token = await getAccessToken();
  try {
    const date = new Date();
    date.setMonth(date.getMonth() - 3);

    await client.connect();

    await client.query("BEGIN");

    const usersQuery = `SELECT * FROM users WHERE created_at::date >= date '${date.getFullYear()}-${
      date.getMonth() + 1
    }-${date.getDate()}' AND id NOT IN (SELECT user_id FROM devices)`;

    let deviceValuesQuery = "";
    const users = await client.query(usersQuery);
    for (let index = 0; index < users.rows.length; index++) {
      const user = users.rows[index];
      const credentials = await fetchDeviceCredentials(user.auth0_id, token);
      if (credentials && credentials.length > 0) {
        for (let index = 0; index < credentials.length; index++) {
          const item = credentials[index];
          let operationSystem = WEB_OPERATION_SYSTEM;
          if (item.client_id === MAC_CLIENT_ID) {
            operationSystem = MACOS_OPERATION_SYSTEM;
          } else if (item.client_id === WINDOWS_CLIENT_ID) {
            operationSystem = WINDOWS_OPERATION_SYSTEM;
          } else if (item.client_id === MOBILE_CLIENT_ID) {
            operationSystem =
              item.device_name === ANDROID_DEVICE_NAME
                ? ANDROID_OPERATION_SYSTEM
                : IOS_OPERATION_SYSTEM;
          }
          deviceValuesQuery =
            deviceValuesQuery +
            `('${user.id}', '${operationSystem}', 'false'),`;
        }
      }
    }

    if (deviceValuesQuery) {
      console.log(
        `INSERT INTO devices (user_id, operating_system, is_leader) VALUES ${deviceValuesQuery.slice(
          0,
          -1
        )}`
      );
      // await client.query(
      //   `INSERT INTO devices (user_id, operating_system, is_leader) VALUES ${deviceValuesQuery.slice(
      //     0,
      //     -1
      //   )}`
      // );
    }

    await client.query("COMMIT");
    console.log("Data imported successfully");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error fetching data: ", error);
  } finally {
    await client.end();
  }
};

main();
