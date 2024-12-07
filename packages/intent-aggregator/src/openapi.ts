import type { OpenAPIObjectConfigure } from "@hono/zod-openapi";
import { Env } from "./types";

// The OpenAPI documentation will be available at /openapi.json
export const openApiConfiguration: OpenAPIObjectConfigure<
  Env,
  "/openapi.json"
> = {
  openapi: "3.0.0",
  info: {
    version: "0.0.1",
    title: "Intent Aggregator API",
    description: `
Example API for zkrail's Intent Aggregator
	`,
  },
};
