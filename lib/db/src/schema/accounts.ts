import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const accountsTable = pgTable(
  "accounts",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    companyName: text("company_name").notNull(),
    domain: text("domain"),
    websiteUrl: text("website_url"),
    industry: text("industry"),
    subIndustry: text("sub_industry"),
    employeeBand: text("employee_band"),
    revenueBand: text("revenue_band"),
    geography: text("geography"),
    icpType: text("icp_type"),
    fitScore: integer("fit_score").default(0),
    priorityTier: text("priority_tier"),
    source: text("source"),
    sourceDetail: text("source_detail"),
    sourceCaptureDate: timestamp("source_capture_date"),
    ownerId: text("owner_id").notNull().default("default"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("accounts_owner_idx").on(t.ownerId),
    index("accounts_domain_idx").on(t.domain),
  ]
);

export const insertAccountSchema = createInsertSchema(accountsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accountsTable.$inferSelect;
