export interface PaymentIntent {
  upiId: string;
  walletAddress: string;
  amountInPaisa: number;
}

export interface PaymentQuotation {
  amountInPaisa: number;
  cryptoAmount: number;
  cryptoSymbol: string;
  exchangeRate: number;
  walletAddress: string;
} 