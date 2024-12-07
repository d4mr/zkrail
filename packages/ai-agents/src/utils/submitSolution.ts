import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  parseAbi,
  pad,
  keccak256,
  toBytes
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from './signSolution';

// ABI for relevant functions
const abi = [
  {
    name: 'commitToSolution',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'solution',
        type: 'tuple',
        components: [
          { name: 'intentId', type: 'bytes32' },
          {
            name: 'intent',
            type: 'tuple',
            components: [
              { name: 'railType', type: 'string' },
              { name: 'recipientAddress', type: 'string' },
              { name: 'railAmount', type: 'uint256' }
            ]
          },
          { name: 'paymentToken', type: 'address' },
          { name: 'paymentAmount', type: 'uint256' },
          { name: 'bondToken', type: 'address' },
          { name: 'bondAmount', type: 'uint256' },
          { name: 'intentCreator', type: 'address' }
        ]
      },
      { name: 'signature', type: 'bytes' }
    ],
    outputs: []
  },
  {
    name: 'calculateTotalAmount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'paymentAmount', type: 'uint256' }],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }]
  }
] as const;

// Helper to convert string intent ID to bytes32
function intentIdToBytes32(intentId: string): `0x${string}` {
  if (intentId.startsWith('0x')) {
    return pad(intentId as `0x${string}`, { size: 32 });
  }
  return keccak256(toBytes(intentId));
}

export interface Solution {
  intentId: `0x${string}`;
  intent: {
    railType: string;
    recipientAddress: string;
    railAmount: bigint;
  };
  paymentToken: `0x${string}`;
  paymentAmount: bigint;
  bondToken: `0x${string}`;
  bondAmount: bigint;
  intentCreator: `0x${string}`;
}

export async function submitSolutionOnChain({
  solution,
  signature,
  zkrailAddress,
  takerPrivateKey
}: {
  solution: Solution;
  signature: `0x${string}`;
  zkrailAddress: `0x${string}`;
  takerPrivateKey: string;
}) {
  // Format private key
  const formattedPrivateKey = takerPrivateKey.startsWith('0x') 
    ? takerPrivateKey as `0x${string}` 
    : `0x${takerPrivateKey}` as `0x${string}`;

  const account = privateKeyToAccount(formattedPrivateKey);
  
  // Create clients
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http()
  });
  
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http()
  });

  // Calculate total amount needed (payment + collateral)
  const totalAmount = await publicClient.readContract({
    address: zkrailAddress,
    abi,
    functionName: 'calculateTotalAmount',
    args: [solution.paymentAmount]
  });

  console.log(`Need to approve ${totalAmount} tokens for payment + collateral`);

  // Approve payment token (including collateral)
  const approveTx = await walletClient.writeContract({
    address: solution.paymentToken,
    abi,
    functionName: 'approve',
    args: [zkrailAddress, totalAmount]
  });

  await publicClient.waitForTransactionReceipt({ hash: approveTx });
  console.log('Payment token approved');

  // Format solution for contract call
  const formattedSolution = {
    intentId: intentIdToBytes32(solution.intentId),
    intent: {
      railType: solution.intent.railType,
      recipientAddress: solution.intent.recipientAddress,
      railAmount: solution.intent.railAmount
    },
    paymentToken: solution.paymentToken,
    paymentAmount: solution.paymentAmount,
    bondToken: solution.bondToken,
    bondAmount: solution.bondAmount,
    intentCreator: solution.intentCreator
  };

  // Submit solution
  const tx = await walletClient.writeContract({
    address: zkrailAddress,
    abi,
    functionName: 'commitToSolution',
    args: [formattedSolution, signature]
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log('Solution committed on chain:', receipt.transactionHash);

  return receipt;
} 