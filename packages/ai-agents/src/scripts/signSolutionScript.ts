import { signMakerSolution, IntentData } from '../utils/signSolution';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  // Example intent data
  const intentData: IntentData = {
    id: 'bud1tsrs0conbz9aq6yry91t',
    paymentToken: '0x215D8DC520791a5fECa4D302798D8C47aD7E0588', // USDC on Base Sepolia
    paymentTokenAmount: '10000',
    railType: 'UPI',
    recipientAddress: 'user@upi',
    railAmount: '10000',
    creatorAddress: '0xfcAe752B10e1952Ca2AcdB8AacafbfA4188b85ec',
    chainId: 84532
  };

  // Make sure to set SOLVER_PRIVATE_KEY in your .env file
  const privateKey = process.env.SOLVER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('SOLVER_PRIVATE_KEY not found in environment variables');
  }

  try {
    const result = await signMakerSolution({
      intentId: intentData.id,
      intent: intentData,
      privateKey
    });

    console.log('Solution:', result.solution);
    console.log('Signature:', result.signature);

    // Submit solution to aggregator
    const response = await fetch(`https://zkrail-intent-aggregator.d4mr.workers.dev/api/intents/${intentData.id}/solutions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        solverAddress: result.solution.intentCreator,
        amountWei: result.solution.paymentAmount.toString(),
        signature: result.signature
      })
    });

    const responseData = await response.json();
    console.log('Response:', responseData);

  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error); 