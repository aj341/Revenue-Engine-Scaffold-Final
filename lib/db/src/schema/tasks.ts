import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tasksTable = pgTable(
  "tasks",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    accountId: text("account_id"),
    contactId: text("contact_id"),
    replyId: text("reply_id"),
    type: text("type").notNull().default("follow_up"),
    title: text("title").notNull(),
    description: text("description"),
    dueAt: timestamp("due_at"),
    status: text("status").notNull().default("open"),
    priority: text("priority").notNull().default("medium"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("tasks_account_idx").on(t.accountId),
    index("tasks_contact_idx").on(t.contactId),
    index("tasks_status_idx").on(t.status),
    index("tasks_due_idx").on(t.dueAt),
  ]
);

export const insertTaskSchema = createInsertSchema(tasksTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
