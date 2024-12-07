import { queryOptions } from "@tanstack/react-query";
import { intentAggregatorApi } from "./conts";

export type IntentState =
  | "CREATED"
  | "SOLUTION_COMMITTED"
  | "PAYMENT_CLAIMED"
  | "RESOLVED"
  | "SETTLED";

export type RailType = "UPI" | "BTC"; // Add more rail types as needed

export type PaymentMetadata = {
  transactionId: string;
  timestamp: string;
  railSpecificData: {
    ANY_ADDITIONAL_PROPERTY: null | string;
    [key: string]: unknown;
  };
};

export type Solution = {
  id: string;
  intentId: string;
  solverAddress: string;
  amountWei: string;
  signature: string;
  createdAt: string;
  commitmentTxHash: string;
  settlementTxHash: string;
  resolutionTxHash: string | null;
  paymentMetadata: string; // JSON string of PaymentMetadata
};

export type Intent = {
  id: string;
  paymentToken: string;
  railType: RailType;
  recipientAddress: string;
  railAmount: string;
  creatorAddress: string;
  chainId: number;
  createdAt: string;
  state: IntentState;
  winningSolutionId: string | null;
  resolutionTxHash: string | null;
  winningSolution: Solution | null;
};

export const intentsQueryOptions = queryOptions({
  queryKey: ["intents"],
  queryFn: async () => {
    const res = await intentAggregatorApi
      .get<{ intents: Intent[] }>("intents")
      .json();

    return res.intents;
  },
});
