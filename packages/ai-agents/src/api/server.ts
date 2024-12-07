import 'dotenv/config';
import express from 'express';
import { PaymentAgent } from '../services/paymentAgent';
import { QuotationService } from '../services/quotationService';
import { PaymentIntent } from '../types/payment';
import { MIN_TRANSFER_AMOUNT } from '../config/constants';

const app = express();
app.use(express.json());

const paymentAgent = new PaymentAgent();

// Initialize the payment agent when the server starts
async function startServer() {
  try {
    await paymentAgent.initializeAgentkit(); // Wait for agentkit to initialize
    await paymentAgent.initialize(); // Then initialize the agent

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

app.post('/api/payment/quote', (req, res) => {
  try {
    const intent: PaymentIntent = req.body;

    // Validate input
    if (!intent.upiId || !intent.walletAddress || !intent.amountInPaisa) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (intent.amountInPaisa < MIN_TRANSFER_AMOUNT) {
      return res.status(400).json({ error: 'Amount too small' });
    }

    const quotation = QuotationService.getQuotation(intent);
    res.json(quotation);
  } catch (error) {
    console.error('Error generating quotation:', error);
    res.status(500).json({ error: 'Failed to generate quotation' });
  }
});

app.post('/api/payment/process', async (req, res) => {
  try {
    const quotation = req.body;
    const result = await paymentAgent.processPayment(quotation);
    res.json({ success: true, transaction: result });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Payment processing failed' });
  }
}); 