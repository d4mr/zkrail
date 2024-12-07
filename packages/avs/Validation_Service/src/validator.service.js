require('dotenv').config();
const dalService = require("./dal.service");
const oracleService = require("./oracle.service");

async function validate(proofOfTask) {
  try {
    // Get the submitted solution from IPFS
    const taskResult = await dalService.getIPfsTask(proofOfTask);
    const { solution, metadata } = taskResult;
    
    // Get current solutions for comparison
    const currentSolutions = await oracleService.getCurrentSolutions(metadata.intentId);
    
    // Find minimum amountWei from current solutions
    const minAmount = currentSolutions.reduce((min, sol) => {
      const amount = BigInt(sol.amountWei);
      return !min || amount < min ? amount : min;
    }, null);

    // Validation checks
    const isValid = await runValidationChecks(solution, minAmount, currentSolutions);
    
    console.log('Validation result:', isValid);
    return isValid;
  } catch (err) {
    console.error("Validation error:", err?.message);
    return false;
  }
}

async function runValidationChecks(solution, minAmount, currentSolutions) {
  // Required fields check
  if (!solution.id || !solution.intentId || !solution.solverAddress || 
      !solution.amountWei || !solution.signature || !solution.createdAt) {
    console.log("Missing required fields");
    return false;
  }

  // Amount check
  const solutionAmount = BigInt(solution.amountWei);
  if (solutionAmount !== minAmount) {
    console.log("Not the cheapest solution");
    return false;
  }

  // Solution exists check
  const solutionExists = currentSolutions.some(s => s.id === solution.id);
  if (!solutionExists) {
    console.log("Solution not found in current solutions");
    return false;
  }


  const timestamp = new Date(solution.createdAt).getTime();
  const now = Date.now();
  if (timestamp > now || timestamp < now - 24 * 60 * 60 * 1000) {
    console.log("Invalid timestamp");
    return false;
  }

  try {
    const metadata = JSON.parse(solution.paymentMetadata);
    if (!metadata.UPI || !metadata.timestamp || !metadata.railSpecificData) {
      console.log("Invalid payment metadata");
      return false;
    }
  } catch (err) {
    console.log("Could not parse payment metadata");
    return false;
  }

  return true;
}

module.exports = {
  validate,
};