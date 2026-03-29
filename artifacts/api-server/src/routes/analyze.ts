import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { analysesTable, accountsTable, settingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const ANALYSER_BASE_URL = "https://striking-prosperity-production-b017.up.railway.app/api";

function computeDerivedFields(account: {
  priorityTier?: string | null;
  fitScore?: number | null;
  likelyPrimaryProblem?: string | null;
  icpType?: string | null;
}) {
  const priorityTier = account.priorityTier;
  const fitScore = account.fitScore ?? 0;
  const issue = account.likelyPrimaryProblem;
  const icp = account.icpType;

  let personalizationLevel = "generic";
  if (priorityTier === "strategic") personalizationLevel = "high_touch";
  else if (fitScore >= 75) personalizationLevel = "moderate";

  let suggestedSequenceFamily: string | null = null;
  if (issue && ["unclear_cta", "weak_cta", "poor_cta_prominence", "CTA_TOO_SOFT", "CTA_NOT_OUTCOME_TIED"].includes(issue)) {
    suggestedSequenceFamily = "cta_clarity_sequence";
  } else if (issue && ["missing_trust_signals", "weak_trust", "missing_social_proof", "MISSING_SOCIAL_PROOF", "LOW_TRUST_SIGNAL_VISIBILITY"].includes(issue)) {
    suggestedSequenceFamily = "trust_building_sequence";
  } else if (icp === "saas_founder") {
    suggestedSequenceFamily = "founder_focused_sequence";
  } else if (icp === "design_agency") {
    suggestedSequenceFamily = "design_agency_sequence";
  } else if (priorityTier === "strategic") {
    suggestedSequenceFamily = "high_touch_sequence";
  }

  return { personalizationLevel, suggestedSequenceFamily };
}

function mapToIssueCode(finding: any): string {
  if (!finding) return "WEAK_ABOVE_FOLD_STRUCTURE";
  const category = finding.category || "";
  const title = (finding.title || "").toLowerCase();

  if (category === "Value Proposition") {
    if (title.includes("vague") || title.includes("generic") || title.includes("unclear")) return "HERO_TOO_GENERIC";
    if (title.includes("offer") || title.includes("buries") || title.includes("anchor")) return "UNCLEAR_OFFER";
    if (title.includes("feature") || title.includes("process before")) return "FEATURE_FIRST_MESSAGING";
    return "WEAK_ABOVE_FOLD_STRUCTURE";
  }
  if (category === "CTA Effectiveness") {
    if (title.includes("competing") || title.includes("dilute") || title.includes("multiple")) return "TOO_MANY_COMPETING_ELEMENTS";
    if (title.includes("outcome") || title.includes("dead end") || title.includes("no form")) return "CTA_NOT_OUTCOME_TIED";
    return "CTA_TOO_SOFT";
  }
  if (category === "Social Proof") {
    if (title.includes("trust") || title.includes("badge") || title.includes("credibility")) return "LOW_TRUST_SIGNAL_VISIBILITY";
    return "MISSING_SOCIAL_PROOF";
  }
  if (category === "Pricing Clarity") {
    if (title.includes("comparison") || title.includes("differentiation")) return "SLOW_DECISION_PATH";
    return "HIGH_COGNITIVE_LOAD";
  }
  if (category === "Feature Communication") {
    if (title.includes("hierarchy")) return "WEAK_VISUAL_HIERARCHY";
    if (title.includes("cluttered") || title.includes("unclear")) return "CLUTTERED_LAYOUT";
    return "FEATURE_FIRST_MESSAGING";
  }
  if (title.includes("mobile") || title.includes("responsive")) return "POOR_MOBILE_READABILITY";
  if (title.includes("navigation") || title.includes("friction")) return "FRICTION_HEAVY_NAVIGATION";
  if (title.includes("segment") || title.includes("audience")) return "MISSING_SEGMENT_CLARITY";
  if (title.includes("cognitive") || title.includes("overwhelming")) return "HIGH_COGNITIVE_LOAD";
  return "WEAK_ABOVE_FOLD_STRUCTURE";
}

function getTopWeakness(findings: any[], rank: number): any {
  const weaknesses = (findings || []).filter((f: any) => f.type === "weakness");
  return weaknesses[rank - 1] || null;
}

function findCategoryScore(scores: any[], name: string): number {
  const s = (scores || []).find((c: any) => c.name === name);
  return s ? Math.round(s.score) : 0;
}

function mapApiResultToRecord(result: any, accountId: string, baseUrl: string) {
  const findings = result.findings || [];
  const scores = result.scores || [];

  const w1 = getTopWeakness(findings, 1);
  const w2 = getTopWeakness(findings, 2);
  const w3 = getTopWeakness(findings, 3);

  const vpScore = findCategoryScore(scores, "Value Proposition");
  const ctaScore = findCategoryScore(scores, "CTA Effectiveness");
  const spScore = findCategoryScore(scores, "Social Proof");
  const fcScore = findCategoryScore(scores, "Feature Communication");

  const screenshotRelative = result.screenshotUrl || null;
  const screenshotUrl = screenshotRelative
    ? `${baseUrl}${screenshotRelative.replace("/api", "")}`
    : null;

  return {
    accountId,
    domain: new URL(result.url).hostname.replace("www.", ""),
    pageUrl: result.url,
    pageType: result.pageIntent || "Homepage",
    pageIntent: result.pageIntent || null,
    status: "completed" as const,
    analyzedAt: result.completedAt ? new Date(result.completedAt) : new Date(),

    heroClarity: vpScore,
    ctaClarity: ctaScore,
    ctaProminence: ctaScore,
    visualHierarchy: fcScore,
    messageOrder: fcScore,
    outcomeClarity: vpScore,
    trustSignal: spScore,
    friction: Math.max(0, 100 - (result.overallScore || 50)),
    mobileReadability: null as any,

    primaryIssueCode: w1 ? mapToIssueCode(w1) : null,
    secondaryIssueCode: w2 ? mapToIssueCode(w2) : null,
    tertiaryIssueCode: w3 ? mapToIssueCode(w3) : null,

    issueSummaryShort: result.summary || null,
    issueSummaryDetailed: result.summary || null,
    strengthsDetected: findings.filter((f: any) => f.type === "strength").map((f: any) => f.title),
    recommendedPriorityFix: w1?.suggestion || null,
    confidenceScore: Math.round(result.overallScore || 0),

    findings: findings,
    categoryScores: scores,
    rawNotes: result,
    screenshotUrl,
  };
}

async function getAnalyserBaseUrl(userId: string): Promise<string> {
  const [settings] = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.userId, userId))
    .limit(1);
  return settings?.homepageAnalyserApiUrl || ANALYSER_BASE_URL;
}

