// Types for payment metadata
export type PaymentMetadata = {
  transactionId: string;
  timestamp: string; // ISO string
  railSpecificData?: Record<string, any>; // Flexible storage for rail-specific proof
};

// Helper functions
export function parsePaymentMetadata(json: string): PaymentMetadata {
  const data = JSON.parse(json);
  if (!data.transactionId || !data.timestamp) {
    throw new Error("Invalid payment metadata format");
  }
  return data as PaymentMetadata;
}

export function formatPaymentMetadata(metadata: PaymentMetadata): string {
  return JSON.stringify(metadata);
}

export function validateWeiAmount(amount: string): boolean {
  try {
    if (amount.includes(".") || amount.includes("-")) return false;
    BigInt(amount);
    return true;
  } catch {
    return false;
  }
}
