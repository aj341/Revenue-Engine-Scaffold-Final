import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contactsTable = pgTable(
  "contacts",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    accountId: text("account_id").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    fullName: text("full_name"),
    jobTitle: text("job_title"),
    seniority: text("seniority"),
    email: text("email"),
    phone: text("phone"),
    linkedinUrl: text("linkedin_url"),
    contactSource: text("contact_source"),
    sourceDate: timestamp("source_date"),
    outreachStatus: text("outreach_status").notNull().default("new"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("contacts_account_idx").on(t.accountId),
    index("contacts_email_idx").on(t.email),
    index("contacts_status_idx").on(t.outreachStatus),
  ]
);

export const insertContactSchema = createInsertSchema(contactsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contactsTable.$inferSelect;
