import { pgTable, text, real, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const repliesTable = pgTable(
  "replies",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    contactId: text("contact_id").notNull(),
    accountId: text("account_id").notNull(),
    activityId: text("activity_id"),
    prospectSequenceId: text("prospect_sequence_id"),
    replyText: text("reply_text").notNull(),
    channel: text("channel").notNull().default("Email"),
    receivedAt: timestamp("received_at").notNull().defaultNow(),
    classification: text("classification"),
    urgency: text("urgency"),
    confidenceScore: real("confidence_score"),
    reasoning: text("reasoning"),
    suggestedNextAction: text("suggested_next_action"),
    draftResponse: text("draft_response"),
    autoClassified: boolean("auto_classified").default(false),
    reviewedAt: timestamp("reviewed_at"),
    actionedAt: timestamp("actioned_at"),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("replies_contact_idx").on(t.contactId),
    index("replies_account_idx").on(t.accountId),
    index("replies_classification_idx").on(t.classification),
    index("replies_received_idx").on(t.receivedAt),
  ]
);

export const insertReplySchema = createInsertSchema(repliesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertReply = z.infer<typeof insertReplySchema>;
export type Reply = typeof repliesTable.$inferSelect;
