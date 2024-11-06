const axios = require('axios');
require('dotenv').config();
const crypto = require('crypto');

const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const username = process.env.JIRA_EMAIL;
const password = process.env.JIRA_API_TOKEN;
const projectKey= process.env.PROJECT_KEY;

const auth = { username, password };

// Function to get users from Jira
async function getUsers() {
    try {
        const config = {
            method: 'get',
            url: `${JIRA_BASE_URL}/rest/api/3/user/search?query=`,
            headers: { 'Content-Type': 'application/json' },
            auth,
        };
        const response = await axios.request(config);
        console.log(response.data);
        return response.data;
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

async function getJiraProducts() {
    try {
        const response = await axios.get(`${process.env.JIRA_BASE_URL}/rest/api/3/products`, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64')}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        console.log('Available Jira Products:', response.data);
    } catch (error) {
        console.error('Error fetching Jira products:', error);
    }
}


async function createJiraUser(displayName, email, userShortname) {
    // Generate a random 12-character password
    const password = crypto.randomBytes(6).toString('hex');

    const newUser = {
        displayName: displayName,
        emailAddress: email,
        name: userShortname,
        password: password,
        products: ["jira-software"] 
    };

    // Use Basic Auth with the email and API token
    const authString = `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`;
    const encodedAuth = Buffer.from(authString).toString('base64');

    try {
        const response = await axios.post(
            `${process.env.JIRA_BASE_URL}/rest/api/2/user`,
            newUser,
            {
                headers: {
                    Authorization: `Basic ${encodedAuth}`, // Use Basic Auth
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('User created successfully:', response.data);
        return response.data.accountId; // Return the accountId
    } catch (error) {
        console.error('Error creating Jira user:', error.response?.data || error.message);
        throw new Error('Failed to create Jira user');
    }
}




// Function to create an issue in Jira
async function createIssue(projectKey, issueType, summary, link, priority, username) {
    try {
        // Construct the data object with the username included in the description
        const data = {
            fields: {
                project: { key: projectKey },
                summary,
                description: `Reported by: ${username}\nLink to the page: ${link}`, // Include the username and link in the description
                issuetype: { name: issueType },
                priority: { name: priority }, // Set the priority
            },
        };
        const config = {
            headers: { 'Content-Type': 'application/json' },
            auth,
        };

        // Make the POST request to Jira API
        const response = await axios.post(`${process.env.JIRA_BASE_URL}/rest/api/2/issue`, data, config);
        return response.data.key; // Return the issue key
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
        return null;
    }
}


// Function to create a new project in Jira
async function createProject(projectName) {
    if (!projectKey) {
        console.error('Failed to create project.');
        return;
    }
    try {
        const leadAccountID = process.env.LEAD_ACCT_ID;
        const data = {
            key: projectKey,
            name: projectName,
            projectTypeKey: 'software',
            leadAccountId: leadAccountID,
        };
        const config = {
            headers: { 'Content-Type': 'application/json' },
            auth,
        };
        const response = await axios.post(`${JIRA_BASE_URL}/rest/api/3/project`, data, config);
        console.log(response.data);
        return response.data.key;
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

// Main function to create a project, create an issue, and update it
async function createProjectIssuesAndUpdate() {
    const projectName = process.env.PROJECT_NAME;
    const projectKey = await createProject(projectName);
    console.log(`Created project with key: ${projectKey}`);

    const issueType = 'Task';
    const summary = 'Need to use Figma';
    const description = 'bleh';

    const issueKey = await createIssue(projectKey, issueType, summary, description);
    console.log(`Created issue with key: ${issueKey}`);

    // Implement updateStatus if necessary
    // const statusId = '21';
    // const update = await updateStatus(issueKey, statusId);
    // console.log(update);
}

module.exports = { getUsers,getJiraProducts, createJiraUser, createIssue, createProject, createProjectIssuesAndUpdate };
