// schemas.ts
import { z } from "@hono/zod-openapi";
import { getAddress } from "thirdweb/utils";
import { railTypeSchema } from "./db/schema";

// Custom Ethereum address refinement
const addressSchema = z.string().transform((address, ctx) => {
  try {
    return getAddress(address) as `0x${string}`; // Will be properly typed as Address
  } catch (e) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid Ethereum address checksum",
    });
    return z.NEVER;
  }
});

// Type helper
export type Address = z.infer<typeof addressSchema>;

// Common schemas
const tokenAmountSchema = z.string().regex(/^\d+$/); // Only positive integers as strings
const chainIdSchema = z.number().int().positive();


// Request schemas
export const CreateIntentSchema = z.object({
  paymentToken: addressSchema,
  paymentTokenAmount: tokenAmountSchema,
  railType: railTypeSchema,
  recipientAddress: z.string(), // Different validation per rail type
  railAmount: tokenAmountSchema,
  creatorAddress: addressSchema,
  chainId: chainIdSchema,
});

export const CreateSolutionSchema = z.object({
  solverAddress: addressSchema,
  amountWei: tokenAmountSchema,
  signature: z.string(),
});

export const AcceptSolutionSchema = z.object({
  commitmentTxHash: z.string(),
});

export const ClaimPaymentSchema = z
  .object({
    paymentMetadata: z.object({
      transactionId: z.string(),
      timestamp: z.coerce.date(), // Will accept ISO string and coerce to Date
      railSpecificData: z.record(z.unknown()).optional(),
    }),
  })
  .transform((data) => ({
    paymentMetadata: {
      ...data.paymentMetadata,
      // Transform back to ISO string for storage
      timestamp: data.paymentMetadata.timestamp.toISOString(),
    },
  }));

export const ResolveSolutionSchema = z.object({
  resolutionTxHash: z.string(),
});
