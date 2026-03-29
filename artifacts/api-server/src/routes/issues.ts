import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { analysesTable, insightBlocksTable, sequencesTable } from "@workspace/db/schema";
import { eq, or, sql, count } from "drizzle-orm";

const router: IRouter = Router();

export const ISSUE_CLUSTERS = [
  { code: "unclear_cta", name: "Unclear Call-to-Action", description: "The primary CTA is not prominent, action-oriented, or easy to find above the fold.", severity: "high", category: "conversion" },
  { code: "weak_hero", name: "Weak Hero Section", description: "The hero fails to communicate the core value proposition within 3 seconds of arrival.", severity: "high", category: "messaging" },
  { code: "missing_trust_signals", name: "Missing Trust Signals", description: "No social proof, testimonials, case studies, or credibility indicators are visible.", severity: "high", category: "trust" },
  { code: "poor_visual_hierarchy", name: "Poor Visual Hierarchy", description: "Content lacks a clear reading path; the eye has no obvious direction to follow.", severity: "medium", category: "design" },
  { code: "weak_cta", name: "Weak CTA Copy", description: "CTA button text is generic (e.g. 'Submit', 'Click Here') with no value or urgency.", severity: "high", category: "conversion" },
  { code: "missing_outcome_clarity", name: "Missing Outcome Clarity", description: "Visitors cannot tell what result or transformation they will get by becoming a customer.", severity: "high", category: "messaging" },
  { code: "high_friction", name: "High Friction", description: "Too many form fields, steps, or barriers between intent and action.", severity: "medium", category: "ux" },
  { code: "poor_mobile_readability", name: "Poor Mobile Readability", description: "Text is too small, layout breaks, or content is inaccessible on mobile devices.", severity: "medium", category: "design" },
  { code: "weak_message_order", name: "Weak Message Order", description: "The page leads with features or company story rather than problem/outcome narrative.", severity: "medium", category: "messaging" },
  { code: "unclear_value_prop", name: "Unclear Value Proposition", description: "It's not immediately obvious what makes this company different from competitors.", severity: "high", category: "messaging" },
  { code: "missing_social_proof", name: "Missing Social Proof", description: "No logos, reviews, ratings, or case study links to build confidence.", severity: "medium", category: "trust" },
  { code: "poor_cta_prominence", name: "Poor CTA Prominence", description: "CTA button is undersized, low contrast, or hidden in the page layout.", severity: "medium", category: "conversion" },
  { code: "generic_messaging", name: "Generic Messaging", description: "Copy speaks to 'everyone' and therefore resonates with no specific audience segment.", severity: "high", category: "messaging" },
  { code: "no_specific_audience", name: "No Specific Audience Callout", description: "The page doesn't identify who it is for, causing visitors to self-select out.", severity: "medium", category: "messaging" },
  { code: "missing_urgency", name: "Missing Urgency / FOMO", description: "No time-limited offer, scarcity signal, or reason to act now rather than later.", severity: "low", category: "conversion" },
  { code: "weak_trust", name: "Weak Trust Indicators", description: "Trust signals exist but are not prominent, specific, or persuasive enough.", severity: "medium", category: "trust" },
];

router.get("/issues", async (req, res) => {
  try {
    const analyses = await db.select({
      primaryIssueCode: analysesTable.primaryIssueCode,
      secondaryIssueCode: analysesTable.secondaryIssueCode,
    }).from(analysesTable);

    const countMap: Record<string, number> = {};
    for (const a of analyses) {
      if (a.primaryIssueCode) countMap[a.primaryIssueCode] = (countMap[a.primaryIssueCode] || 0) + 1;
      if (a.secondaryIssueCode) countMap[a.secondaryIssueCode] = (countMap[a.secondaryIssueCode] || 0) + 1;
    }

    const clusters = ISSUE_CLUSTERS.map(c => ({
      ...c,
      accountCount: countMap[c.code] || 0,
    }));

    res.json({ data: clusters });
  } catch (err) {
    req.log.error({ err }, "listIssues error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/issues/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const cluster = ISSUE_CLUSTERS.find(c => c.code === code);
    if (!cluster) {
      res.status(404).json({ error: "not_found", message: `No issue cluster found for code: ${code}` });
      return;
    }

    const matchingAnalyses = await db
      .select()
      .from(analysesTable)
      .where(
        or(
          eq(analysesTable.primaryIssueCode, code),
          eq(analysesTable.secondaryIssueCode, code)
        )
      );

    const accountIds = [...new Set(matchingAnalyses.map(a => a.accountId).filter(Boolean))];

    const insights = await db.select().from(insightBlocksTable).limit(5);
    const sequences = await db.select().from(sequencesTable).limit(5);

    const stats = {
      totalAccounts: accountIds.length,
      positiveReplies: 0,
      bookedCalls: 0,
    };

    res.json({
      data: {
        ...cluster,
        accountCount: accountIds.length,
        accountIds,
        analyses: matchingAnalyses,
        recommendedInsights: insights,
        recommendedSequences: sequences,
        stats,
      }
    });
  } catch (err) {
    req.log.error({ err }, "getIssue error");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
