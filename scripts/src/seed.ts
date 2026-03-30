import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  pool,
  issueClustersTable,
  insightBlocksTable,
  sequencesTable,
  sequenceStepsTable,
  playbookEntriesTable,
  assetsTable,
  accountsTable,
} from "@workspace/db";

// ─── Path helpers ────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataDir = join(__dirname, "../../data");

function readJson<T>(filename: string): T {
  return JSON.parse(readFileSync(join(dataDir, filename), "utf-8")) as T;
}

// ─── Types matching the JSON files ───────────────────────────────────────────
interface IssueTaxonomy {
  issues: Array<{
    issue_code: string;
    issue_name: string;
    description: string;
    severity_default: string;
    category: string;
  }>;
}

interface InsightBlocksFile {
  insight_blocks: Array<{
    id: string;
    issue_code: string;
    icp: string;
    industries: string[];
    short_insight_line: string;
    longer_explainer: string;
    business_consequence: string;
    severity_hint: string;
    suitable_channels: string[];
    suitable_steps: number[];
    asset_pairings: string[];
    cta_pairings: string[];
    confidence_notes: string;
  }>;
}

interface SequencesFile {
  sequences: Array<{
    sequence_name: string;
    icp: string;
    issue_cluster: string;
    priority_tier: string;
    channel_mix: string[];
    cta_strategy: string;
    asset_strategy: string;
    steps: Array<{
      step_number: number;
      day_offset: number;
      channel: string;
      objective: string;
      angle: string;
      asset_to_include: string | null;
      personalization_required_fields: string[];
      send_window: string;
      fallback_behavior: string;
      email_template?: string;
      message_type?: string;
    }>;
  }>;
}

interface PlaybookFile {
  playbook_entries: Array<{
    category: string;
    title: string;
    body_markdown: string;
    version: number;
  }>;
}

interface AssetMatchingFile {
  assets: Array<{
    asset_name: string;
    asset_type: string;
    description: string;
    funnel_stage_best: string;
    icp_fit: string[];
    issue_fit: string[];
    delivery_modes: string[];
    existing_url: string;
  }>;
}

// ─── 1. Issue Clusters ───────────────────────────────────────────────────────
async function seedIssueClusters() {
  const { issues } = readJson<IssueTaxonomy>("issue-taxonomy.json");
  console.log(`\n📋 Seeding ${issues.length} issue clusters…`);

  let inserted = 0;
  let skipped = 0;

  for (const issue of issues) {
    const result = await db
      .insert(issueClustersTable)
      .values({
        issueCode: issue.issue_code,
        issueName: issue.issue_name,
        description: issue.description,
        severityDefault: issue.severity_default,
        category: issue.category,
      })
      .onConflictDoNothing({ target: issueClustersTable.issueCode })
      .returning({ id: issueClustersTable.id });

    if (result.length > 0) inserted++;
    else skipped++;
  }

  console.log(`   ✅ ${inserted} inserted, ${skipped} already existed`);
}

// ─── 2. Insight Blocks ───────────────────────────────────────────────────────
async function seedInsightBlocks() {
  const { insight_blocks } = readJson<InsightBlocksFile>("insight-blocks.json");
  console.log(`\n💡 Seeding ${insight_blocks.length} insight blocks…`);

  // Clear and re-insert for idempotency (no unique constraint to use)
  await db.delete(insightBlocksTable);

  const rows = insight_blocks.map((b) => ({
    issueCode: b.issue_code,
    icp: b.icp,
    industries: b.industries ?? [],
    shortInsightLine: b.short_insight_line,
    longerExplainer: b.longer_explainer ?? null,
    businessConsequence: b.business_consequence ?? null,
    severityHint: b.severity_hint ?? null,
    suitableChannels: b.suitable_channels ?? [],
    suitableSteps: b.suitable_steps ?? [],
    assetPairings: b.asset_pairings ?? [],
    ctaPairings: b.cta_pairings ?? [],
    confidenceNotes: b.confidence_notes ?? null,
    active: true,
  }));

  await db.insert(insightBlocksTable).values(rows);
  console.log(`   ✅ ${rows.length} inserted`);
}

