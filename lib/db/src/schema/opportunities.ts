import { pgTable, text, timestamp, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const opportunitiesTable = pgTable(
  "opportunities",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    accountId: text("account_id").notNull(),
    contactId: text("contact_id").notNull(),
    stage: text("stage").notNull(),
    valueEstimate: numeric("value_estimate", { precision: 12, scale: 2 }),
    bookedAt: timestamp("booked_at"),
    heldAt: timestamp("held_at"),
    proposalSentAt: timestamp("proposal_sent_at"),
    closedAt: timestamp("closed_at"),
    closedStatus: text("closed_status"),
    lossReason: text("loss_reason"),
    winReason: text("win_reason"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("opps_account_idx").on(t.accountId),
    index("opps_contact_idx").on(t.contactId),
    index("opps_stage_idx").on(t.stage),
  ]
);

export const insertOpportunitySchema = createInsertSchema(opportunitiesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;
export type Opportunity = typeof opportunitiesTable.$inferSelect;
