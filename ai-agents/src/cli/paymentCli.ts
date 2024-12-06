import { ChatOpenAI } from "@langchain/openai";
import { PaymentIntent, PaymentQuotation } from '../types/payment';
import axios from 'axios';
import { BaseMessage, AIMessage } from "@langchain/core/messages";

const PAYMENT_SERVER_URL = 'http://localhost:3000';

interface ExtractedPayment {
  amount: number;
  upiId: string;
}

export class PaymentCli {
  private llm: ChatOpenAI;

  constructor() {
    this.llm = new ChatOpenAI({
      model: "gpt-4-turbo-preview",
    });
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

      // Step 3: Process the payment
      console.log("Processing payment...");
      const paymentResponse = await axios.post(
        `${PAYMENT_SERVER_URL}/api/payment/process`,
        quotation
      );
      console.log("Payment completed:", paymentResponse.data);

    } catch (error) {
      console.error("Error processing payment prompt:", error);
      throw error;
    }
  }
} 