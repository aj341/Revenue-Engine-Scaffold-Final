import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const experimentsTable = pgTable(
  "experiments",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    hypothesis: text("hypothesis"),
    variableTested: text("variable_tested"),
    controlVariant: text("control_variant"),
    testVariant: text("test_variant"),
    segment: jsonb("segment"),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    status: text("status").notNull().default("draft"),
    resultSummary: text("result_summary"),
    decision: text("decision"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("experiments_status_idx").on(t.status)]
);

export const insertExperimentSchema = createInsertSchema(experimentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertExperiment = z.infer<typeof insertExperimentSchema>;
export type Experiment = typeof experimentsTable.$inferSelect;
