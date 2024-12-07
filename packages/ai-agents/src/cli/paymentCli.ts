import { ChatOpenAI } from "@langchain/openai";
import { PaymentIntent, PaymentQuotation } from '../types/payment';
import axios from 'axios';
import { BaseMessage, AIMessage } from "@langchain/core/messages";
import { CdpAgentkit } from "@coinbase/cdp-agentkit-core";
import { USDC_CONTRACT_ADDRESS } from '../config/constants';
import { parseUnits } from 'viem';
import { importWallet } from '../lib/coinbase';


const PAYMENT_SERVER_URL = 'http://localhost:4000';
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
      const approvalAmount = parseUnits((amount * 1.5).toString(), 6);
      
      const approveContract = await wallet.invokeContract({
        contractAddress: USDC_CONTRACT_ADDRESS,
        method: "approve",
        args: {
          spender: spenderAddress,
          amount: approvalAmount.toString()
        },
        abi: ERC20_ABI,
      });

      const approveTx = await approveContract.wait();
      if (!approveTx) {
        throw new Error('Failed to approve USDC spend');
      }

      return `Approved ${amount * 1.5} USDC for ${spenderAddress}. Transaction hash: ${approveTx.getTransactionHash()}`;
    } catch (error) {
      console.error('Approval failed:', error);
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

      return `Transferred ${amount} USDC to ${recipientAddress}. Transaction hash: ${transferTx.getTransactionHash()}`;
    } catch (error) {
      console.error('Transfer failed:', error);
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
      console.error('Failed to parse LLM response:', content);
      throw new Error('Invalid response format from LLM');
    }
  }

  private async getSolutionsWithRetry(intentId: string, maxRetries = 50, delaySeconds = 3): Promise<PaymentSolution[]> {
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
        console.log(`No solutions yet, waiting ${delaySeconds} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
      }
    }
    
    throw new Error(`No solutions available after ${maxRetries} attempts`);
  }

  async processPaymentPrompt(prompt: string) {
    try {
      console.log("Processing payment prompt...");
      
      // Step 1: Extract payment details using AI
      const details = await this.extractPaymentDetails(prompt);
      console.log("Extracted payment details:", details);

      // Step 2: Create payment intent
      const intent = {
        paymentToken: USDC_CONTRACT_ADDRESS,
        paymentTokenAmount: details.amount.toString(),
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
      console.log("Intent created:", intentId);

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
      const approvalResult = await this.approveUSDC(
        parseFloat(bestSolution.amountWei) / 1e6, // Convert from Wei to USDC
        bestSolution.solverAddress
      );
      console.log("Approval completed:", approvalResult);

      // Step 5: Transfer USDC to solver
      console.log("Transferring USDC...");
      const transferResult = await this.transferUSDC(
        parseFloat(bestSolution.amountWei) / 1e6,
        bestSolution.solverAddress
      );
      console.log("Transfer completed:", transferResult);

    } catch (error) {
      console.error("Error processing payment prompt:", error);
      throw error;
    }
  }
} 