router.post("/analyze", async (req, res) => {
  try {
    const { url, account_id } = req.body as { url: string; account_id?: string };

    if (!url) {
      res.status(400).json({ error: "url_required", message: "URL is required" });
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      res.status(400).json({ error: "invalid_url", message: "Invalid URL — enter something like https://example.com" });
      return;
    }

    const userId = (req.session as any).userId || "system";
    const baseUrl = await getAnalyserBaseUrl(userId);
    const accountId = account_id || "standalone";

    let externalId: string;
    try {
      const submitRes = await fetch(`${baseUrl}/analyses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(15000),
      });

      if (!submitRes.ok) {
        const txt = await submitRes.text().catch(() => "");
        req.log.warn({ status: submitRes.status, txt }, "analyser submit failed");
        res.status(502).json({ error: "analyser_error", message: "Analyser service unavailable — check Settings." });
        return;
      }

      const submitted = await submitRes.json();
      externalId = submitted.id;
    } catch (err: any) {
      if (err.name === "TimeoutError") {
        res.status(504).json({ error: "timeout", message: "Analyser service is not responding — check Settings." });
        return;
      }
      res.status(502).json({ error: "network_error", message: "Unable to reach analyser — check Settings." });
      return;
    }

    const [analysis] = await db
      .insert(analysesTable)
      .values({
        accountId,
        domain: parsedUrl.hostname.replace("www.", ""),
        pageUrl: url,
        pageType: "Homepage",
        status: "pending",
        externalAnalysisId: externalId,
        analyzedAt: new Date(),
        heroClarity: 0,
        ctaClarity: 0,
        ctaProminence: 0,
        visualHierarchy: 0,
        messageOrder: 0,
        outcomeClarity: 0,
        trustSignal: 0,
        friction: 0,
        mobileReadability: 0,
        confidenceScore: 0,
      })
      .returning();

    res.status(202).json({ data: analysis });
  } catch (err) {
    req.log.error({ err }, "analyze error");
    res.status(500).json({ error: "internal_error", message: "An unexpected error occurred" });
  }
});

router.get("/analyses/:id/poll", async (req, res) => {
  try {
    const { id } = req.params;
    const [analysis] = await db
      .select()
      .from(analysesTable)
      .where(eq(analysesTable.id, id))
      .limit(1);

    if (!analysis) {
      res.status(404).json({ error: "not_found", message: "Analysis not found" });
      return;
    }

    if (analysis.status === "completed" || analysis.status === "failed") {
      res.json({ data: analysis });
      return;
    }

    if (!analysis.externalAnalysisId) {
      res.json({ data: analysis });
      return;
    }

    const userId = (req.session as any).userId || "system";
    const baseUrl = await getAnalyserBaseUrl(userId);

    let statusCheck: any;
    try {
      const statusRes = await fetch(`${baseUrl}/analyses/${analysis.externalAnalysisId}/status`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!statusRes.ok) {
        res.json({ data: analysis });
        return;
      }
      statusCheck = await statusRes.json();
    } catch {
      res.json({ data: analysis });
      return;
    }

    const externalStatus = statusCheck.status;

    if (externalStatus === "failed") {
      const [updated] = await db
        .update(analysesTable)
        .set({ status: "failed", errorMessage: statusCheck.error || "Analysis failed" })
        .where(eq(analysesTable.id, id))
        .returning();
      res.json({ data: updated });
      return;
    }

    if (externalStatus === "completed") {
      let fullResult: any;
      try {
        const resultRes = await fetch(`${baseUrl}/analyses/${analysis.externalAnalysisId}`, {
          signal: AbortSignal.timeout(15000),
        });
        if (!resultRes.ok) throw new Error("Failed to fetch result");
        fullResult = await resultRes.json();
      } catch (err) {
        req.log.error({ err }, "failed to fetch full analysis result");
        res.json({ data: analysis });
        return;
      }

      const mapped = mapApiResultToRecord(fullResult, analysis.accountId, baseUrl);
      const [updated] = await db
        .update(analysesTable)
        .set(mapped)
        .where(eq(analysesTable.id, id))
        .returning();

      if (analysis.accountId && analysis.accountId !== "standalone") {
        const [existingAccount] = await db
          .select()
          .from(accountsTable)
          .where(eq(accountsTable.id, analysis.accountId))
          .limit(1);
        if (existingAccount) {
          const derived = computeDerivedFields({
            ...existingAccount,
            likelyPrimaryProblem: mapped.primaryIssueCode,
          });
          await db.update(accountsTable).set({
            likelyPrimaryProblem: mapped.primaryIssueCode,
            likelySecondaryProblem: mapped.secondaryIssueCode,
            personalizationLevel: derived.personalizationLevel,
            suggestedSequenceFamily: derived.suggestedSequenceFamily,
            updatedAt: new Date(),
          }).where(eq(accountsTable.id, analysis.accountId));
        }
      }

      res.json({ data: updated });
      return;
    }

    res.json({ data: analysis });
  } catch (err) {
    req.log.error({ err }, "poll error");
    res.status(500).json({ error: "internal_error", message: "An unexpected error occurred" });
  }
});

export default router;
