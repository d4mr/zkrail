import { relations, sql } from "drizzle-orm";
import { z } from "@hono/zod-openapi";

import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const railTypeSchema = z.enum(["UPI", "BITCOIN"]);

// CREATED -> SOLUTION_COMMITTED -> PAYMENT_CLAIMED -> SETTLED   (Happy path)
//                                                \-> RESOLVED  (Dispute path)

export const intentStateSchema = z.enum([
  "CREATED",
  "SOLUTION_COMMITTED",
  "PAYMENT_CLAIMED",
  "RESOLVED",
  "SETTLED",
]);

export type PaymentRailType = z.infer<typeof railTypeSchema>;
export type IntentStateType = z.infer<typeof intentStateSchema>;

export const RAIL_CURRENCY = {
  UPI: "INR",
  BITCOIN: "BTC",
} as const;

export const RAIL_SMALLEST_UNIT = {
  UPI: "paise",
  BITCOIN: "sats",
} as const;

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

    state: text("state").notNull().$type<IntentStateType>().default("CREATED"),
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
    
    // Settlement is the optimistic path
    settlementTxHash: text("settlement_tx_hash"),

    // Resolution is the dispute path
    resolutionTxHash: text("resolution_tx_hash"),

    paymentMetadata: text("payment_metadata"),
  },
  (table) => ({
    intentIdx: index("intent_solutions_idx").on(table.intentId),
    solverIdx: index("solver_idx").on(table.solverAddress),
  })
);

export const solutionsRelations = relations(solutions, ({ one }) => ({
  intent: one(intents, {
    fields: [solutions.intentId],
    references: [intents.id],
  }),
}));
