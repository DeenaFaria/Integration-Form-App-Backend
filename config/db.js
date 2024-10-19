const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables from .env

const db = mysql.createConnection({
  host: process.env.DB_HOST_PROD,
  user: process.env.DB_USER_PROD,
  password: process.env.DB_PASS_PROD,
  database: process.env.DB_NAME_PROD,
  port:process.env.DB_PORT_NUMBER,
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.message);
  } else {
    console.log('Connected to MySQL database');
  }
});

module.exports = db;
