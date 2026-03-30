import { pgTable, text, boolean, timestamp, jsonb, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const issueClustersTable = pgTable("issue_clusters", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  issueCode: text("issue_code").notNull().unique(),
  issueName: text("issue_name").notNull(),
  label: text("label"),
  description: text("description"),
  severityDefault: text("severity_default"),
  category: text("category"),
  subcategory: text("subcategory"),
  commonTriggers: jsonb("common_triggers"),
  relatedIssues: jsonb("related_issues"),
  suggestedInsightBlocks: jsonb("suggested_insight_blocks"),
  suggestedSequenceFamily: text("suggested_sequence_family"),
});

export const insertIssueClusterSchema = createInsertSchema(issueClustersTable).omit({ id: true });
export type InsertIssueCluster = z.infer<typeof insertIssueClusterSchema>;
export type IssueCluster = typeof issueClustersTable.$inferSelect;

export const insightBlocksTable = pgTable(
  "insight_blocks",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    issueCode: text("issue_code").notNull(),
    icp: text("icp").notNull(),
    industries: jsonb("industries"),
    shortInsightLine: text("short_insight_line").notNull(),
    longerExplainer: text("longer_explainer"),
    businessConsequence: text("business_consequence"),
    severityHint: text("severity_hint"),
    suitableChannels: jsonb("suitable_channels"),
    suitableSteps: jsonb("suitable_steps"),
    ctaPairings: jsonb("cta_pairings"),
    assetPairings: jsonb("asset_pairings"),
    confidenceNotes: text("confidence_notes"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("insight_blocks_issue_idx").on(t.issueCode),
    index("insight_blocks_icp_idx").on(t.icp),
  ]
);

export const insertInsightBlockSchema = createInsertSchema(insightBlocksTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInsightBlock = z.infer<typeof insertInsightBlockSchema>;
export type InsightBlock = typeof insightBlocksTable.$inferSelect;
