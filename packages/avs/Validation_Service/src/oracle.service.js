require('dotenv').config();
const axios = require("axios");

async function getCurrentSolutions(intentId) {
  try {
    const result = await axios.get(`https://zkrail-intent-aggregator.d4mr.workers.dev/api/intents/${intentId}/solutions`);
    if (!result.data || !result.data.solutions) {
      throw new Error("Invalid response format");
    }
    return result.data.solutions;
  } catch (err) {
    console.error("Error fetching current solutions:", err);
    throw err;
  }
}

module.exports = {
  getCurrentSolutions,
};