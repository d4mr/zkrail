import { ChatOpenAI } from "@langchain/openai";
import { PaymentIntent, PaymentQuotation } from '../types/payment';
import axios from 'axios';
import { BaseMessage, AIMessage } from "@langchain/core/messages";
import { CdpAgentkit } from "@coinbase/cdp-agentkit-core";
import { USDC_CONTRACT_ADDRESS, ZKRAIL_UPI_ADDRESS } from '../config/constants';
import { parseUnits } from 'viem';
import { importWallet } from '../lib/coinbase';
import { ethers } from 'ethers';
import { keccak256, toBytes } from 'viem';

// ASCII Art for CLI
console.log(`
  $$$$$$$$\ $$\   $$\       $$$$$$$\   $$$$$$\  $$$$$$\ $$\       $$$$$$\  
  \____$$  |$$ | $$  |      $$  __$$\ $$  __$$\ \_$$  _|$$ |     $$  __$$\ 
      $$  / $$ |$$  /       $$ |  $$ |$$ /  $$ |  $$ |  $$ |     $$ /  \__|
     $$  /  $$$$$  /        $$$$$$$  |$$$$$$$$ |  $$ |  $$ |     \$$$$$$\  
    $$  /   $$  $$<         $$  __$$< $$  __$$ |  $$ |  $$ |      \____$$\ 
   $$  /    $$ |\$$\        $$ |  $$ |$$ |  $$ |  $$ |  $$ |     $$\   $$ |
  $$$$$$$$\ $$ | \$$\       $$ |  $$ |$$ |  $$ |$$$$$$\ $$$$$$$$\\$$$$$$  |
  \________|\__|  \__|      \__|  \__|\__|  \__|\______|\________|\______/                                                                        
                                                                           
                                                                           
  `);

  console.log(`AI Agent ready for payments powered by the CDP AgentKit 🤖
    
    `)

const INTENT_AGGREGATOR_URL = 'https://zkrail-intent-aggregator.d4mr.workers.dev';

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }]
  }
] as const;

