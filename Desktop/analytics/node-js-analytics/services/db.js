// File: services/db.js
// --- START OF FILE services/db.js ---

// Requires the initialized pool from clients.js
const { getDBPool } = require('../Config/clients'); // Adjust path as needed

/**
 * Executes a SQL query using the connection pool.
 * Handles client acquisition and release. Logs errors.
 * @param {string} query - The SQL query string (use $1, $2 for parameters).
 * @param {Array<any>} [params=[]] - Optional array of parameters for the query.
 * @returns {Promise<Array<object>>} A promise resolving to an array of result rows.
 * @throws {Error} Throws an error if the query fails or the pool is unavailable.
 */
const executeQueryUsingPool = async (query, params = []) => {
  const pool = await getDBPool(); // Get the initialized pool from clients.js
  // Check if the pool was successfully initialized
  if (!pool) {
      console.error("❌ Cannot execute DB query: Database pool is not available/initialized.");
      throw new Error("Database pool not available");
  }

  let client;
  try {
    client = await pool.connect(); // Get a client from the pool
    const res = await client.query(query, params);
    return res.rows; // Return the results
  } catch (err) {
    // Log detailed error information
    console.error("❌ Database Query Error:", err.message);
    console.error("   Query:", query);
    if (params.length > 0) console.error("   Params:", params);
    // Add specific hints for common connection errors
     if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'EHOSTUNREACH') {
        console.error("   Hint: Check DB connection string, firewall, and server status.");
     } else if (err.code === '23505') { // Example: Unique constraint violation
         console.error("   Hint: This might be a unique constraint violation.");
     }
     
    throw err; // Re-throw the error to be handled by the caller
  } finally {
    // Ensure the client is always released back to the pool
    if (client) {
      client.release();
    }
  }
};

module.exports = {
    executeQueryUsingPool,
};

// --- END OF FILE services/db.js ---