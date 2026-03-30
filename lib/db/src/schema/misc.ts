import { pgTable, text, boolean, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Assets
export const assetsTable = pgTable(
  "assets",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    assetName: text("asset_name").notNull(),
    assetType: text("asset_type").notNull(),
    description: text("description"),
    funnelStageBest: text("funnel_stage_best"),
    icpFit: jsonb("icp_fit"),
    issueFit: jsonb("issue_fit"),
    deliveryModes: jsonb("delivery_modes"),
    existingUrl: text("existing_url"),
    active: boolean("active").notNull().default(true),
  },
  (t) => [index("assets_type_idx").on(t.assetType)]
);

export const insertAssetSchema = createInsertSchema(assetsTable).omit({ id: true });
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assetsTable.$inferSelect;

// Asset Usages
export const assetUsagesTable = pgTable(
  "asset_usages",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    assetId: text("asset_id").notNull(),
    accountId: text("account_id").notNull(),
    contactId: text("contact_id").notNull(),
    activityId: text("activity_id"),
    stage: text("stage"),
    sharedAt: timestamp("shared_at").notNull().defaultNow(),
    engagedAt: timestamp("engaged_at"),
    engagementType: text("engagement_type"),
  },
  (t) => [
    index("asset_usages_asset_idx").on(t.assetId),
    index("asset_usages_account_idx").on(t.accountId),
  ]
);

export const insertAssetUsageSchema = createInsertSchema(assetUsagesTable).omit({ id: true });
export type InsertAssetUsage = z.infer<typeof insertAssetUsageSchema>;
export type AssetUsage = typeof assetUsagesTable.$inferSelect;

// Events (audit log)
export const eventsTable = pgTable(
  "events",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    eventName: text("event_name").notNull(),
    accountId: text("account_id"),
    contactId: text("contact_id"),
    relatedId: text("related_id"),
    relatedType: text("related_type"),
    payload: jsonb("payload"),
    occurredAt: timestamp("occurred_at").notNull().defaultNow(),
  },
  (t) => [
    index("events_name_idx").on(t.eventName),
    index("events_account_idx").on(t.accountId),
  ]
);

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;

// Playbook entries
export const playbookEntriesTable = pgTable(
  "playbook_entries",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    ruleNumber: integer("rule_number"),
    category: text("category").notNull(),
    // Legacy title field kept; new format uses ruleTitle
    title: text("title").notNull(),
    ruleTitle: text("rule_title"),
    priority: text("priority"),
    // Legacy body kept; new format uses guidance
    bodyMarkdown: text("body_markdown").notNull(),
    guidance: text("guidance"),
    examples: jsonb("examples"),
    edgeCases: jsonb("edge_cases"),
    relatedRules: jsonb("related_rules"),
    version: integer("version").notNull().default(1),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("playbook_category_idx").on(t.category),
    index("playbook_rule_number_idx").on(t.ruleNumber),
    index("playbook_priority_idx").on(t.priority),
  ]
);

export const insertPlaybookEntrySchema = createInsertSchema(playbookEntriesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPlaybookEntry = z.infer<typeof insertPlaybookEntrySchema>;
export type PlaybookEntry = typeof playbookEntriesTable.$inferSelect;

// Import Logs
export const importLogsTable = pgTable(
  "import_logs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().default("default"),
    recordType: text("record_type").notNull(),
    fileName: text("file_name").notNull(),
    rowCount: integer("row_count").notNull().default(0),
    successCount: integer("success_count").notNull().default(0),
    skipCount: integer("skip_count").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
    errors: jsonb("errors"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("import_logs_user_idx").on(t.userId)]
);

export const insertImportLogSchema = createInsertSchema(importLogsTable).omit({ id: true, createdAt: true });
export type InsertImportLog = z.infer<typeof insertImportLogSchema>;
export type ImportLog = typeof importLogsTable.$inferSelect;

// Settings
export const settingsTable = pgTable(
  "settings",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().unique(),
    anthropicApiKeyEncrypted: text("anthropic_api_key_encrypted"),
    openaiApiKeyEncrypted: text("openai_api_key_encrypted"),
    defaultSenderEmail: text("default_sender_email"),
    defaultSenderName: text("default_sender_name"),
    homepageAnalyserApiUrl: text("homepage_analyser_api_url"),
    homepageAnalyserApiKey: text("homepage_analyser_api_key"),
    notificationPreferences: jsonb("notification_preferences"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("settings_user_idx").on(t.userId)]
);

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;

// Users (simple internal user management, no Supabase)
export const usersTable = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
