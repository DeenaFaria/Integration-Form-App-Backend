const Odoo = require('node-odoo');
require('dotenv').config();
const express = require('express');
const router = express.Router();

// Create an instance of node-odoo with your Odoo connection details
const odoo = new Odoo({
  url: process.env.ODOO_URL,
  //port: 8069, // Default Odoo port; adjust if needed
  db: process.env.ODOO_DB,
  username: process.env.ODOO_USERNAME,
  password: process.env.ODOO_PASSWORD,
});

// Function to authenticate with Odoo
const authenticateOdoo = () => {
  return new Promise((resolve, reject) => {
    odoo.connect((err) => {
      if (err) {
        console.error('Failed to connect to Odoo:', err);
        reject(err);
      } else {
        console.log('Authenticated successfully with Odoo.');
        resolve();
      }
    });
  });
};

// Export the Odoo instance and the authenticate function
module.exports = { odoo, authenticateOdoo };
