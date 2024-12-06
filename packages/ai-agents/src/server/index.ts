import express from 'express';
import cors from 'cors';
import { PaymentIntent, PaymentQuotation } from '../types/payment';

const app = express();
app.use(cors());
app.use(express.json());

// Mock exchange rate: 1 USDC = ₹82 (8200 paisa)
const EXCHANGE_RATE = 8200;

app.post('/api/payment/quote', (req, res) => {
  try {
    console.log('Received payment intent:', req.body);
    const intent: PaymentIntent = req.body;

    // Validate input
    if (!intent.upiId || !intent.walletAddress || intent.amountInPaisa === undefined) {
      console.log('Missing fields:', {
        upiId: !!intent.upiId,
        walletAddress: !!intent.walletAddress,
        amountInPaisa: intent.amountInPaisa
      });
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: {
          required: ['upiId', 'walletAddress', 'amountInPaisa'],
          received: intent
        }
      });
    }

    if (intent.amountInPaisa < 100) { // Minimum 1 rupee
      return res.status(400).json({ error: 'Amount too small' });
    }

    // Calculate USDC amount
    const cryptoAmount = intent.amountInPaisa / EXCHANGE_RATE;
    
    const quotation: PaymentQuotation = {
      amountInPaisa: intent.amountInPaisa,
      cryptoAmount: parseFloat(cryptoAmount.toFixed(6)),
      cryptoSymbol: 'USDC',
      exchangeRate: EXCHANGE_RATE,
      walletAddress: intent.walletAddress
    };

    console.log('Generated quotation:', quotation);
    res.json(quotation);
  } catch (error) {
    console.error('Error generating quotation:', error);
    res.status(500).json({ 
      error: 'Failed to generate quotation',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.get('/api/payment/status/:txHash', (req, res) => {
  const { txHash } = req.params;
  res.json({
    status: 'confirmed',
    transactionHash: txHash
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Payment server running on port ${PORT}`);
  console.log(`Mock exchange rate: 1 USDC = ₹${EXCHANGE_RATE/100}`);
}); 