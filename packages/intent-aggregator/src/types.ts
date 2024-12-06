import { DrizzleD1Database } from "drizzle-orm/d1";
import type * as Schema from "./db/schema";

export type Bindings = {
	DB: D1Database;
};

export type Variables = {
	db: DrizzleD1Database<typeof Schema>;
};

export type Env = {
	Variables: Variables;
	Bindings: Bindings;
};