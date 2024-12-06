import { ChatOpenAI } from "@langchain/openai";
import { PaymentIntent, PaymentQuotation } from '../types/payment';
import axios from 'axios';
import { BaseMessage, AIMessage } from "@langchain/core/messages";
import { CdpAgentkit } from "@coinbase/cdp-agentkit-core";
import { USDC_CONTRACT_ADDRESS } from '../config/constants';
import { parseUnits } from 'viem';
import { importWallet } from '../lib/coinbase';


const PAYMENT_SERVER_URL = 'http://localhost:4000';
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
  }
] as const;

interface ExtractedPayment {
  amount: number;
  upiId: string;
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

  async processPaymentPrompt(prompt: string) {
    try {
      console.log("Processing payment prompt...");
      
      // Step 1: Extract payment details using AI
      const details = await this.extractPaymentDetails(prompt);
      console.log("Extracted payment details:", details);

      // Step 2: Get quotation from server
      const intent: PaymentIntent = {
        upiId: details.upiId,
        walletAddress: process.env.RECIPIENT_WALLET_ADDRESS!, // Set this in .env
        amountInPaisa: details.amount
      };

      console.log("Getting quotation...");
      const quotationResponse = await axios.post(
        `${PAYMENT_SERVER_URL}/api/payment/quote`,
        intent
      );
      const quotation: PaymentQuotation = quotationResponse.data;
      console.log("Received quotation:", quotation);

      // Step 3: Approve USDC transfer (150% of amount)
      console.log("Approving USDC transfer...");
      const approvalResult = await this.approveUSDC(
        quotation.cryptoAmount,
        quotation.walletAddress
      );
      console.log("Approval completed:", approvalResult);

    } catch (error) {
      console.error("Error processing payment prompt:", error);
      throw error;
    }
  }
} 