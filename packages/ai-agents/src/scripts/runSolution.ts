import { signMakerSolution } from '../utils/signSolution';
import { submitSolutionOnChain } from '../utils/submitSolution';
import { keccak256, toBytes } from 'viem';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  try {
    // Step 1: Sign the solution as the maker
    const intentId = 'bud1tsrs0conbz9aq6yry91t';
    // Hash the intentId to get a valid bytes32
    const hashedIntentId = keccak256(toBytes(intentId));

    const intentData = {
      id: hashedIntentId,
      paymentToken: '0x215D8DC520791a5fECa4D302798D8C47aD7E0588', // USDC on Base Sepolia
      paymentTokenAmount: '10000',
      railType: 'UPI' as const,
      recipientAddress: 'user@upi',
      railAmount: '10000',
      creatorAddress: '0xfcAe752B10e1952Ca2AcdB8AacafbfA4188b85ec',
      chainId: 84532
    };

    console.log('Signing solution...');
    const signedSolution = await signMakerSolution({
      intentId: hashedIntentId,
      intent: intentData
    });
    console.log('Solution signed:', signedSolution);

    // Step 2: Submit the signed solution on-chain
    console.log('Submitting solution on-chain...');
    const privateKey = process.env.SOLVER_PRIVATE_KEY;
    if (!privateKey) throw new Error('SOLVER_PRIVATE_KEY not found in environment variables');

    const receipt = await submitSolutionOnChain({
      solution: signedSolution.solution,
      signature: signedSolution.signature,
      zkrailAddress: '0x887A72ABf9395b0a45Dca391901cCD71243cd1b3',
      takerPrivateKey: privateKey
    });

    console.log('Transaction completed:', receipt);
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error); 