require('dotenv').config();
const axios = require("axios");

async function getBestSolution(intentId) {
  var res = null;
  try {
    const result = await axios.get(`https://zkrail-intent-aggregator.d4mr.workers.dev/api/intents/${intentId}/solutions`);
    if (result.data && result.data.solutions && Array.isArray(result.data.solutions)) {
      // Find solution with lowest amountWei
      res = result.data.solutions.reduce((lowest, current) => {
        if (!lowest || BigInt(current.amountWei) < BigInt(lowest.amountWei)) {
          return current;
        }
        return lowest;
      }, null);
    }
  } catch (err) {
    console.error("zkrail intent aggregator api:", err);
  }
  return res;
}

module.exports = {
  getBestSolution,
};