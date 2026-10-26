import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const sessions = pgTable("sessions", {
	id: varchar("id", { length: 255 }).primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
