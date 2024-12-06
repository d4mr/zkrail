import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

// Enums & Constants
export const PaymentRailType = {
  UPI: "UPI",
  BITCOIN: "BITCOIN",
} as const;

export type PaymentRailType =
  (typeof PaymentRailType)[keyof typeof PaymentRailType];

export const RAIL_CURRENCY = {
  [PaymentRailType.UPI]: "INR",
  [PaymentRailType.BITCOIN]: "BTC",
} as const;

export const RAIL_SMALLEST_UNIT = {
  [PaymentRailType.UPI]: "paise",
  [PaymentRailType.BITCOIN]: "sats",
} as const;

export const IntentState = {
  CREATED: "CREATED",
  SOLUTION_COMMITTED: "SOLUTION_COMMITTED",
  PAYMENT_CLAIMED: "PAYMENT_CLAIMED",
  RESOLVED: "RESOLVED",
} as const;

export type IntentStateType = (typeof IntentState)[keyof typeof IntentState];

// Tables
export const intents = sqliteTable(
  "intents",
  {
    id: text("id").primaryKey(),
    paymentToken: text("payment_token").notNull(),
    paymentTokenAmount: text("payment_token_amount").notNull(),

    railType: text("rail_type").notNull().$type<PaymentRailType>(),
    recipientAddress: text("recipient_address").notNull(),
    railAmount: text("rail_amount").notNull(),

    creatorAddress: text("creator_address").notNull(),
    chainId: integer("chain_id").notNull(),

    // Using SQLite's built-in timestamp
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    state: text("state")
      .notNull()
      .$type<IntentStateType>()
      .default(IntentState.CREATED),
    winningSolutionId: text("winning_solution_id"),
    resolutionTxHash: text("resolution_tx_hash"),
  },
  (table) => ({
    creatorIdx: index("creator_idx").on(table.creatorAddress),
    stateIdx: index("state_idx").on(table.state),
    railIdx: index("rail_idx").on(table.railType),
  })
);

export const solutions = sqliteTable(
  "solutions",
  {
    id: text("id").primaryKey(),
    intentId: text("intent_id")
      .notNull()
      .references(() => intents.id),

    solverAddress: text("solver_address").notNull(),
    amountWei: text("amount_wei").notNull(),
    signature: text("signature").notNull(),

    // Using SQLite's built-in timestamp here too
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    commitmentTxHash: text("commitment_tx_hash"),
    paymentMetadata: text("payment_metadata"),
  },
  (table) => ({
    intentIdx: index("intent_solutions_idx").on(table.intentId),
    solverIdx: index("solver_idx").on(table.solverAddress),
  })
);

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