// ─── 3. Sequences + Steps ────────────────────────────────────────────────────
async function seedSequences() {
  const { sequences } = readJson<SequencesFile>("seed-sequences.json");
  console.log(`\n🔗 Seeding ${sequences.length} sequences…`);

  for (const seq of sequences) {
    // Check if this sequence already exists
    const existing = await db
      .select({ id: sequencesTable.id })
      .from(sequencesTable)
      .where(eq(sequencesTable.sequenceName, seq.sequence_name))
      .limit(1);

    let sequenceId: string;

    if (existing.length > 0) {
      sequenceId = existing[0].id;
      // Delete existing steps so we can re-insert fresh
      await db.delete(sequenceStepsTable).where(eq(sequenceStepsTable.sequenceId, sequenceId));
      // Update the sequence record
      await db
        .update(sequencesTable)
        .set({
          icp: seq.icp,
          issueCluster: seq.issue_cluster,
          priorityTier: seq.priority_tier,
          channelMix: seq.channel_mix,
          ctaStrategy: seq.cta_strategy,
          assetStrategy: seq.asset_strategy,
          active: true,
          updatedAt: new Date(),
        })
        .where(eq(sequencesTable.id, sequenceId));
      console.log(`   ↩  Updated: ${seq.sequence_name}`);
    } else {
      const inserted = await db
        .insert(sequencesTable)
        .values({
          sequenceName: seq.sequence_name,
          icp: seq.icp,
          issueCluster: seq.issue_cluster,
          priorityTier: seq.priority_tier,
          channelMix: seq.channel_mix,
          ctaStrategy: seq.cta_strategy,
          assetStrategy: seq.asset_strategy,
          active: true,
        })
        .returning({ id: sequencesTable.id });
      sequenceId = inserted[0].id;
      console.log(`   ➕ Created: ${seq.sequence_name}`);
    }

    // Insert steps
    const stepRows = seq.steps.map((step) => ({
      sequenceId,
      stepNumber: step.step_number,
      dayOffset: step.day_offset,
      channel: step.channel,
      objective: step.objective ?? null,
      angle: step.angle ?? null,
      templateId: null, // template not pre-seeded
      assetToInclude: step.asset_to_include ?? null,
      personalizationRequiredFields: step.personalization_required_fields ?? [],
      sendWindow: step.send_window ?? null,
      fallbackBehavior: step.fallback_behavior ?? null,
    }));

    await db.insert(sequenceStepsTable).values(stepRows);
    console.log(`      ${stepRows.length} steps inserted`);
  }

  console.log(`   ✅ ${sequences.length} sequences processed`);
}

// ─── 4. Playbook Entries ─────────────────────────────────────────────────────
async function seedPlaybook() {
  const { playbook_entries } = readJson<PlaybookFile>("seed-playbook.json");
  console.log(`\n📖 Seeding ${playbook_entries.length} playbook entries…`);

  // Clear and re-insert for idempotency
  await db.delete(playbookEntriesTable);

  const rows = playbook_entries.map((e) => ({
    category: e.category,
    title: e.title,
    bodyMarkdown: e.body_markdown,
    version: e.version ?? 1,
    active: true,
  }));

  await db.insert(playbookEntriesTable).values(rows);
  console.log(`   ✅ ${rows.length} inserted`);
}

