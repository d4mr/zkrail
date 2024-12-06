// index.ts
import { Hono } from "hono";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { prettyJSON } from "hono/pretty-json";
import { cors } from "hono/cors";
import { drizzle } from "drizzle-orm/d1";
import { createId } from "@paralleldrive/cuid2";
import * as schemas from "./schemas";
import { openApiConfiguration } from "./openapi";
import { Env } from "./types";
import { dbMiddleware } from "./db/middleware";
import { intents, IntentState, solutions } from "./db/schema";
import { createSelectSchema } from "drizzle-zod";
import { apiReference } from "@scalar/hono-api-reference";
import { eq } from "drizzle-orm";

const api = new OpenAPIHono<Env>();
// Create Intent
const createIntent = createRoute({
  method: "post",
  path: "/api/intents",
  request: {
    body: {
      content: {
        "application/json": {
          schema: schemas.CreateIntentSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            intentId: z.string(),
          }),
        },
      },
      description: "Intent created successfully",
    },
  },
});

api.openapi(createIntent, async (c) => {
  const db = drizzle(c.env.DB);
  const body = c.req.valid("json");

  const intent = {
    id: createId(),
    ...body,
    state: IntentState.CREATED,
  };

  await db.insert(intents).values(intent);

  return c.json({ intentId: intent.id });
});

// Get Intent
const getIntent = createRoute({
  method: "get",
  path: "/api/intents/:id",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: createSelectSchema(intents),
        },
      },
      description: "Intent found",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.object({
              code: z.literal("NOT_FOUND"),
              message: z.string(),
            }),
          }),
        },
      },
      description: "Intent not found",
    },
  },
});

const INTENT_NOT_FOUND_ERROR = {
  error: { code: "NOT_FOUND", message: "Intent not found" },
} as const;

api.openapi(getIntent, async (c) => {
  const intent = await c.var.db.query.intents.findFirst({
    where: (intents, { eq }) => eq(intents.id, c.req.param("id")),
  });

  if (!intent) {
    return c.json(INTENT_NOT_FOUND_ERROR, 404);
  }

  return c.json(intent, 200);
});

// Submit Solution
const submitSolution = createRoute({
  method: "post",
  path: "/api/intents/:id/solutions",
  request: {
    body: {
      content: {
        "application/json": {
          schema: schemas.CreateSolutionSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            solutionId: z.string(),
          }),
        },
      },
      description: "Solution submitted successfully",
    },
  },
});

api.openapi(submitSolution, async (c) => {
  const db = drizzle(c.env.DB);
  const body = c.req.valid("json");

  const solution = {
    id: createId(),
    intentId: c.req.param("id"),
    ...body,
  };

  await db.insert(solutions).values(solution);
  return c.json({ solutionId: solution.id });
});

const getSolutions = createRoute({
  method: "get",
  path: "/api/intents/:id/solutions",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            solutions: z.array(createSelectSchema(solutions)),
          }),
        },
      },
      description: "Solutions retrieved successfully",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.object({
              code: z.literal("NOT_FOUND"),
              message: z.string(),
            }),
          }),
        },
      },
      description: "Intent not found",
    },
  },
});

api.openapi(getSolutions, async (c) => {
  const intent = await c.var.db.query.intents.findFirst({
    where: (intents, { eq }) => eq(intents.id, c.req.param("id")),
  });

  if (!intent) {
    return c.json(INTENT_NOT_FOUND_ERROR, 404);
  }

  const solutions = await c.var.db.query.solutions.findMany({
    where: (solutions, { eq }) => eq(solutions.intentId, c.req.param("id")),
  });

  // Sort in memory by lowest amountWei
  const sortedSolutions = [...solutions].sort((a, b) => {
    const aBig = BigInt(a.amountWei);
    const bBig = BigInt(b.amountWei);
    return aBig > bBig ? 1 : aBig < bBig ? -1 : 0;
  });

  return c.json({ solutions: sortedSolutions }, 200);
});

// Accept Solution
const acceptSolution = createRoute({
  method: "post",
  path: "/api/solutions/:id/accept",
  request: {
    body: {
      content: {
        "application/json": {
          schema: schemas.AcceptSolutionSchema,
        },
      },
    },
  },
  responses: {
    204: {
      description: "Solution accepted successfully",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.object({
              code: z.literal("NOT_FOUND"),
              message: z.string(),
            }),
          }),
        },
      },
      description: "Solution not found",
    },
  },
});

const SOLUTION_NOT_FOUND_ERROR = {
  error: { code: "NOT_FOUND", message: "Solution not found" },
} as const;

api.openapi(acceptSolution, async (c) => {
  const solution = await c.var.db.query.solutions.findFirst({
    where: (solutions, { eq }) => eq(solutions.id, c.req.param("id")),
    with: {
      intent: true,
    },
  });

  if (!solution) {
    return c.json(SOLUTION_NOT_FOUND_ERROR, 404);
  }

  const body = c.req.valid("json");

  // Update solution with commitment
  await c.var.db
    .update(solutions)
    .set({
      commitmentTxHash: body.commitmentTxHash,
    })
    .where(eq(solutions.id, solution.id));

  // Update intent state
  await c.var.db
    .update(intents)
    .set({
      state: IntentState.SOLUTION_COMMITTED,
      winningSolutionId: solution.id,
    })
    .where(eq(intents.id, solution.intentId));

  return new Response(null, { status: 204 });
});

// Claim Payment
const claimPayment = createRoute({
  method: "post",
  path: "/api/solutions/:id/claim",
  request: {
    body: {
      content: {
        "application/json": {
          schema: schemas.ClaimPaymentSchema,
        },
      },
    },
  },
  responses: {
    204: {
      description: "Payment claimed successfully",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.object({
              code: z.literal("NOT_FOUND"),
              message: z.string(),
            }),
          }),
        },
      },
      description: "Solution not found",
    },
  },
});

api.openapi(claimPayment, async (c) => {
  const solution = await c.var.db.query.solutions.findFirst({
    where: (solutions, { eq }) => eq(solutions.id, c.req.param("id")),
  });

  if (!solution) {
    return c.json(SOLUTION_NOT_FOUND_ERROR, 404);
  }

  const body = c.req.valid("json");

  await c.var.db.transaction(async (tx) => {
    // Update solution with payment metadata
    await tx
      .update(solutions)
      .set({
        paymentMetadata: JSON.stringify(body.paymentMetadata),
      })
      .where(eq(solutions.id, solution.id));

    // Update intent state
    await tx
      .update(intents)
      .set({ state: IntentState.PAYMENT_CLAIMED })
      .where(eq(intents.id, solution.intentId));
  });

  return new Response(null, { status: 204 });
});

const app = new OpenAPIHono<Env>()
  .doc("/openapi.json", openApiConfiguration)
  .get(
    "/reference",
    apiReference({
      spec: {
        url: "/openapi.json",
      },
      theme: "deepSpace",
    })
  )
  .use(dbMiddleware)
  .use("*", cors())
  .use("*", prettyJSON())
  .route("", api);

export default { fetch: app.fetch };
export type AppType = typeof app;
