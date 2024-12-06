import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as Schema from "./schema";

export type Bindings = {
  DB: D1Database;
};

export type VariablesWithDb = {
  db: DrizzleD1Database<typeof Schema>;
};

export type DbEnv = {
  Variables: VariablesWithDb;
  Bindings: Bindings;
};
