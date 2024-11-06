const axios = require('axios');
require('dotenv').config();
const cookieJar = require('axios-cookiejar-support').default;
const tough = require('tough-cookie');

const cookieJarInstance = new tough.CookieJar();
const odooInstance = axios.create({
  baseURL: process.env.ODOO_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  jar: cookieJarInstance, // Add cookie jar here
});


// Variable to store the session token and expiration time
let sessionToken = null;
let tokenExpiration = null; // Store the expiration time in milliseconds

// Function to authenticate with Odoo and get a session
const authenticateOdoo = async () => {
  try {
    const response = await odooInstance.post('/web/session/authenticate', {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        db: process.env.ODOO_DB,
        login: process.env.ODOO_USERNAME,
        password: process.env.ODOO_PASSWORD,
      },
    });

    // Log the whole response for debugging
    console.log('Authentication response:', JSON.stringify(response.data, null, 2));

    // Check if the authentication is successful
    if (response.data && response.data.result) {
      console.log('Authenticated successfully. User ID:', response.data.result.uid);
      return true; // Indicate successful authentication
    } else {
      console.error('Failed to authenticate:', response.data);
      throw new Error('Authentication failed: No valid result returned.');
    }
  } catch (error) {
    console.error('Failed to authenticate with Odoo:', error);
    throw error;
  }
};
  

// Function to get the current session token
const getSessionToken = async () => {
  // If the session token is null or expired, authenticate again
  if (!sessionToken || Date.now() >= tokenExpiration) {
    console.log('Session token expired or not set, authenticating...');
    return await authenticateOdoo();
  }
  console.log('Using existing session token:', sessionToken);
  return sessionToken; // Return the existing session token
};

module.exports = { odooInstance, authenticateOdoo, getSessionToken };
