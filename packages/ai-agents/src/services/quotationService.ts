import { PaymentIntent, PaymentQuotation } from '../types/payment';

export class QuotationService {
  // Mock exchange rate: 1 USDC = ₹82 (8200 paisa)
  private static EXCHANGE_RATE = 8200;

  static getQuotation(intent: PaymentIntent): PaymentQuotation {
    const cryptoAmount = intent.amountInPaisa / this.EXCHANGE_RATE;
    
    return {
      amountInPaisa: intent.amountInPaisa,
      cryptoAmount: parseFloat(cryptoAmount.toFixed(6)),
      cryptoSymbol: 'USDC',
      exchangeRate: this.EXCHANGE_RATE,
      walletAddress: intent.walletAddress
    };
  }
} 