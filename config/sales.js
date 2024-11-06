const jsforce = require('jsforce');
require('dotenv').config();

const {
  SALESFORCE_LOGIN_URL,
  SALESFORCE_USERNAME,
  SALESFORCE_PASSWORD,
  SALESFORCE_TOKEN,
} = process.env;

// Create a new Jsforce connection
const conn = new jsforce.Connection({
  loginUrl: SALESFORCE_LOGIN_URL,
});

// Login to Salesforce
conn.login(SALESFORCE_USERNAME, SALESFORCE_PASSWORD + SALESFORCE_TOKEN, (err, userInfo) => {
  if (err) {
    console.error('Login Error:', err);
    return;
  }

  console.log('User Id:', userInfo.id);
  console.log('Org Id:', userInfo.organizationId);
});

// Function to create Account and Contact using Jsforce
async function createSalesforceAccountAndContact(user) {
  try {
    // Create Account
    const accountData = { Name: user.companyName || `${user.firstName} ${user.lastName}` };
    const accountResult = await conn.sobject('Account').create(accountData);

    if (!accountResult.success) {
      throw new Error('Failed to create Account: ' + accountResult.errors.join(', '));
    }

    console.log('Account created with Id:', accountResult.id);

    // Create Contact
    const contactData = {
      FirstName: user.firstName,
      LastName: user.lastName,
      Email: user.email,
      AccountId: accountResult.id,
    };
    const contactResult = await conn.sobject('Contact').create(contactData);

    if (!contactResult.success) {
      throw new Error('Failed to create Contact: ' + contactResult.errors.join(', '));
    }

    console.log('Contact created with Id:', contactResult.id);
  } catch (error) {
    console.error('Error creating Account/Contact:', error);
    throw error;
  }
}

// Export the function
module.exports = createSalesforceAccountAndContact;
