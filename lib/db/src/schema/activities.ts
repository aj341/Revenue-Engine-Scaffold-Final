import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const activitiesTable = pgTable(
  "activities",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    accountId: text("account_id").notNull(),
    contactId: text("contact_id").notNull(),
    prospectSequenceId: text("prospect_sequence_id"),
    channel: text("channel").notNull(),
    activityType: text("activity_type").notNull(),
    subject: text("subject"),
    body: text("body"),
    sentAt: timestamp("sent_at").notNull().defaultNow(),
    deliveredAt: timestamp("delivered_at"),
    openedAt: timestamp("opened_at"),
    repliedAt: timestamp("replied_at"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("activities_account_idx").on(t.accountId),
    index("activities_contact_idx").on(t.contactId),
    index("activities_type_idx").on(t.activityType),
  ]
);

export const insertActivitySchema = createInsertSchema(activitiesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activitiesTable.$inferSelect;
