import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const busStopEnum = pgEnum("bus_stop", ["UCSAL", "PITUACU"]);
export const occupancyEnum = pgEnum("occupancy_level", ["vazio", "moderado", "cheio"]);

export const busDepartures = pgTable("bus_departures", {
	id: uuid("id").primaryKey().defaultRandom(),
	time: text("time").notNull(),
	stop: busStopEnum("stop").notNull(),
	route: text("route").notNull(),
	status: text("status").notNull(),
	occupancy: occupancyEnum("occupancy").notNull().default("vazio"),
	delayMinutes: integer("delay_minutes").notNull().default(0),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
