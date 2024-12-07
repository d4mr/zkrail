import { Hono } from "hono";
import { z } from "zod";
import { validator } from "hono/validator";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";

// Types
const UPI_TYPES = ["P2P", "P2M", "M2P", "COL", "MAN"] as const;
type UpiType = (typeof UPI_TYPES)[number];

type Transaction = {
  type: "DEBIT" | "CREDIT";
  mode: "UPI" | "OTHERS" | "ATM";
  amount: number;
  currentBalance: string;
  transactionTimestamp: string;
  valueDate: string;
  txnId: string;
  narration: string;
  reference: string;
};

// Schema
const querySchema = z.object({
  type: z.enum(UPI_TYPES).optional(),
  id: z.string().optional(),
  memo: z.string().optional(),
  receiverAddress: z.string(),
  amount: z.string().transform(Number),
  timestamp: z.string().datetime(),
  forceError: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});

// Utils
function getRandomUpiType(): UpiType {
  return UPI_TYPES[Math.floor(Math.random() * UPI_TYPES.length)];
}

function generateTransactionId(): string {
  return Math.random().toString().slice(2, 11); // 9 digit number
}

function formatCurrency(amount: number): string {
  return amount.toFixed(2);
}

function getRandomAmount(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function buildUpiNarration(
  type: UpiType,
  id: string,
  receiverAddress: string,
  narration: string = "NA"
): string {
  return `UPI/${type}/${id}/${receiverAddress}/${narration}`;
}

function generateRandomUpiTransaction(
  currentBalance: number,
  date: Date
): Transaction {
  const amount = getRandomAmount(100, 5000);
  const isDebit = Math.random() < 0.7; // 70% chance of debit
  const newBalance = isDebit
    ? currentBalance - amount
    : currentBalance + amount;

  return {
    type: isDebit ? "DEBIT" : "CREDIT",
    mode: "UPI",
    amount,
    currentBalance: formatCurrency(newBalance),
    transactionTimestamp: date.toISOString(),
    valueDate: date.toISOString().split("T")[0],
    txnId: generateTransactionId(),
    narration: buildUpiNarration(
      getRandomUpiType(),
      generateTransactionId(),
      "random@upi"
    ),
    reference: "",
  };
}

function generateNonUpiTransaction(
  currentBalance: number,
  date: Date
): Transaction {
  const amount = getRandomAmount(100, 5000);
  const isDebit = Math.random() < 0.7;
  const newBalance = isDebit
    ? currentBalance - amount
    : currentBalance + amount;
  const mode = Math.random() < 0.5 ? "OTHERS" : "ATM";

  return {
    type: isDebit ? "DEBIT" : "CREDIT",
    mode,
    amount,
    currentBalance: formatCurrency(newBalance),
    transactionTimestamp: date.toISOString(),
    valueDate: date.toISOString().split("T")[0],
    txnId: "",
    narration: isDebit
      ? mode === "ATM"
        ? "ATW/XXXXXX7446/ATM WITHDRAWAL"
        : "PCD/XXXXXX7446/PURCHASE"
      : "NEFT/SALARY/CREDIT",
    reference: "",
  };
}

function generateTransactions(
  startDate: Date,
  endDate: Date,
  targetTransaction?: Transaction
): Transaction[] {
  const transactions: Transaction[] = [];
  let currentBalance = 100000; // Starting balance
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    // Add salary on 1st of each month
    if (currentDate.getDate() === 1) {
      currentBalance += 30000;
      transactions.push({
        type: "CREDIT",
        mode: "OTHERS",
        amount: 30000,
        currentBalance: formatCurrency(currentBalance),
        transactionTimestamp: currentDate.toISOString(),
        valueDate: currentDate.toISOString().split("T")[0],
        txnId: "",
        narration: "NEFT/SBIN322147057322/EMPLOYEE SALARY",
        reference: "",
      });
    }

    // Random transactions (2-3 per week)
    if (Math.random() < 0.3) {
      const transaction =
        Math.random() < 0.6
          ? generateRandomUpiTransaction(currentBalance, currentDate)
          : generateNonUpiTransaction(currentBalance, currentDate);

      currentBalance = parseFloat(transaction.currentBalance);
      transactions.push(transaction);
    }

    // Add target transaction if date matches
    if (
      targetTransaction &&
      currentDate.toISOString().split("T")[0] ===
        targetTransaction.transactionTimestamp.split("T")[0]
    ) {
      currentBalance -= targetTransaction.amount;
      targetTransaction.currentBalance = formatCurrency(currentBalance);
      transactions.push(targetTransaction);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return transactions.sort(
    (a, b) =>
      new Date(a.transactionTimestamp).getTime() -
      new Date(b.transactionTimestamp).getTime()
  );
}

// Hono App
const app = new Hono();

app.use("/*", cors());

app.get("/api/bank-statement", zValidator("query", querySchema), async (c) => {
  const { receiverAddress, amount, timestamp, type, id, forceError, memo } =
    c.req.valid("query");

  const requestDate = new Date(timestamp);
  const startDate = new Date(requestDate);
  startDate.setDate(startDate.getDate() - 15);
  const endDate = new Date(requestDate);
  endDate.setDate(endDate.getDate() + 15);

  const targetTransaction = forceError
    ? undefined
    : {
        type: "DEBIT" as const,
        mode: "UPI" as const,
        amount: amount / 100, // Convert paise to rupees
        currentBalance: "0", // Will be calculated during generation
        transactionTimestamp: timestamp,
        valueDate: timestamp.split("T")[0],
        txnId: id || generateTransactionId(),
        narration: buildUpiNarration(
          type || getRandomUpiType(),
          id || generateTransactionId(),
          receiverAddress,
          memo ?? "NA"
        ),
        reference: "",
      };

  const transactions = generateTransactions(
    startDate,
    endDate,
    targetTransaction
  );

  const response = {
    header: {
      rid: crypto.randomUUID(),
      ts: new Date().toISOString(),
    },
    body: [
      {
        fiObjects: [
          {
            Profile: {
              Holders: {
                Holder: {
                  name: "John D Smith",
                  dob: "1990-01-01",
                  mobile: "+919876576543",
                  nominee: "NOT-REGISTERED",
                  landline: "",
                  address: "123 Main St, Mumbai, Maharashtra, India, 400001",
                  email: "john.smith@example.com",
                  pan: "ABCDE1234F",
                  ckycCompliance: true,
                },
                type: "SINGLE",
              },
            },
            Summary: {
              Pending: {
                transactionType: "DEBIT",
                amount: 0,
              },
              currentBalance:
                transactions[transactions.length - 1].currentBalance,
              currency: "INR",
              exchgeRate: "",
              balanceDateTime: new Date().toISOString(),
              type: "SAVINGS",
              branch: "Main Branch",
              facility: "OD",
              ifscCode: "BANK0123456",
              micrCode: "",
              openingDate: "2020-01-01",
              currentODLimit: "0",
              drawingLimit: "0",
              status: "ACTIVE",
            },
            Transactions: {
              Transaction: transactions,
              startDate: startDate.toISOString().split("T")[0],
              endDate: endDate.toISOString().split("T")[0],
            },
            type: "deposit",
            maskedAccNumber: "XXXXX0123",
            version: "1.1",
            linkedAccRef: crypto.randomUUID(),
            schemaLocation: "http://api.rebit.org.in/FISchema/deposit",
          },
        ],
        fipId: "MOCKBANK123",
        fipName: "Mock Bank Ltd",
        custId: crypto.randomUUID(),
        consentId: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
        fiAccountInfo: [
          {
            accountRefNo: crypto.randomUUID(),
            linkRefNo: crypto.randomUUID(),
          },
        ],
      },
    ],
  };

  return c.json(response);
});

export default app;
