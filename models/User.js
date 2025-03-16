// backend/models/User.js
const pool = require('../config/db');

// Create a new user
const createUser = async (user) => {
  const { name, email, password } = user;
  const query = `
    INSERT INTO public."USERS" ("NAME", "EMAIL", "PASSWORD", "ROLE")
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const values = [name, email, password, "user"];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

// Find user by email
const findUserByEmail = async (email) => {
  const query = 'SELECT * FROM public."USERS" WHERE "EMAIL" = $1';
  const { rows } = await pool.query(query, [email]);
  return rows[0];
};

const getUserById = async (userId) => {
  const query = `SELECT "ID", "NAME", "EMAIL" FROM "USERS" WHERE "ID" = $1;`;
  const result = await pool.query(query, [userId]);
  return result.rows[0]; // Return user details
};

module.exports = {
  createUser,
  findUserByEmail,
  getUserById
};