const ZKRAIL_ABI = [{"inputs":[],"name":"AlreadyCommitted","type":"error"},{"inputs":[],"name":"AlreadySettled","type":"error"},{"inputs":[],"name":"ECDSAInvalidSignature","type":"error"},{"inputs":[{"internalType":"uint256","name":"length","type":"uint256"}],"name":"ECDSAInvalidSignatureLength","type":"error"},{"inputs":[{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"ECDSAInvalidSignatureS","type":"error"},{"inputs":[],"name":"IntentNotFound","type":"error"},{"inputs":[],"name":"InvalidProof","type":"error"},{"inputs":[],"name":"InvalidShortString","type":"error"},{"inputs":[],"name":"InvalidSignature","type":"error"},{"inputs":[{"internalType":"uint256","name":"currentTime","type":"uint256"},{"internalType":"uint256","name":"requiredTime","type":"uint256"}],"name":"InvalidTimeWindow","type":"error"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"SafeERC20FailedOperation","type":"error"},{"inputs":[{"internalType":"string","name":"str","type":"string"}],"name":"StringTooLong","type":"error"},{"inputs":[{"internalType":"address","name":"caller","type":"address"},{"internalType":"address","name":"required","type":"address"}],"name":"UnauthorizedCaller","type":"error"},{"anonymous":false,"inputs":[],"name":"EIP712DomainChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"intentId","type":"bytes32"},{"indexed":true,"internalType":"address","name":"triggeredBy","type":"address"}],"name":"EmergencyTimeoutTriggered","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"intentId","type":"bytes32"},{"indexed":true,"internalType":"address","name":"maker","type":"address"},{"indexed":true,"internalType":"address","name":"taker","type":"address"},{"indexed":false,"internalType":"string","name":"railType","type":"string"},{"indexed":false,"internalType":"string","name":"recipientAddress","type":"string"},{"indexed":false,"internalType":"uint256","name":"railAmount","type":"uint256"},{"indexed":false,"internalType":"address","name":"paymentToken","type":"address"},{"indexed":false,"internalType":"uint256","name":"paymentAmount","type":"uint256"},{"indexed":false,"internalType":"address","name":"bondToken","type":"address"},{"indexed":false,"internalType":"uint256","name":"bondAmount","type":"uint256"}],"name":"IntentSolutionCommitted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"intentId","type":"bytes32"},{"indexed":true,"internalType":"address","name":"maker","type":"address"}],"name":"PaymentProofSubmitted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"intentId","type":"bytes32"},{"indexed":true,"internalType":"address","name":"taker","type":"address"}],"name":"SolutionSettled","type":"event"},{"inputs":[],"name":"DOMAIN_SEPARATOR","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"INTENT_SOLUTION_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"paymentAmount","type":"uint256"}],"name":"calculateTotalAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"intentId","type":"bytes32"}],"name":"canSubmitProof","outputs":[{"internalType":"bool","name":"canProve","type":"bool"},{"internalType":"uint8","name":"reasonCode","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"intentId","type":"bytes32"}],"name":"canTimeout","outputs":[{"internalType":"bool","name":"canTimeout","type":"bool"},{"internalType":"uint256","name":"remainingTime","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"bytes32","name":"intentId","type":"bytes32"},{"internalType":"string","name":"railType","type":"string"},{"internalType":"string","name":"recipientAddress","type":"string"},{"internalType":"uint256","name":"railAmount","type":"uint256"},{"internalType":"address","name":"paymentToken","type":"address"},{"internalType":"uint256","name":"paymentAmount","type":"uint256"},{"internalType":"address","name":"bondToken","type":"address"},{"internalType":"uint256","name":"bondAmount","type":"uint256"},{"internalType":"address","name":"intentCreator","type":"address"}],"internalType":"struct IZKRail.IntentSolution","name":"solution","type":"tuple"},{"internalType":"bytes","name":"signature","type":"bytes"}],"name":"commitToSolution","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"eip712Domain","outputs":[{"internalType":"bytes1","name":"fields","type":"bytes1"},{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"version","type":"string"},{"internalType":"uint256","name":"chainId","type":"uint256"},{"internalType":"address","name":"verifyingContract","type":"address"},{"internalType":"bytes32","name":"salt","type":"bytes32"},{"internalType":"uint256[]","name":"extensions","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"intentId","type":"bytes32"}],"name":"getIntentState","outputs":[{"components":[{"internalType":"bytes32","name":"intentId","type":"bytes32"},{"internalType":"string","name":"railType","type":"string"},{"internalType":"string","name":"recipientAddress","type":"string"},{"internalType":"uint256","name":"railAmount","type":"uint256"},{"internalType":"address","name":"paymentToken","type":"address"},{"internalType":"uint256","name":"paymentAmount","type":"uint256"},{"internalType":"address","name":"bondToken","type":"address"},{"internalType":"uint256","name":"bondAmount","type":"uint256"},{"internalType":"address","name":"intentCreator","type":"address"}],"internalType":"struct IZKRail.IntentSolution","name":"solution","type":"tuple"},{"internalType":"bool","name":"isSettled","type":"bool"},{"internalType":"uint256","name":"commitTime","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"intentId","type":"bytes32"}],"name":"resolveByTimeout","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"intentId","type":"bytes32"},{"internalType":"bytes","name":"proof","type":"bytes"}],"name":"resolveWithProof","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"intentId","type":"bytes32"}],"name":"settle","outputs":[],"stateMutability":"nonpayable","type":"function"}] as const;

interface ExtractedPayment {
  amount: number;
  upiId: string;
}

interface PaymentSolution {
  id: string;
  intentId: string;
  solverAddress: string;
  amountWei: string;
  signature: string;
  createdAt: string;
  commitmentTxHash?: string;
  paymentMetadata?: any;
}

