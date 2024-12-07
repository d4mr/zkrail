CREATE TABLE `intents` (
	`id` text PRIMARY KEY NOT NULL,
	`payment_token` text NOT NULL,
	`payment_token_amount` text NOT NULL,
	`rail_type` text NOT NULL,
	`recipient_address` text NOT NULL,
	`rail_amount` text NOT NULL,
	`creator_address` text NOT NULL,
	`chain_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`state` text DEFAULT 'CREATED' NOT NULL,
	`winning_solution_id` text,
	`resolution_tx_hash` text
);
--> statement-breakpoint
CREATE INDEX `creator_idx` ON `intents` (`creator_address`);--> statement-breakpoint
CREATE INDEX `state_idx` ON `intents` (`state`);--> statement-breakpoint
CREATE INDEX `rail_idx` ON `intents` (`rail_type`);--> statement-breakpoint
CREATE TABLE `solutions` (
	`id` text PRIMARY KEY NOT NULL,
	`intent_id` text NOT NULL,
	`solver_address` text NOT NULL,
	`amount_wei` text NOT NULL,
	`signature` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`commitment_tx_hash` text,
	`payment_metadata` text,
	FOREIGN KEY (`intent_id`) REFERENCES `intents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `intent_solutions_idx` ON `solutions` (`intent_id`);--> statement-breakpoint
CREATE INDEX `solver_idx` ON `solutions` (`solver_address`);