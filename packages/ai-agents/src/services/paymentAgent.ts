import { CdpAgentkit } from "@coinbase/cdp-agentkit-core";
import { CdpTool, CdpToolkit } from "@coinbase/cdp-langchain";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import * as fs from "fs";
import { z } from "zod";
import { NETWORK_ID, WALLET_DATA_FILE, USDC_CONTRACT_ADDRESS } from '../config/constants';
import { PaymentQuotation } from '../types/payment';

const TRANSFER_PROMPT = `
This tool will transfer USDC tokens to a specified wallet address on the Base Sepolia network.
`;

const TransferInput = z
  .object({
    amount: z.number().describe("The amount of USDC to transfer"),
    recipientAddress: z.string().describe("The recipient's wallet address"),
  })
  .strip()
  .describe("Instructions for transferring USDC");

async function transferUSDC(
  toolkit: CdpToolkit,
  quotation: PaymentQuotation
): Promise<string> {
  try {
    // Get the transfer tool from the toolkit
    const tools = toolkit.getTools();
    const transferTool = tools.find(tool => tool.name === 'transfer');
    
    if (!transferTool) {
      throw new Error('Transfer tool not found in toolkit');
    }

    const result = await transferTool.call({
      asset: 'USDC',
      amount: quotation.cryptoAmount.toString(),
      to: quotation.walletAddress,
      contractAddress: USDC_CONTRACT_ADDRESS
    });

    return `Transfer successful. ${result}`;
  } catch (error) {
    console.error('Transfer failed:', error);
    throw new Error('Failed to transfer USDC');
  }
}

export class PaymentAgent {
  private agent: any;
  private agentkit!: CdpAgentkit;
  private toolkit!: CdpToolkit;

  constructor() {
    this.initializeAgentkit().catch(console.error);
  }

  public async initializeAgentkit() {
    let walletDataStr: string | null = null;

    if (fs.existsSync(WALLET_DATA_FILE)) {
      try {
        walletDataStr = fs.readFileSync(WALLET_DATA_FILE, "utf8");
      } catch (error) {
        console.error("Error reading wallet data:", error);
      }
    }

    // Initialize agentkit and await the Promise
    this.agentkit = await CdpAgentkit.configureWithWallet({
      cdpWalletData: walletDataStr || undefined,
      networkId: NETWORK_ID,
    });

    // Create toolkit after agentkit is initialized
    this.toolkit = new CdpToolkit(this.agentkit);
  }

  async initialize() {
    try {
      const llm = new ChatOpenAI({
        model: "gpt-4-turbo-preview",
      });

      const tools = this.toolkit.getTools();

      const transferTool = new CdpTool(
        {
          name: "transfer_usdc",
          description: TRANSFER_PROMPT,
          argsSchema: TransferInput,
          func: (args: z.infer<typeof TransferInput>) => 
            transferUSDC(this.toolkit, {
              cryptoAmount: args.amount,
              walletAddress: args.recipientAddress,
              amountInPaisa: args.amount * 8200,
              cryptoSymbol: 'USDC',
              exchangeRate: 8200
            }),
        },
        this.agentkit,
      );
      tools.push(transferTool);

      const memory = new MemorySaver();

      this.agent = createReactAgent({
        llm,
        tools,
        checkpointSaver: memory,
        messageModifier:
          "You are a payment processing agent that handles USDC transfers on the Base Sepolia network.",
      });

      const exportedWallet = await this.agentkit.exportWallet();
      fs.writeFileSync(WALLET_DATA_FILE, exportedWallet);

    } catch (error) {
      console.error("Failed to initialize payment agent:", error);
      throw error;
    }
  }

  async processPayment(quotation: PaymentQuotation): Promise<string> {
    try {
      return await transferUSDC(this.toolkit, quotation);
    } catch (error) {
      console.error("Payment processing failed:", error);
      throw error;
    }
  }
} 