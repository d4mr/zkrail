require('dotenv').config();
const axios = require("axios");
var ipfsHost = '';

function init() {
  ipfsHost = process.env.IPFS_HOST;
}

async function getIPfsTask(cid) {
  try {
    const { data } = await axios.get(ipfsHost + cid);
    return {
      solution: data.solution,
      metadata: data.metadata
    };
  } catch (error) {
    console.error("Error fetching from IPFS:", error);
    throw error;
  }
}

module.exports = {
  init,
  getIPfsTask
};