interface IntentResponse {
  intentId: string;
}

interface IntentState {
  id: string;
  state: 'CREATED' | 'SOLUTION_SELECTED' | 'PAYMENT_CLAIMED';
}

export class PaymentCli {
  private llm: ChatOpenAI;
  private agentkit!: CdpAgentkit;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: "gpt-4-turbo-preview",
      temperature: 0,
      maxTokens: 2000
    });
    this.initializeAgentkit();
  }

  private async initializeAgentkit() {
    this.agentkit = await CdpAgentkit.configureWithWallet({
      networkId: process.env.NETWORK_ID || 'base-sepolia'
    });
  }

  private async approveUSDC(amount: number, spenderAddress: string): Promise<string> {
    try {
      const wallet = await importWallet();
      const approvalAmount = parseUnits((amount * 3.5).toString(), 6);
      
      const approveContract = await wallet.invokeContract({
        contractAddress: USDC_CONTRACT_ADDRESS,
        method: "approve",
        args: {
          spender: ZKRAIL_UPI_ADDRESS,
          amount: approvalAmount.toString()
        },
        abi: ERC20_ABI,
      });

      const approveTx = await approveContract.wait();
      if (!approveTx) {
        throw new Error('Failed to approve USDC spend');
      }

      return `Successfully approved ${amount * 3.5} USDC for ${USDC_CONTRACT_ADDRESS}. Transaction hash: ${approveTx.getTransactionHash()}`;
    } catch (error) {
      console.error('Error during approval:', error);
      throw new Error('Failed to approve USDC transfer');
    }
  }

  private async transferUSDC(amount: number, recipientAddress: string): Promise<string> {
    try {
      const wallet = await importWallet();
      const transferAmount = parseUnits(amount.toString(), 6);
      
      const transferContract = await wallet.invokeContract({
        contractAddress: USDC_CONTRACT_ADDRESS,
        method: "transfer",
        args: {
          recipient: recipientAddress,
          amount: transferAmount.toString()
        },
        abi: ERC20_ABI,
      });

      const transferTx = await transferContract.wait();
      if (!transferTx) {
        throw new Error('Failed to transfer USDC');
      }

      return `Successfully transferred ${amount} USDC to ${recipientAddress}. Transaction hash: ${transferTx.getTransactionHash()}`;
    } catch (error) {
      console.error('Error during transfer:', error);
      throw new Error('Failed to transfer USDC');
    }
  }

  private async extractPaymentDetails(prompt: string): Promise<ExtractedPayment> {
    const systemPrompt = `Extract the payment amount in rupees and UPI ID from the user's message. 
    Return only a JSON object with 'amount' (in rupees) and 'upiId'.
    Example: {"amount": 100, "upiId": "user@upi"}`;

    const response = await this.llm.invoke([
      ["system", systemPrompt],
      ["user", prompt]
    ]);

    // Handle the response content properly
    let content = '';
    if (response instanceof AIMessage) {
      content = response.content as string;
    } else if (typeof response.content === 'string') {
      content = response.content;
    } else {
      throw new Error('Unexpected response format from LLM');
    }

    try {
      const result = JSON.parse(content);
      return {
        amount: result.amount * 100, // Convert rupees to paisa
        upiId: result.upiId
      };
    } catch (error) {
      console.error('Failed to parse the response:', content);
      throw new Error('Invalid response format from LLM');
    }
  }

  private async getSolutionsWithRetry(intentId: string, maxRetries = 150, delaySeconds = 3): Promise<PaymentSolution[]> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`Fetching solutions (attempt ${attempt}/${maxRetries})...`);
      
      const solutionsResponse = await axios.get<{ solutions: PaymentSolution[] }>(
        `${INTENT_AGGREGATOR_URL}/api/intents/${intentId}/solutions`
      );
      const solutions = solutionsResponse.data.solutions;
      
      if (solutions.length > 0) {
        return solutions;
      }
      
      if (attempt < maxRetries) {
        console.log(`No solutions found yet, waiting ${delaySeconds} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
      }
    }
    
    throw new Error(`Could not find solutions after ${maxRetries} attempts`);
  }

  private async pollIntentState(intentId: string, targetState: string, maxAttempts = 100): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await axios.get<IntentState>(
        `${INTENT_AGGREGATOR_URL}/api/intents/${intentId}`
      );
      
      if (response.data.state === targetState) {
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds between polls
    }
    throw new Error(`Intent did not reach ${targetState} state after ${maxAttempts} attempts`);
  }

  private async commitToSolution(solution: PaymentSolution, intentDetails: any): Promise<string> {
    const wallet = await importWallet();
    
    // Hash the intentId to get a valid bytes32
    const hashedIntentId = keccak256(toBytes(solution.intentId));
    
    // First get the total amount needed from contract
    const provider = new ethers.JsonRpcProvider("https://base-sepolia.g.alchemy.com/v2/t2e7jYYxPdWNUSNSmiLKfQ33eGTfGAJn");
    const zkrailContract = new ethers.Contract(ZKRAIL_UPI_ADDRESS, ZKRAIL_ABI, provider);
    const totalAmount = await zkrailContract.calculateTotalAmount(solution.amountWei);
    
    // Get wallet address first
    const walletAddress = await wallet.getAddress("primary");

    // Convert BigInt to string to avoid serialization issues
    const totalAmountString = totalAmount.toString();

    console.log("Debug info:", {
      intentId: solution.intentId,
      hashedIntentId,
      solutionAmount: solution.amountWei,
      totalAmount: totalAmountString,
      signature: solution.signature
    });

    const commitContract = await wallet.invokeContract({
      contractAddress: ZKRAIL_UPI_ADDRESS,
      method: "commitToSolution",
      args: {
        solution: [
          hashedIntentId,                                 // bytes32 intentId
          "UPI",                                         // string railType
          intentDetails.recipientAddress,                 // string recipientAddress
          intentDetails.railAmount.toString(),            // uint256 railAmount
          USDC_CONTRACT_ADDRESS,                         // address paymentToken
          solution.amountWei.toString(),                 // uint256 paymentAmount
          USDC_CONTRACT_ADDRESS,                         // address bondToken
          parseUnits("500", 6).toString(),               // uint256 bondAmount
          "0xF51aa3a200F1D38aFDF60E948F05e70140b33569"                                  // address intentCreator
        ],
        signature: solution.signature
      },
      abi: ZKRAIL_ABI,
    });

    const tx = await commitContract.wait();
    if (!tx) {
      throw new Error('Failed to commit to solution');
    }

    const txHash = tx.getTransactionHash();
    if (!txHash) {
      throw new Error('No transaction hash returned');
    }

    return txHash;
  }

  private async settleSolution(intentId: string): Promise<string> {
    const wallet = await importWallet();

    function intentIdToBytes32(intentId: string): `0x${string}` {
      // If already hex
      if (intentId.startsWith('0x')) {
        return intentId as `0x${string}`;
      }
      // If base58/UUID style, hash it
      const hashedId = keccak256(toBytes(intentId)) as `0x${string}`;
      // Pad with leading zeros to ensure it's 32 bytes
      return `0x${hashedId.slice(2).padStart(64, '0')}`;
    }

    intentId = intentIdToBytes32(intentId);
    
    const settleContract = await wallet.invokeContract({
      contractAddress: ZKRAIL_UPI_ADDRESS,
      method: "settle",
      args: { intentId },
      abi: ZKRAIL_ABI,
    });

    const tx = await settleContract.wait();
    if (!tx) {
      throw new Error('Failed to settle solution');
    }

    const txHash = tx.getTransactionHash();
    if (!txHash) {
      throw new Error('No transaction hash returned');
    }

    return txHash;
  }

  async processPaymentPrompt(prompt: string) {
    try {
      console.log("Processing the payment prompt...");
      
      // Step 1: Extract payment details
      const details = await this.extractPaymentDetails(prompt);
      console.log("Extracted payment details:", details);

      // Step 2: Create payment intent
      const intent = {
        paymentToken: USDC_CONTRACT_ADDRESS,
        railType: "UPI",
        recipientAddress: details.upiId,
        railAmount: details.amount.toString(),
        creatorAddress: process.env.SENDER_WALLET_ADDRESS!, // Updated to use sender address from coinbase.ts
        chainId: 84532 // Base Sepolia chain ID
      };

      console.log("Creating intent...");
      const intentResponse = await axios.post<IntentResponse>(
        `${INTENT_AGGREGATOR_URL}/api/intents`,
        intent
      );
      const { intentId } = intentResponse.data;
      console.log("Created intent:", intentId);

      // Step 3: Get solutions (quotations) with retry
      console.log("Fetching solutions...");
      const solutions = await this.getSolutionsWithRetry(intentId);
      console.log("Received solutions:", solutions);

      if (solutions.length === 0) {
        throw new Error('No solutions available for this payment');
      }

      // Select best solution (lowest amount)
      const bestSolution = solutions.reduce((prev, current) => 
        BigInt(prev.amountWei) < BigInt(current.amountWei) ? prev : current
      );

      // Step 4: Approve USDC transfer (150% of amount)
      console.log("Approving USDC transfer...");
      const provider = new ethers.JsonRpcProvider("https://base-sepolia.g.alchemy.com/v2/t2e7jYYxPdWNUSNSmiLKfQ33eGTfGAJn");
      const zkrailContract = new ethers.Contract(ZKRAIL_UPI_ADDRESS, ZKRAIL_ABI, provider);
      const totalAmount = await zkrailContract.calculateTotalAmount(bestSolution.amountWei);
      const approvalResult = await this.approveUSDC(
        parseFloat(totalAmount.toString()) / 1e6, // Use the total amount from contract
        ZKRAIL_UPI_ADDRESS  // Approve the ZKRail contract to spend
      );
      console.log("Completed the approval:", approvalResult);

      // Step 5: Transfer USDC to solver
      // console.log("Transferring USDC...");
      // const transferResult = await this.transferUSDC(
      //   parseFloat(bestSolution.amountWei) / 1e6,
      //   bestSolution.solverAddress
      // );
      // console.log("Completed the transfer:", transferResult);
      console.log({bestSolution})

      // Step 4: Commit to solution
      console.log("Committing to solution...");
      const commitTxHash = await this.commitToSolution(bestSolution, intent);
      console.log("Committed to solution:", commitTxHash);

      // Step 5: Accept the solution
      console.log("Accepting solution...");
      await axios.post(
        `${INTENT_AGGREGATOR_URL}/api/solutions/${bestSolution.id}/accept`,
        { commitmentTxHash: commitTxHash }
      );
      console.log("Accepted the solution");

      // Step 6: Wait for payment to be claimed
      console.log("Waiting for payment to be claimed...");
      await this.pollIntentState(bestSolution.intentId, 'PAYMENT_CLAIMED');
      
      // Step 7: Settle the solution
      console.log("Settling solution...");
      const settleTxHash = await this.settleSolution(bestSolution.intentId);
      console.log("Settled the solution:", settleTxHash);

      // Step 8: Notify API about settlement
      try {
        await axios.post(
          `${INTENT_AGGREGATOR_URL}/api/solutions/${bestSolution.id}/settle`,
          {
            settlementTxHash: settleTxHash
          },
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        console.log("Recorded the settlement with API");
      } catch (error) {
        console.error("Failed to record settlement with API:", error);
        // Don't throw here as the on-chain settlement was successful
      }

    } catch (error) {
      console.error("Encountered an error processing payment prompt:", error);
      throw error;
    }
  }
}
