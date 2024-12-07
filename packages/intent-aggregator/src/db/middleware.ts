import { drizzle } from "drizzle-orm/d1";
import { createMiddleware } from "hono/factory";
import * as schema from "./schema";
import type { DbEnv } from "./types";

export const dbMiddleware = createMiddleware<DbEnv>((c, next) => {
  c.set("db", drizzle(c.env.DB, { schema }));
  return next();
});
