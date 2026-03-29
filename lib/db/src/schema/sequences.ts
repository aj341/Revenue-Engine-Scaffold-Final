import { pgTable, text, boolean, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sequencesTable = pgTable(
  "sequences",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    sequenceName: text("sequence_name").notNull(),
    icp: text("icp"),
    issueCluster: text("issue_cluster"),
    industryFilter: text("industry_filter"),
    priorityTier: text("priority_tier"),
    channelMix: jsonb("channel_mix"),
    ctaStrategy: text("cta_strategy"),
    assetStrategy: text("asset_strategy"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("sequences_icp_idx").on(t.icp),
    index("sequences_cluster_idx").on(t.issueCluster),
  ]
);

export const insertSequenceSchema = createInsertSchema(sequencesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSequence = z.infer<typeof insertSequenceSchema>;
export type Sequence = typeof sequencesTable.$inferSelect;

export const messageTemplatesTable = pgTable(
  "message_templates",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    channel: text("channel").notNull(),
    icp: text("icp"),
    issueCode: text("issue_code"),
    tone: text("tone"),
    stage: text("stage"),
    variantName: text("variant_name"),
    subjectTemplate: text("subject_template"),
    bodyTemplate: text("body_template").notNull(),
    ctaStyle: text("cta_style"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("templates_channel_idx").on(t.channel),
    index("templates_icp_idx").on(t.icp),
    index("templates_issue_idx").on(t.issueCode),
  ]
);

export const insertMessageTemplateSchema = createInsertSchema(messageTemplatesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMessageTemplate = z.infer<typeof insertMessageTemplateSchema>;
export type MessageTemplate = typeof messageTemplatesTable.$inferSelect;

export const sequenceStepsTable = pgTable(
  "sequence_steps",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    sequenceId: text("sequence_id").notNull(),
    stepNumber: integer("step_number").notNull(),
    dayOffset: integer("day_offset").notNull(),
    channel: text("channel").notNull(),
    objective: text("objective"),
    angle: text("angle"),
    templateId: text("template_id"),
    assetToInclude: text("asset_to_include"),
    personalizationRequiredFields: jsonb("personalization_required_fields"),
    sendWindow: text("send_window"),
    fallbackBehavior: text("fallback_behavior"),
  },
  (t) => [
    index("seq_steps_sequence_idx").on(t.sequenceId),
    index("seq_steps_template_idx").on(t.templateId),
  ]
);

export const insertSequenceStepSchema = createInsertSchema(sequenceStepsTable).omit({ id: true });
export type InsertSequenceStep = z.infer<typeof insertSequenceStepSchema>;
export type SequenceStep = typeof sequenceStepsTable.$inferSelect;

export const prospectSequencesTable = pgTable(
  "prospect_sequences",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    accountId: text("account_id").notNull(),
    contactId: text("contact_id").notNull(),
    sequenceId: text("sequence_id").notNull(),
    status: text("status").notNull().default("active"),
    currentStep: integer("current_step"),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
    stoppedReason: text("stopped_reason"),
  },
  (t) => [
    index("prospect_seq_account_idx").on(t.accountId),
    index("prospect_seq_contact_idx").on(t.contactId),
    index("prospect_seq_status_idx").on(t.status),
  ]
);

export const insertProspectSequenceSchema = createInsertSchema(prospectSequencesTable).omit({
  id: true,
  startedAt: true,
});

export type InsertProspectSequence = z.infer<typeof insertProspectSequenceSchema>;
export type ProspectSequence = typeof prospectSequencesTable.$inferSelect;
