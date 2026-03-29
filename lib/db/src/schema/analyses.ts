import { pgTable, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const analysesTable = pgTable(
  "analyses",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    accountId: text("account_id").notNull(),
    domain: text("domain").notNull(),
    pageUrl: text("page_url").notNull(),
    pageType: text("page_type").notNull(),
    status: text("status").default("completed"),
    externalAnalysisId: text("external_analysis_id"),
    errorMessage: text("error_message"),
    findings: jsonb("findings"),
    categoryScores: jsonb("category_scores"),
    pageIntent: text("page_intent"),
    analyzedAt: timestamp("analyzed_at").notNull().defaultNow(),
    heroClarity: integer("hero_clarity").default(0),
    ctaClarity: integer("cta_clarity").default(0),
    ctaProminence: integer("cta_prominence").default(0),
    visualHierarchy: integer("visual_hierarchy").default(0),
    messageOrder: integer("message_order").default(0),
    outcomeClarity: integer("outcome_clarity").default(0),
    trustSignal: integer("trust_signal").default(0),
    friction: integer("friction").default(0),
    mobileReadability: integer("mobile_readability").default(0),
    primaryIssueCode: text("primary_issue_code"),
    secondaryIssueCode: text("secondary_issue_code"),
    tertiaryIssueCode: text("tertiary_issue_code"),
    issueSummaryShort: text("issue_summary_short"),
    issueSummaryDetailed: text("issue_summary_detailed"),
    strengthsDetected: jsonb("strengths_detected"),
    recommendedPriorityFix: text("recommended_priority_fix"),
    confidenceScore: integer("confidence_score").default(0),
    rawNotes: jsonb("raw_notes"),
    screenshotUrl: text("screenshot_url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("analyses_account_idx").on(t.accountId),
    index("analyses_domain_idx").on(t.domain),
    index("analyses_page_type_idx").on(t.pageType),
  ]
);

export const insertAnalysisSchema = createInsertSchema(analysesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analysesTable.$inferSelect;
