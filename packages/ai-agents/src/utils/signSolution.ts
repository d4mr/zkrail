import { createWalletClient, http, defineChain, parseAbiParameters, pad } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Define Base Sepolia chain
export const baseSepolia = defineChain({
  id: 84532,
  name: 'Base Sepolia',
  network: 'base-sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia.base.org'] },
    public: { http: ['https://sepolia.base.org'] }
  }
});

// EIP-712 Type Definitions
const DOMAIN = {
  name: 'ZKRail',
  version: '1',
  chainId: baseSepolia.id,
  verifyingContract: '0x887A72ABf9395b0a45Dca391901cCD71243cd1b3' // ZKRailUPI contract address
} as const;

const TYPES = {
  Intent: [
    { name: 'railType', type: 'string' },
    { name: 'recipientAddress', type: 'string' },
    { name: 'railAmount', type: 'uint256' }
  ],
  IntentSolution: [
    { name: 'intentId', type: 'bytes32' },
    { name: 'intent', type: 'Intent' },
    { name: 'paymentToken', type: 'address' },
    { name: 'paymentAmount', type: 'uint256' },
    { name: 'bondToken', type: 'address' }, 
    { name: 'bondAmount', type: 'uint256' },
    { name: 'intentCreator', type: 'address' }
  ]
} as const;

export interface IntentData {
  id: string;
  paymentToken: string;
  paymentTokenAmount: string;
  railType: 'UPI';
  recipientAddress: string;
  railAmount: string;
  creatorAddress: string;
  chainId: number;
}

// Add this interface to define the expected solution type
interface TypedSolution {
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

export async function signMakerSolution({
  intentId,
  intent
}: {
  intentId: string;
  intent: IntentData;
}) {
  // Create wallet client
  const privateKey = process.env.SOLVER_PRIVATE_KEY;
  if (!privateKey) throw new Error('SOLVER_PRIVATE_KEY not found');
  
  const account = privateKeyToAccount(
    privateKey.startsWith('0x') ? privateKey as `0x${string}` : `0x${privateKey}` as `0x${string}`
  );
  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http()
  });

  // Prepare intent solution data with proper 0x prefixes and padding
  const solution: TypedSolution = {
    intentId: pad(
      intentId.startsWith('0x') ? intentId as `0x${string}` : `0x${intentId}` as `0x${string}`,
      { size: 32 }
    ),
    intent: {
      railType: intent.railType,
      recipientAddress: intent.recipientAddress,
      railAmount: BigInt(intent.railAmount)
    },
    paymentToken: intent.paymentToken as `0x${string}`,
    paymentAmount: BigInt(intent.paymentTokenAmount),
    bondToken: intent.paymentToken as `0x${string}`,
    bondAmount: BigInt(intent.paymentTokenAmount) / 10n,
    intentCreator: intent.creatorAddress as `0x${string}`
  };

  // Sign the solution
  const signature = await client.signTypedData({
    domain: DOMAIN,
    types: TYPES,
    primaryType: 'IntentSolution',
    message: solution
  });

  return {
    solution,
    signature
  };
} 