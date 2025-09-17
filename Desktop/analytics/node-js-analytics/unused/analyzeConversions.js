const axios = require('axios');

// Auth0 credentials
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_IDENTIFIER = process.env.AUTH0_IDENTIFIER;
const AUTH0_MANAGEMENT_CLIENT_ID = process.env.AUTH0_MANAGEMENT_CLIENT_ID;
const AUTH0_MANAGEMENT_CLIENT_SECRET = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET;

// Stripe credentials
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_API_BASE_URL = 'https://api.stripe.com/v1';

// Auth0 API endpoints
const AUTH0_API_BASE_URL = `https://${AUTH0_DOMAIN}`;
const AUTH0_API_USERS_URL = `${AUTH0_API_BASE_URL}/api/v2/users`;

// Function to get user data from Auth0
async function getUserData() {
    try {
        /*
        console.log({
            grant_type: 'client_credentials',
            client_id: AUTH0_MANAGEMENT_CLIENT_ID,
            client_secret: AUTH0_MANAGEMENT_CLIENT_SECRET,
            audience: AUTH0_IDENTIFIER
        });
        */

        const tokenResponse = await axios.post(`${AUTH0_API_BASE_URL}/oauth/token`, {
            grant_type: 'client_credentials',
            client_id: AUTH0_MANAGEMENT_CLIENT_ID,
            client_secret: AUTH0_MANAGEMENT_CLIENT_SECRET,
            audience: AUTH0_IDENTIFIER
        });

        const accessToken = tokenResponse.data.access_token;

        const userResponse = await axios.get(`${AUTH0_API_USERS_URL}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        return userResponse.data;
    } catch (error) {
        console.error('Error fetching user data:', error.response ? error.response.data : error.message);
        return null;
    }
}

// Function to fetch subscription data from Stripe
async function getAllSubscriptions() {
    let subscriptions = [];
    let lastSubscriptionId = undefined;

    while (true) {
        const response = await axios.get(`${STRIPE_API_BASE_URL}/customers`, {
            headers: {
                Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            params: {
                limit: 100, // Maximum allowed by Stripe
                starting_after: lastSubscriptionId
            }
        });

        subscriptions = subscriptions.concat(response.data.data);

        if (response.data.has_more) {
            console.log('fetching stripe customers: ' + subscriptions.length);
            lastSubscriptionId = subscriptions[subscriptions.length - 1].id;
        } else {
            console.log('done');
            break;
        }
    }

    return subscriptions;
}

async function getUserDevices(userId) {
    const accessToken = await getAccessToken();

    const userResponse = await axios.get(`https://${domain}/api/v2/users/${userId}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    // This will log the user's details, including any device information if available
    console.log(userResponse.data);
}

// Function to analyze trial to paid conversions
async function analyzeConversions() {
    try {
        // Fetch user data from Auth0
        const userData = await getUserData();

        const device = userData.device; // Assuming device information is available in Auth0 user data
        const platform = userData.platform; // Assuming platform information is available in Auth0 user data
       
        //fs.writeFileSync('auth0users.json', JSON.stringify(userData));

        userData.forEach(user => {
            if (user.user_metadata && user.user_metadata.first_device){
                console.log('User ID: ${user.user_id} = ', user);
            } else {
                console.log('User ID: ${user.user_id} = N/A');
            }
        })

        /*
        // Fetch subscription data from Stripe

        const subscriptionData = await getAllSubscriptions();
        console.log(Object.keys(subscriptionData[0]))
    
        fs.writeFileSync('stripecustomers.json', JSON.stringify(subscriptionData));

        console.log('customers fetched: ' + (subscriptionData.length));
        */

        // Analyze trial to paid conversions
        // You need to implement logic to analyze subscription data and calculate conversions

        // Calculate conversion rate by device
        // You need to implement logic to calculate conversion rate based on device information

        // Calculate conversion rate by platform
        // You need to implement logic to calculate conversion rate based on platform information
    } catch (error) {
        console.error('Error analyzing conversions:', error);
    }
}

// Example usage
const userId = 'user_id_to_analyze'; // Replace with the user ID you want to analyze
analyzeConversions();
