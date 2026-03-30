/**
 * Design Bees Outbound Revenue Engine - Database Seed Script
 *
 * This script populates the Supabase database with seed data by reading JSON files
 * from the data/ directory at runtime.
 *
 * Before running this script:
 * 1. Copy the data/ folder containing JSON files into your Replit project root
 *    Expected files:
 *    - data/issue-taxonomy.json
 *    - data/insight-blocks.json
 *    - data/seed-sequences.json
 *    - data/seed-playbook.json
 *    - data/asset-matching-rules.json
 *
 * 2. Run: npx ts-node scripts/seed.ts
 *
 * The script uses upsert operations to be idempotent (safe to run multiple times).
 * Make sure your .env.local has DATABASE_URL set to your Supabase connection string.
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// ============================================================================
// HELPER FUNCTIONS FOR LOADING JSON FILES
// ============================================================================

function loadJsonFile<T>(fileName: string): T {
  const filePath = path.join(process.cwd(), "data", fileName);
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`Failed to load ${fileName} from ${filePath}`);
    throw error;
  }
}

// ============================================================================
// SEED DATA SOURCES (LOADED AT RUNTIME)
// ============================================================================

interface IssueTaxonomyFile {
  issues: Array<{
    issue_code: string;
    issue_name: string;
    severity_default: string;
    description?: string;
    category?: string;
  }>;
}

interface InsightBlocksFile {
  insight_blocks: Array<{
    issue_code: string;
    icp: string;
    industries: string[];
    short_insight_line: string;
    longer_explainer: string;
    business_consequence: string;
    severity_hint: string;
    suitable_channels: string[];
    suitable_steps: number[];
    cta_pairings?: string[];
    cta_pairnings?: string[]; // Handle typo variant
    asset_pairings: string[];
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
    }>;
  }>;
}

interface PlaybookFile {
  playbook_entries: Array<{
    category: string;
    title: string;
    body_markdown: string;
  }>;
}

interface AssetsFile {
  assets: Array<{
    asset_name: string;
    asset_type: string;
    description?: string;
    funnel_stage_best: string;
    icp_fit: string[];
    issue_fit: string[];
    delivery_modes: string[];
    existing_url: string;
  }>;
}

// Load JSON files at script start
let issueClusterData: Array<{
  issueCode: string;
  issueName: string;
  description?: string;
  severityDefault: string;
  category?: string;
}> = [];

let insightBlockData: Array<{
  issueCode: string;
  icp: string;
  industries: string[];
  shortInsightLine: string;
  longerExplainer: string;
  businessConsequence: string;
  severityHint: string;
  suitableChannels: string[];
  suitableSteps: number[];
  ctaPairings: string[];
  assetPairings: string[];
  confidenceNotes: string;
}> = [];

let sequenceData: Array<{
  sequenceName: string;
  icp: string;
  issueCluster: string;
  priorityTier: string;
  channelMix: string[];
  ctaStrategy: string;
  assetStrategy: string;
  steps: Array<{
    stepNumber: number;
    dayOffset: number;
    channel: string;
    objective: string;
    angle: string;
    assetToInclude: string | null;
    personalizationRequiredFields: string[];
    sendWindow: string;
    fallbackBehavior: string;
  }>;
}> = [];

let playbookEntryData: Array<{
  category: string;
  title: string;
  bodyMarkdown: string;
}> = [];

let assetData: Array<{
  assetName: string;
  assetType: string;
  description?: string;
  funnelStageBest: string;
  icpFit: string[];
  issueFit: string[];
  deliveryModes: string[];
  existingUrl: string;
}> = [];

function initializeDataFromJsonFiles() {
  console.log("Loading JSON data files from ./data folder...\n");

  // Load issue taxonomy
  try {
    const issueTaxFile = loadJsonFile<IssueTaxonomyFile>("issue-taxonomy.json");
    issueClusterData = issueTaxFile.issues.map((issue) => ({
      issueCode: issue.issue_code,
      issueName: issue.issue_name,
      description: issue.description,
      severityDefault: issue.severity_default,
      category: issue.category,
    }));
    console.log(`✓ Loaded ${issueClusterData.length} issues from issue-taxonomy.json`);
  } catch (error) {
    console.error("Error loading issue-taxonomy.json:", error);
    throw error;
  }

  // Load insight blocks
  try {
    const insightFile = loadJsonFile<InsightBlocksFile>("insight-blocks.json");
    insightBlockData = insightFile.insight_blocks.map((block) => ({
      issueCode: block.issue_code,
      icp: block.icp,
      industries: block.industries,
      shortInsightLine: block.short_insight_line,
      longerExplainer: block.longer_explainer,
      businessConsequence: block.business_consequence,
      severityHint: block.severity_hint,
      suitableChannels: block.suitable_channels,
      suitableSteps: block.suitable_steps,
      ctaPairings: block.cta_pairings || block.cta_pairnings || [], // Handle typo variant
      assetPairings: block.asset_pairings,
      confidenceNotes: block.confidence_notes,
    }));
    console.log(`✓ Loaded ${insightBlockData.length} insight blocks from insight-blocks.json`);
  } catch (error) {
    console.error("Error loading insight-blocks.json:", error);
    throw error;
  }

  // Load sequences
  try {
    const seqFile = loadJsonFile<SequencesFile>("seed-sequences.json");
    sequenceData = seqFile.sequences.map((seq) => ({
      sequenceName: seq.sequence_name,
      icp: seq.icp,
      issueCluster: seq.issue_cluster,
      priorityTier: seq.priority_tier,
      channelMix: seq.channel_mix,
      ctaStrategy: seq.cta_strategy,
      assetStrategy: seq.asset_strategy,
      steps: seq.steps.map((step) => ({
        stepNumber: step.step_number,
        dayOffset: step.day_offset,
        channel: step.channel,
        objective: step.objective,
        angle: step.angle,
        assetToInclude: step.asset_to_include,
        personalizationRequiredFields: step.personalization_required_fields,
        sendWindow: step.send_window,
        fallbackBehavior: step.fallback_behavior,
      })),
    }));
    console.log(`✓ Loaded ${sequenceData.length} sequences from seed-sequences.json`);
  } catch (error) {
    console.error("Error loading seed-sequences.json:", error);
    throw error;
  }

  // Load playbook entries
  try {
    const playbookFile = loadJsonFile<PlaybookFile>("seed-playbook.json");
    playbookEntryData = playbookFile.playbook_entries.map((entry) => ({
      category: entry.category,
      title: entry.title,
      bodyMarkdown: entry.body_markdown,
    }));
    console.log(`✓ Loaded ${playbookEntryData.length} playbook entries from seed-playbook.json`);
  } catch (error) {
    console.error("Error loading seed-playbook.json:", error);
    throw error;
  }

  // Load assets
  try {
    const assetsFile = loadJsonFile<AssetsFile>("asset-matching-rules.json");
    assetData = assetsFile.assets.map((asset) => ({
      assetName: asset.asset_name,
      assetType: asset.asset_type,
      description: asset.description,
      funnelStageBest: asset.funnel_stage_best,
      icpFit: asset.icp_fit,
      issueFit: asset.issue_fit,
      deliveryModes: asset.delivery_modes,
      existingUrl: asset.existing_url,
    }));
    console.log(`✓ Loaded ${assetData.length} assets from asset-matching-rules.json\n`);
  } catch (error) {
    console.error("Error loading asset-matching-rules.json:", error);
    throw error;
  }
}

// ============================================================================
// HARDCODED PROSPECT DATA
// ============================================================================

const prospectData = [
  {
    issueCode: "HERO_TOO_GENERIC",
    issueName: "Hero Section Uses Vague Language",
    description:
      "Hero section communicates value but lacks specificity about what outcome the visitor will actually get. Common patterns: 'We deliver beautiful design', 'Expert design solutions', 'Design that works' — these don't answer 'Why should I care right now?'",
    severityDefault: "high",
    category: "messaging",
  },
  {
    issueCode: "CTA_TOO_SOFT",
    issueName: "CTA Exists But Isn't Outcome-Tied",
    description:
      "CTA button present but divorced from a clear next step or outcome. Common: 'Get Started', 'Learn More', 'Contact Us' without context of what happens next or what problem gets solved by clicking.",
    severityDefault: "high",
    category: "conversion",
  },
  {
    issueCode: "CTA_NOT_OUTCOME_TIED",
    issueName: "CTA Asks for Action Without Explaining Benefit",
    description:
      "Asks visitor to take an action (sign up, book call, submit info) without explaining what they'll get from it. No bridge between problem → action → result. Feels transactional rather than beneficial.",
    severityDefault: "high",
    category: "conversion",
  },
  {
    issueCode: "FEATURE_FIRST_MESSAGING",
    issueName: "Page Leads With Features/Process Before Outcome",
    description:
      "Page structure prioritizes how you work (our process, our team, our methodology) before establishing why the visitor should care. Delays addressing visitor's actual problem or desired outcome.",
    severityDefault: "high",
    category: "messaging",
  },
  {
    issueCode: "UNCLEAR_OFFER",
    issueName: "Visitor Can't Quickly Understand What You Deliver",
    description:
      "Within 10 seconds, the visitor cannot clearly articulate what the company does or what they'll get by working together. Confusion between service type, outcomes, and offering model.",
    severityDefault: "critical",
    category: "messaging",
  },
  {
    issueCode: "WEAK_ABOVE_FOLD_STRUCTURE",
    issueName: "Above-the-Fold Fails to Communicate Value Proposition",
    description:
      "The section that appears without scrolling doesn't establish a compelling reason to scroll further. Missing or weak: headline clarity, urgent signal, differentiation, reason to engage.",
    severityDefault: "high",
    category: "messaging",
  },
  {
    issueCode: "TOO_MANY_COMPETING_ELEMENTS",
    issueName: "Page Has Too Many Visual Elements Competing for Attention",
    description:
      "Homepage or key page shows too many features, sections, calls to action, or visual styles. Visitor attention fragments. No clear focal point. Everything feels equally important.",
    severityDefault: "medium",
    category: "visual",
  },
  {
    issueCode: "CLUTTERED_LAYOUT",
    issueName: "Layout Lacks Clear Visual Flow and Feels Overwhelming",
    description:
      "Visual hierarchy is weak. Text, images, whitespace don't guide eye flow. Sections feel disconnected. Page feels crowded even if there's technically enough whitespace. Navigation of page is confusing.",
    severityDefault: "medium",
    category: "visual",
  },
  {
    issueCode: "LOW_TRUST_SIGNAL_VISIBILITY",
    issueName: "Trust Signals Are Buried or Missing",
    description:
      "Logos, testimonials, certifications, case studies, or social proof are absent or placed in low-visibility areas (footer, buried below fold). Visitor has no easy way to build confidence in credibility.",
    severityDefault: "medium",
    category: "trust",
  },
  {
    issueCode: "WEAK_VISUAL_HIERARCHY",
    issueName: "No Clear Visual Priority Guiding the Eye",
    description:
      "Font sizes, colors, spacing, and contrast don't create a clear priority for what visitor should read first, second, third. Everything competes equally. Eye has nowhere natural to land.",
    severityDefault: "medium",
    category: "visual",
  },
  {
    issueCode: "POOR_MOBILE_READABILITY",
    issueName: "Content Hard to Read or Navigate on Mobile",
    description:
      "On mobile devices: text too small, buttons too hard to tap, layout breaks, images don't scale, CTAs buried. Navigation or critical content is difficult to access without zooming or horizontal scrolling.",
    severityDefault: "high",
    category: "mobile",
  },
  {
    issueCode: "HIGH_COGNITIVE_LOAD",
    issueName: "Page Requires Too Much Mental Effort to Process",
    description:
      "Visitor needs to synthesize too many concepts, read long paragraphs, or connect dots to understand value. Jargon or complex explanations without simplification. Decision fatigue sets in quickly.",
    severityDefault: "medium",
    category: "messaging",
  },
  {
    issueCode: "MISSING_SOCIAL_PROOF",
    issueName: "No Testimonials, Case Studies, Logos, or Results Shown",
    description:
      "Zero third-party validation. No customer names, quotes, case study results, client logos, or outcome numbers. Visitor has no evidence that you deliver what you claim.",
    severityDefault: "high",
    category: "trust",
  },
  {
    issueCode: "MISSING_SEGMENT_CLARITY",
    issueName: "Page Tries to Speak to Everyone Instead of a Specific Audience",
    description:
      "Messaging is so broad it could apply to any business. No indication that this company understands a specific customer type's problems. Visitor doesn't feel seen or understood.",
    severityDefault: "high",
    category: "messaging",
  },
  {
    issueCode: "FRICTION_HEAVY_NAVIGATION",
    issueName: "Navigation Creates Friction or Confusion in User Journey",
    description:
      "Visitor unclear on next step or path to take action. Menu structure confusing, next button placement unclear, or multiple competing paths create decision paralysis. Unclear how to progress.",
    severityDefault: "medium",
    category: "navigation",
  },
  {
    issueCode: "SLOW_DECISION_PATH",
    issueName: "Too Many Steps or Too Much Content Before User Can Take Action",
    description:
      "Visitor must read extensively or scroll through many sections before they encounter an actionable CTA. By then, attention has dropped. No early low-friction entry point to engage.",
    severityDefault: "high",
    category: "conversion",
  },
];

const insightBlockData = [
  {
    issueCode: "HERO_TOO_GENERIC",
    icp: "founder",
    industries: ["saas", "ecommerce", "professional_services"],
    shortInsightLine:
      "Your hero talks about what you do, but not why someone should care right now — that usually costs you the first 3 seconds of attention.",
    longerExplainer:
      "The visitor lands on your page. Your hero says something like 'We deliver beautiful, custom design' or 'Expert design solutions for growing companies.' But they still don't know if you solve their specific problem or what happens if they don't engage with you. Generic value propositions don't create urgency.",
    businessConsequence:
      "Cold or paid traffic may understand your service but won't feel urgency to act. Enquiries drop even when traffic is strong. Conversion rate stays flat regardless of traffic quality improvements.",
    severityHint: "high",
    suitableChannels: ["email", "linkedin"],
    suitableSteps: [1, 2],
    ctaPairings: [
      "Worth sending the breakdown?",
      "Open to seeing what I noticed?",
    ],
    assetPairings: ["analyser", "checklist"],
    confidenceNotes:
      "Strong pattern across SaaS and ecommerce founders with $50k-$500k ARR running paid campaigns.",
  },
  {
    issueCode: "HERO_TOO_GENERIC",
    icp: "marketing_manager",
    industries: ["saas", "b2b_tech"],
    shortInsightLine:
      "Your campaign landing pages sound like every other competitor. That sameness means visitors don't see why your offer is different.",
    longerExplainer:
      "Marketing managers often inherit campaign briefs that say 'Drive enterprise deals' or 'Increase qualified leads.' The landing page hero then reflects that generic goal instead of the specific outcome or urgency that separates you from competitors.",
    businessConsequence:
      "Conversion rate drops 20-35% when the value prop isn't clear in the first 3 seconds. Adding a clear, specific value prop improves conversion 15-30%.",
    severityHint: "high",
    suitableChannels: ["email", "slack"],
    suitableSteps: [1, 2],
    ctaPairings: [
      "Curious how your competitors frame it?",
      "Worth a 5-min review?",
    ],
    assetPairings: ["analyser", "brief_builder"],
    confidenceNotes:
      "Pattern appears in mid-market SaaS campaigns where traffic quality is strong but conversion rate lags industry benchmark.",
  },
  {
    issueCode: "HERO_TOO_GENERIC",
    icp: "agency",
    industries: ["agencies"],
    shortInsightLine:
      "Your agency portfolio site uses 'award-winning design' and 'strategic thinking' but doesn't show what clients actually achieved.",
    longerExplainer:
      "Agencies often lead with creative credibility (awards, case studies, team bios) before establishing what business outcomes they deliver. Prospective clients care about revenue impact, not awards.",
    businessConsequence:
      "Inbound leads from portfolio site are lower quality. Tire-kickers and budget shoppers outweigh high-value prospects. Sales team spends time on misaligned conversations.",
    severityHint: "high",
    suitableChannels: ["linkedin", "email"],
    suitableSteps: [1, 2],
    ctaPairings: ["Want to see what clients actually got?", "Open to a quick reframe?"],
    assetPairings: ["analyser", "checklist"],
    confidenceNotes:
      "Applies to full-service and specialized design agencies with $500k-$5m ARR competing for retainer contracts.",
  },
];

const sequenceData = [
  {
    sequenceName: "Founder — Homepage Clarity & Speed",
    icp: "founder",
    issueCluster: "HERO_TOO_GENERIC",
    priorityTier: "tier_1",
    channelMix: ["email", "linkedin", "email", "email", "linkedin"],
    ctaStrategy: "permission_seeking_then_discovery",
    assetStrategy: "hold_until_reply",
    steps: [
      {
        stepNumber: 1,
        dayOffset: 0,
        channel: "email",
        objective: "Open the conversation with observed signal",
        angle: "homepage_clarity_gap",
        assetToInclude: null,
        personalizationRequiredFields: [
          "company_name",
          "industry",
          "primary_issue_code",
          "strength_detected",
        ],
        sendWindow: "tue_thu_9am_11am",
        fallbackBehavior: "skip_if_no_email",
      },
      {
        stepNumber: 2,
        dayOffset: 3,
        channel: "linkedin",
        objective: "Reframe the issue as wasted revenue opportunity",
        angle: "revenue_opportunity_angle",
        assetToInclude: null,
        personalizationRequiredFields: ["industry"],
        sendWindow: "wed_fri_10am_2pm",
        fallbackBehavior: "send_if_no_email",
      },
      {
        stepNumber: 3,
        dayOffset: 5,
        channel: "email",
        objective: "Offer diagnostic tool and frame as speed/waste relief",
        angle: "operational_efficiency_angle",
        assetToInclude: "checklist",
        personalizationRequiredFields: ["company_name", "primary_pain_id"],
        sendWindow: "tue_thu_10am_12pm",
        fallbackBehavior: "skip_if_hard_no",
      },
      {
        stepNumber: 4,
        dayOffset: 7,
        channel: "email",
        objective: "Shift angle to operational cost and context-switching waste",
        angle: "team_velocity_angle",
        assetToInclude: null,
        personalizationRequiredFields: ["company_name"],
        sendWindow: "mon_fri_2pm_4pm",
        fallbackBehavior: "skip_if_hard_no",
      },
      {
        stepNumber: 5,
        dayOffset: 10,
        channel: "linkedin",
        objective: "Direct follow-up and nudge to reply",
        angle: "direct_nudge",
        assetToInclude: null,
        personalizationRequiredFields: ["first_name"],
        sendWindow: "wed_fri_11am_1pm",
        fallbackBehavior: "skip_if_replied",
      },
    ],
  },
];

const playbookEntryData = [
  {
    category: "daily_workflow",
    title: "Morning (9-11 AM): Insight & Audit",
    bodyMarkdown: `## Morning Workflow: Build Intelligence

**9:00 AM - 9:30 AM: Run Homepage Analysis on New Accounts**

Before you send anything, you need ammunition. Each morning, run 3-5 homepage audits on your new target accounts.

**9:30 AM - 10:30 AM: Craft Angles & Draft Outreach**

Write 2-3 angle variations per prospect. Pick the sharpest one.

**10:30 AM - 11:00 AM: Batch & Send**

Send all drafts in a 30-minute window. Peak sending windows: 10:30-11:00 AM on Tue-Thu, 9:00-9:30 AM on Wed-Fri.`,
  },
  {
    category: "daily_workflow",
    title: "Midday (12-2 PM): Monitoring & First Replies",
    bodyMarkdown: `## Midday Workflow: Monitoring & First Replies

**12:00 PM - 12:30 PM: Check First Replies & Engagement**

Monitor inbound replies to your morning sends.

**12:30 PM - 1:30 PM: Craft First-Reply Responses**

Reply to positive signals quickly. Use brief builder or calculator as follow-up asset.

**1:30 PM - 2:00 PM: Check Calendar & Prep for Afternoon**

Review booked calls and prep notes for any conversations scheduled.`,
  },
  {
    category: "daily_workflow",
    title: "Afternoon (2-5 PM): Follow-up & Nurture",
    bodyMarkdown: `## Afternoon Workflow: Follow-up & Nurture

**2:00 PM - 2:30 PM: Day 2-3 Follow-ups**

Send day 2-3 follow-ups to non-responders from previous days.

**2:30 PM - 3:30 PM: Asset Sequencing for Warm Leads**

For prospects showing engagement, sequence assets: calculator, brief builder, case study.

**3:30 PM - 5:00 PM: Document Learnings & Optimize**

Logging: note angles that worked, assets that converted, objections encountered. Update playbook angles as needed.`,
  },
];

const assetData = [
  {
    assetName: "Homepage Analyser",
    assetType: "analyser",
    description:
      "Automated audit of homepage messaging, clarity, trust signals, and conversion elements. Returns specific findings with before/after recommendations.",
    funnelStageBest: "cold",
    icpFit: ["founder", "marketing_manager", "agency"],
    issueFit: [
      "HERO_TOO_GENERIC",
      "CTA_TOO_SOFT",
      "CTA_NOT_OUTCOME_TIED",
      "UNCLEAR_OFFER",
      "WEAK_ABOVE_FOLD_STRUCTURE",
      "MISSING_SOCIAL_PROOF",
      "MISSING_SEGMENT_CLARITY",
    ],
    deliveryModes: ["summary", "link", "screenshot"],
    existingUrl: "https://designbees.com.au/analyser",
  },
  {
    assetName: "Brief Builder",
    assetType: "brief_builder",
    description:
      "Interactive tool that guides users through creating a tighter, more specific creative brief. Outputs a structured 3-5 field brief that reduces revision cycles.",
    funnelStageBest: "positive_reply",
    icpFit: ["founder", "marketing_manager", "agency"],
    issueFit: [
      "CTA_NOT_OUTCOME_TIED",
      "FEATURE_FIRST_MESSAGING",
      "HIGH_COGNITIVE_LOAD",
      "FRICTION_HEAVY_NAVIGATION",
    ],
    deliveryModes: ["link", "embedded"],
    existingUrl: "https://designbees.com.au/brief-builder",
  },
  {
    assetName: "ROI Calculator",
    assetType: "calculator",
    description:
      "Quantifies business impact of design bottlenecks. Inputs: current production time, number of projects/campaigns, hourly team cost. Outputs: annual cost of inefficiency, potential revenue unlock.",
    funnelStageBest: "warm",
    icpFit: ["founder", "marketing_manager", "agency"],
    issueFit: [
      "SLOW_DECISION_PATH",
      "FEATURE_FIRST_MESSAGING",
      "CTA_NOT_OUTCOME_TIED",
    ],
    deliveryModes: ["link", "summary"],
    existingUrl: "https://designbees.com.au/calculator",
  },
  {
    assetName: "Conversion Checklist",
    assetType: "checklist",
    description:
      "6-16 item diagnostic checklist across messaging, trust, clarity, CTA, mobile, conversion path. Self-assessment format.",
    funnelStageBest: "cold",
    icpFit: ["founder", "marketing_manager", "agency"],
    issueFit: [
      "HERO_TOO_GENERIC",
      "CTA_TOO_SOFT",
      "WEAK_VISUAL_HIERARCHY",
      "MISSING_SOCIAL_PROOF",
      "MISSING_SEGMENT_CLARITY",
      "TOO_MANY_COMPETING_ELEMENTS",
      "CLUTTERED_LAYOUT",
      "LOW_TRUST_SIGNAL_VISIBILITY",
      "FRICTION_HEAVY_NAVIGATION",
    ],
    deliveryModes: ["pdf", "link"],
    existingUrl: "https://designbees.com.au/checklist",
  },
];

// CSV Data: Real prospects from real-prospects.csv
const prospectData = [
  {
    company_name: "Margin Media",
    domain: "margin.media",
    website_url: "https://margin.media",
    industry: "Marketing Services",
    employee_count_band: "1-10",
    geography: "Brisbane, QLD",
    source: "apollo_enrichment",
    ICP_type: "agency",
    priority_tier: "tier_1",
    first_name: "Mat",
    last_name: "Lewis",
    job_title: "Managing Director",
    seniority: "c_level",
    linkedin_url: "https://www.linkedin.com/in/mathewalewis/",
    notes: "",
  },
  {
    company_name: "Arcadian Digital",
    domain: "arcadiandigital.com.au",
    website_url: "https://arcadiandigital.com.au",
    industry: "IT Services",
    employee_count_band: "11-50",
    geography: "Melbourne, VIC",
    source: "apollo_enrichment",
    ICP_type: "agency",
    priority_tier: "tier_2",
    first_name: "Adrian",
    last_name: "Randall",
    job_title: "Director",
    seniority: "director",
    linkedin_url: "https://www.linkedin.com/in/adrian-randall-0b6a061a/",
    notes: "",
  },
  {
    company_name: "TFM Digital",
    domain: "tfm.digital",
    website_url: "https://tfm.digital",
    industry: "Advertising Services",
    employee_count_band: "11-50",
    geography: "Brisbane/Sydney",
    source: "apollo_enrichment",
    ICP_type: "agency",
    priority_tier: "tier_2",
    first_name: "Taylor",
    last_name: "Fielding",
    job_title: "CEO",
    seniority: "c_level",
    linkedin_url: "https://www.linkedin.com/in/taylor-fielding-88027554/",
    notes: "",
  },
  {
    company_name: "TFM Digital",
    domain: "tfm.digital",
    website_url: "https://tfm.digital",
    industry: "Advertising Services",
    employee_count_band: "11-50",
    geography: "Brisbane/Sydney",
    source: "apollo_enrichment",
    ICP_type: "agency",
    priority_tier: "tier_2",
    first_name: "Mathew",
    last_name: "Fielding",
    job_title: "Financial + Growth Director",
    seniority: "director",
    linkedin_url: "https://www.linkedin.com/in/mathewjoudo/",
    notes: "",
  },
  {
    company_name: "Digital Nomads HQ",
    domain: "digitalnomadshq.com.au",
    website_url: "https://digitalnomadshq.com.au",
    industry: "Advertising Services",
    employee_count_band: "11-50",
    geography: "Sunshine Coast, QLD",
    source: "apollo_enrichment",
    ICP_type: "agency",
    priority_tier: "tier_2",
    first_name: "Benjamin",
    last_name: "Paine",
    job_title: "Managing Director",
    seniority: "c_level",
    linkedin_url: "https://www.linkedin.com/in/benjamin-paine/",
    notes: "",
  },
  {
    company_name: "Clearwater Agency",
    domain: "clearwateragency.com.au",
    website_url: "https://clearwateragency.com.au",
    industry: "Advertising Services",
    employee_count_band: "11-50",
    geography: "Melbourne, VIC",
    source: "apollo_enrichment",
    ICP_type: "agency",
    priority_tier: "tier_2",
    first_name: "Glenn",
    last_name: "Lockwood",
    job_title: "Founder",
    seniority: "c_level",
    linkedin_url: "https://www.linkedin.com/in/glennlockwood/",
    notes: "",
  },
  {
    company_name: "Soup Agency",
    domain: "soupagency.com.au",
    website_url: "https://soupagency.com.au",
    industry: "Advertising Services",
    employee_count_band: "11-50",
    geography: "Sydney, NSW",
    source: "apollo_enrichment",
    ICP_type: "agency",
    priority_tier: "tier_2",
    first_name: "Katya",
    last_name: "Vakulenko",
    job_title: "Founder/Managing Director",
    seniority: "c_level",
    linkedin_url: "https://www.linkedin.com/in/katyavakulenko/",
    notes: "",
  },
  {
    company_name: "Soup Agency",
    domain: "soupagency.com.au",
    website_url: "https://soupagency.com.au",
    industry: "Advertising Services",
    employee_count_band: "11-50",
    geography: "Sydney, NSW",
    source: "apollo_enrichment",
    ICP_type: "agency",
    priority_tier: "tier_2",
    first_name: "Danny",
    last_name: "Halim",
    job_title: "Digital Director",
    seniority: "director",
    linkedin_url: "https://www.linkedin.com/in/audannyhalim/",
    notes: "",
  },
  {
    company_name: "Salt & Fuessel",
    domain: "saltandfuessel.com.au",
    website_url: "https://saltandfuessel.com.au",
    industry: "Advertising Services",
    employee_count_band: "11-50",
    geography: "Melbourne, VIC",
    source: "apollo_enrichment",
    ICP_type: "agency",
    priority_tier: "tier_2",
    first_name: "Gabriel",
    last_name: "Esseesse",
    job_title: "Director",
    seniority: "director",
    linkedin_url: "https://www.linkedin.com/in/gabrielesseesse/",
    notes: "",
  },
  {
    company_name: "Salt & Fuessel",
    domain: "saltandfuessel.com.au",
    website_url: "https://saltandfuessel.com.au",
    industry: "Advertising Services",
    employee_count_band: "11-50",
    geography: "Melbourne, VIC",
    source: "apollo_enrichment",
    ICP_type: "agency",
    priority_tier: "tier_2",
    first_name: "Richard",
    last_name: "Fuessel",
    job_title: "Director",
    seniority: "director",
    linkedin_url: "https://www.linkedin.com/in/richard-fuessel-16982412/",
    notes: "",
  },
  {
    company_name: "SIXGUN",
    domain: "sixgun.com.au",
    website_url: "https://sixgun.com.au",
    industry: "Advertising Services",
    employee_count_band: "11-50",
    geography: "Melbourne, VIC",
    source: "apollo_enrichment",
    ICP_type: "agency",
    priority_tier: "tier_2",
    first_name: "David",
    last_name: "Pagotto",
    job_title: "Founder & Managing Director",
    seniority: "c_level",
    linkedin_url: "https://www.linkedin.com/in/david-pagotto-b8903095/",
    notes: "",
  },
  {
    company_name: "Showpo",
    domain: "showpo.com",
    website_url: "https://showpo.com",
    industry: "Retail/Fashion ecommerce",
    employee_count_band: "51-200",
    geography: "Sydney, NSW",
    source: "apollo_enrichment",
    ICP_type: "marketing_manager",
    priority_tier: "tier_2",
    first_name: "Christina",
    last_name: "Spinoulas",
    job_title: "Marketing Manager",
    seniority: "manager",
    linkedin_url: "https://www.linkedin.com/in/christina-spinoulas-147a79147/",
    notes: "",
  },
  {
    company_name: "Brighte",
    domain: "brighte.com.au",
    website_url: "https://brighte.com.au",
    industry: "Financial Services/Clean Energy",
    employee_count_band: "51-200",
    geography: "Sydney, NSW",
    source: "apollo_enrichment",
    ICP_type: "marketing_manager",
    priority_tier: "tier_2",
    first_name: "Dean",
    last_name: "Lakoudis",
    job_title: "Senior Marketing Manager",
    seniority: "senior",
    linkedin_url: "https://www.linkedin.com/in/dean-lakoudis-48929197/",
    notes: "",
  },
  {
    company_name: "Brighte",
    domain: "brighte.com.au",
    website_url: "https://brighte.com.au",
    industry: "Financial Services/Clean Energy",
    employee_count_band: "51-200",
    geography: "Sydney, NSW",
    source: "apollo_enrichment",
    ICP_type: "marketing_manager",
    priority_tier: "tier_2",
    first_name: "Nazli",
    last_name: "Igdeci",
    job_title: "B2B Marketing Manager",
    seniority: "manager",
    linkedin_url: "https://www.linkedin.com/in/nazliigdeci/",
    notes: "",
  },
  {
    company_name: "Sendle",
    domain: "sendle.com",
    website_url: "https://sendle.com",
    industry: "Logistics/Shipping",
    employee_count_band: "51-200",
    geography: "Sydney, NSW",
    source: "apollo_enrichment",
    ICP_type: "marketing_manager",
    priority_tier: "tier_2",
    first_name: "",
    last_name: "",
    job_title: "",
    seniority: "",
    linkedin_url: "",
    notes: "Need to find marketing contact",
  },
  {
    company_name: "Frank Body",
    domain: "frankbody.com",
    website_url: "https://frankbody.com",
    industry: "Beauty/ecommerce",
    employee_count_band: "11-50",
    geography: "Melbourne, VIC",
    source: "apollo_enrichment",
    ICP_type: "founder",
    priority_tier: "tier_1",
    first_name: "Steve",
    last_name: "Rowley",
    job_title: "Co-Founder",
    seniority: "c_level",
    linkedin_url: "https://www.linkedin.com/in/steve-rowley-frankbody/",
    notes: "DTC beauty brand, heavy design needs for social and packaging",
  },
  {
    company_name: "Culture Kings",
    domain: "culturekings.com.au",
    website_url: "https://culturekings.com.au",
    industry: "Streetwear/Retail",
    employee_count_band: "51-200",
    geography: "Gold Coast, QLD",
    source: "apollo_enrichment",
    ICP_type: "founder",
    priority_tier: "tier_2",
    first_name: "",
    last_name: "",
    job_title: "",
    seniority: "",
    linkedin_url: "",
    notes: "Fast-growing streetwear retailer, needs campaign assets at volume. Needs enrichment",
  },
  {
    company_name: "Pedestrian Group",
    domain: "pedestriangroup.com.au",
    website_url: "https://pedestriangroup.com.au",
    industry: "Media/Publishing",
    employee_count_band: "11-50",
    geography: "Sydney, NSW",
    source: "apollo_enrichment",
    ICP_type: "founder",
    priority_tier: "tier_1",
    first_name: "",
    last_name: "",
    job_title: "",
    seniority: "",
    linkedin_url: "",
    notes: "Digital publisher, content-heavy brand. Needs enrichment",
  },
  {
    company_name: "Deputy",
    domain: "deputy.com",
    website_url: "https://deputy.com",
    industry: "Workforce Management SaaS",
    employee_count_band: "51-200",
    geography: "Sydney, NSW",
    source: "apollo_enrichment",
    ICP_type: "founder",
    priority_tier: "tier_2",
    first_name: "",
    last_name: "",
    job_title: "",
    seniority: "",
    linkedin_url: "",
    notes: "SaaS company with growing marketing needs. Needs enrichment",
  },
  {
    company_name: "Eucalyptus",
    domain: "eucalyptus.vc",
    website_url: "https://eucalyptus.vc",
    industry: "Health/DTC",
    employee_count_band: "51-200",
    geography: "Sydney, NSW",
    source: "apollo_enrichment",
    ICP_type: "founder",
    priority_tier: "tier_2",
    first_name: "",
    last_name: "",
    job_title: "",
    seniority: "",
    linkedin_url: "",
    notes: "Telehealth company running multiple consumer brands. Needs enrichment",
  },
];

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function seedIssueClusters() {
  console.log("Seeding issue clusters...");
  let count = 0;
  for (const issue of issueClusterData) {
    await prisma.issueCluster.upsert({
      where: { issueCode: issue.issueCode },
      update: {
        issueName: issue.issueName,
        description: issue.description,
        severityDefault: issue.severityDefault,
        category: issue.category,
      },
      create: {
        issueCode: issue.issueCode,
        issueName: issue.issueName,
        description: issue.description,
        severityDefault: issue.severityDefault,
        category: issue.category,
      },
    });
    count++;
  }
  console.log(`✓ Seeded ${count} issue clusters`);
}

async function seedInsightBlocks() {
  console.log("Seeding insight blocks...");
  let count = 0;
  for (const block of insightBlockData) {
    await prisma.insightBlock.create({
      data: {
        issueCode: block.issueCode,
        icp: block.icp,
        industries: block.industries as any,
        shortInsightLine: block.shortInsightLine,
        longerExplainer: block.longerExplainer,
        businessConsequence: block.businessConsequence,
        severityHint: block.severityHint,
        suitableChannels: block.suitableChannels as any,
        suitableSteps: block.suitableSteps as any,
        ctaPairings: block.ctaPairings as any,
        assetPairings: block.assetPairings as any,
        confidenceNotes: block.confidenceNotes,
      },
    });
    count++;
  }
  console.log(`✓ Seeded ${count} insight blocks`);
}

async function seedSequences() {
  console.log("Seeding sequences...");
  let sequenceCount = 0;
  let stepCount = 0;

  for (const seq of sequenceData) {
    const { steps, ...sequenceFields } = seq;

    const createdSeq = await prisma.sequence.upsert({
      where: { sequenceName: seq.sequenceName },
      update: {
        icp: sequenceFields.icp,
        issueCluster: sequenceFields.issueCluster,
        priorityTier: sequenceFields.priorityTier,
        channelMix: sequenceFields.channelMix as any,
        ctaStrategy: sequenceFields.ctaStrategy,
        assetStrategy: sequenceFields.assetStrategy,
      },
      create: {
        sequenceName: sequenceFields.sequenceName,
        icp: sequenceFields.icp,
        issueCluster: sequenceFields.issueCluster,
        priorityTier: sequenceFields.priorityTier,
        channelMix: sequenceFields.channelMix as any,
        ctaStrategy: sequenceFields.ctaStrategy,
        assetStrategy: sequenceFields.assetStrategy,
      },
    });
    sequenceCount++;

    // Delete existing steps for this sequence, then create new ones
    await prisma.sequenceStep.deleteMany({
      where: { sequenceId: createdSeq.id },
    });

    for (const step of steps) {
      await prisma.sequenceStep.create({
        data: {
          sequenceId: createdSeq.id,
          stepNumber: step.stepNumber,
          dayOffset: step.dayOffset,
          channel: step.channel,
          objective: step.objective,
          angle: step.angle,
          assetToInclude: step.assetToInclude,
          personalizationRequiredFields:
            step.personalizationRequiredFields as any,
          sendWindow: step.sendWindow,
          fallbackBehavior: step.fallbackBehavior,
        },
      });
      stepCount++;
    }
  }
  console.log(
    `✓ Seeded ${sequenceCount} sequences and ${stepCount} sequence steps`
  );
}

async function seedPlaybookEntries() {
  console.log("Seeding playbook entries...");
  let count = 0;
  for (const entry of playbookEntryData) {
    await prisma.playbookEntry.upsert({
      where: { title: entry.title },
      update: {
        category: entry.category,
        bodyMarkdown: entry.bodyMarkdown,
      },
      create: {
        category: entry.category,
        title: entry.title,
        bodyMarkdown: entry.bodyMarkdown,
      },
    });
    count++;
  }
  console.log(`✓ Seeded ${count} playbook entries`);
}

async function seedAssets() {
  console.log("Seeding assets...");
  let count = 0;
  for (const asset of assetData) {
    await prisma.asset.upsert({
      where: { assetName: asset.assetName },
      update: {
        assetType: asset.assetType,
        description: asset.description,
        funnelStageBest: asset.funnelStageBest,
        icpFit: asset.icpFit as any,
        issueFit: asset.issueFit as any,
        deliveryModes: asset.deliveryModes as any,
        existingUrl: asset.existingUrl,
      },
      create: {
        assetName: asset.assetName,
        assetType: asset.assetType,
        description: asset.description,
        funnelStageBest: asset.funnelStageBest,
        icpFit: asset.icpFit as any,
        issueFit: asset.issueFit as any,
        deliveryModes: asset.deliveryModes as any,
        existingUrl: asset.existingUrl,
      },
    });
    count++;
  }
  console.log(`✓ Seeded ${count} assets`);
}

async function seedAccountsAndContacts() {
  console.log("Seeding accounts and contacts...");

  // Get or create owner (use first user or a default UUID)
  let ownerId: string;
  try {
    const existingUser = await prisma.user.findFirst();
    if (existingUser) {
      ownerId = existingUser.id;
    } else {
      // If no users exist, we need to create one or use a placeholder
      // For now, create a default user
      const defaultUser = await prisma.user.create({
        data: {
          email: "aj@designbees.com.au",
          name: "AJ",
        },
      });
      ownerId = defaultUser.id;
    }
  } catch (error) {
    // If user table doesn't exist or has issues, use a hardcoded UUID
    ownerId = "00000000-0000-0000-0000-000000000001";
  }

  // Deduplicate accounts by domain
  const accountMap = new Map();
  for (const prospect of prospectData) {
    if (!accountMap.has(prospect.domain)) {
      accountMap.set(prospect.domain, []);
    }
    accountMap.get(prospect.domain).push(prospect);
  }

  let accountCount = 0;
  let contactCount = 0;

  // Create accounts and contacts
  for (const [domain, prospects] of accountMap) {
    const firstProspect = prospects[0];

    const account = await prisma.account.upsert({
      where: { domain: domain },
      update: {
        companyName: firstProspect.company_name,
        websiteUrl: firstProspect.website_url,
        industry: firstProspect.industry,
        employeeBand: firstProspect.employee_count_band,
        geography: firstProspect.geography,
        icpType: firstProspect.ICP_type,
        priorityTier: firstProspect.priority_tier,
        source: firstProspect.source,
      },
      create: {
        companyName: firstProspect.company_name,
        domain: domain,
        websiteUrl: firstProspect.website_url,
        industry: firstProspect.industry,
        employeeBand: firstProspect.employee_count_band,
        geography: firstProspect.geography,
        icpType: firstProspect.ICP_type,
        priorityTier: firstProspect.priority_tier,
        source: firstProspect.source,
        sourceDetail: firstProspect.notes || undefined,
        ownerId: ownerId,
      },
    });
    accountCount++;

    // Create contacts for this account
    for (const prospect of prospects) {
      // Skip if no contact info
      if (!prospect.first_name && !prospect.last_name && !prospect.linkedin_url)
        continue;

      const fullName = prospect.first_name
        ? `${prospect.first_name} ${prospect.last_name}`.trim()
        : undefined;

      await prisma.contact.upsert({
        where: {
          linkedinUrl: prospect.linkedin_url || `contact_${prospect.domain}_${prospect.first_name}`,
        },
        update: {
          firstName: prospect.first_name || undefined,
          lastName: prospect.last_name || undefined,
          fullName: fullName,
          jobTitle: prospect.job_title || undefined,
          seniority: prospect.seniority || undefined,
          notes: prospect.notes || undefined,
        },
        create: {
          accountId: account.id,
          firstName: prospect.first_name || undefined,
          lastName: prospect.last_name || undefined,
          fullName: fullName,
          jobTitle: prospect.job_title || undefined,
          seniority: prospect.seniority || undefined,
          linkedinUrl: prospect.linkedin_url || undefined,
          contactSource: prospect.source,
          outreachStatus: "new",
          notes: prospect.notes || undefined,
        },
      });
      contactCount++;
    }
  }

  console.log(`✓ Seeded ${accountCount} accounts and ${contactCount} contacts`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  try {
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log(
      "║  Design Bees Outbound Revenue Engine - Database Seed  ║"
    );
    console.log("╚════════════════════════════════════════════════════════╝\n");

    // Initialize data from JSON files
    initializeDataFromJsonFiles();

    await seedIssueClusters();
    await seedInsightBlocks();
    await seedSequences();
    await seedPlaybookEntries();
    await seedAssets();
    await seedAccountsAndContacts();

    console.log(
      "\n✓ Database seeding complete! Your Outbound Revenue Engine is ready.\n"
    );
  } catch (error) {
    console.error("\n✗ Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