// ─── 5. Assets ───────────────────────────────────────────────────────────────
async function seedAssets() {
  const { assets } = readJson<AssetMatchingFile>("asset-matching-rules.json");
  console.log(`\n🗂  Seeding ${assets.length} assets…`);

  let inserted = 0;
  let updated = 0;

  for (const asset of assets) {
    const existing = await db
      .select({ id: assetsTable.id })
      .from(assetsTable)
      .where(eq(assetsTable.assetName, asset.asset_name))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(assetsTable)
        .set({
          assetType: asset.asset_type,
          description: asset.description ?? null,
          funnelStageBest: asset.funnel_stage_best ?? null,
          icpFit: asset.icp_fit ?? [],
          issueFit: asset.issue_fit ?? [],
          deliveryModes: asset.delivery_modes ?? [],
          existingUrl: asset.existing_url ?? null,
          active: true,
        })
        .where(eq(assetsTable.id, existing[0].id));
      updated++;
    } else {
      await db.insert(assetsTable).values({
        assetName: asset.asset_name,
        assetType: asset.asset_type,
        description: asset.description ?? null,
        funnelStageBest: asset.funnel_stage_best ?? null,
        icpFit: asset.icp_fit ?? [],
        issueFit: asset.issue_fit ?? [],
        deliveryModes: asset.delivery_modes ?? [],
        existingUrl: asset.existing_url ?? null,
        active: true,
      });
      inserted++;
    }
  }

  console.log(`   ✅ ${inserted} inserted, ${updated} updated`);
}

// ─── 6. Accounts (Australian companies) ─────────────────────────────────────
const ACCOUNTS = [
  { companyName: "Margin Media",    domain: "marginmedia.com.au",   websiteUrl: "https://marginmedia.com.au",   industry: "agency",    employeeBand: "11-50"  },
  { companyName: "Arcadian Digital", domain: "arcadiandigital.com.au", websiteUrl: "https://arcadiandigital.com.au", industry: "agency", employeeBand: "11-50" },
  { companyName: "TFM Digital",     domain: "tfmdigital.com.au",    websiteUrl: "https://tfmdigital.com.au",    industry: "agency",    employeeBand: "11-50"  },
  { companyName: "Showpo",          domain: "showpo.com",           websiteUrl: "https://showpo.com",           industry: "ecommerce", employeeBand: "51-200" },
  { companyName: "Brighte",         domain: "brighte.com.au",       websiteUrl: "https://brighte.com.au",       industry: "fintech",   employeeBand: "51-200" },
  { companyName: "Sendle",          domain: "sendle.com",           websiteUrl: "https://sendle.com",           industry: "logistics", employeeBand: "51-200" },
  { companyName: "Frank Body",      domain: "frankbody.com",        websiteUrl: "https://frankbody.com",        industry: "ecommerce", employeeBand: "11-50"  },
  { companyName: "Deputy",          domain: "deputy.com",           websiteUrl: "https://deputy.com",           industry: "saas",      employeeBand: "201-500" },
];

async function seedAccounts() {
  console.log(`\n🏢 Seeding ${ACCOUNTS.length} Australian company accounts…`);

  let inserted = 0;
  let skipped = 0;

  for (const account of ACCOUNTS) {
    const existing = await db
      .select({ id: accountsTable.id })
      .from(accountsTable)
      .where(eq(accountsTable.domain, account.domain))
      .limit(1);

    if (existing.length > 0) {
      skipped++;
      console.log(`   ⏭  Skipped (exists): ${account.companyName}`);
    } else {
      await db.insert(accountsTable).values({
        companyName: account.companyName,
        domain: account.domain,
        websiteUrl: account.websiteUrl,
        industry: account.industry,
        employeeBand: account.employeeBand,
        geography: "AU",
        ownerId: "default",
        source: "manual_import",
        priorityTier: "tier_1",
        fitScore: 0,
      });
      inserted++;
      console.log(`   ➕ Inserted: ${account.companyName}`);
    }
  }

  console.log(`   ✅ ${inserted} inserted, ${skipped} already existed`);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Design Bees — Database Seed");
  console.log("================================");

  try {
    await seedIssueClusters();
    await seedInsightBlocks();
    await seedSequences();
    await seedPlaybook();
    await seedAssets();
    await seedAccounts();

    console.log("\n🎉 Seed complete!\n");
  } catch (err) {
    console.error("\n❌ Seed failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
