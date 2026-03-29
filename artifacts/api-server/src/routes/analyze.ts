import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { analysesTable, accountsTable, settingsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

function computeDerivedFields(account: { priorityTier?: string | null; fitScore?: number | null; likelyPrimaryProblem?: string | null; icpType?: string | null }) {
  const priorityTier = account.priorityTier;
  const fitScore = account.fitScore ?? 0;
  const issue = account.likelyPrimaryProblem;
  const icp = account.icpType;

  let personalizationLevel = "generic";
  if (priorityTier === "strategic") personalizationLevel = "high_touch";
  else if (fitScore >= 75) personalizationLevel = "moderate";

  let suggestedSequenceFamily: string | null = null;
  if (issue && ["unclear_cta", "weak_cta", "poor_cta_prominence"].includes(issue)) {
    suggestedSequenceFamily = "cta_clarity_sequence";
  } else if (issue && ["missing_trust_signals", "weak_trust", "missing_social_proof"].includes(issue)) {
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
      res.status(400).json({ error: "invalid_url", message: "URL is invalid. Please enter a valid URL like https://example.com" });
      return;
    }

    const userId = (req.session as any).userId || "system";
    const [settings] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.userId, userId))
      .limit(1);

    const analyserEndpoint = settings?.homepageAnalyserApiUrl;
    const analyserApiKey = settings?.homepageAnalyserApiKey;

    let analysisData: any;

    if (analyserEndpoint) {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (analyserApiKey) headers["Authorization"] = `Bearer ${analyserApiKey}`;

        const externalRes = await fetch(analyserEndpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({ url }),
          signal: AbortSignal.timeout(30000),
        });

        if (externalRes.status === 429) {
          res.status(429).json({ error: "rate_limited", message: "Analyzer service is busy. Please try again in a moment." });
          return;
        }
        if (externalRes.status >= 500) {
          res.status(502).json({ error: "analyser_error", message: "Analyzer service error. Please try again." });
          return;
        }
        if (!externalRes.ok) {
          res.status(502).json({ error: "analyser_error", message: `Analyzer returned ${externalRes.status}` });
          return;
        }

        analysisData = await externalRes.json();
      } catch (fetchErr: any) {
        if (fetchErr.name === "TimeoutError" || fetchErr.code === "UND_ERR_CONNECT_TIMEOUT") {
          res.status(504).json({ error: "timeout", message: "Unable to reach analyzer API. Check endpoint in Settings." });
          return;
        }
        res.status(502).json({ error: "network_error", message: "Unable to reach analyzer API. Check endpoint in Settings." });
        return;
      }
    } else {
      // Mock response when no analyser is configured
      const domain = parsedUrl.hostname.replace("www.", "");
      const mockScore = Math.floor(Math.random() * 40) + 40;
      analysisData = {
        domain,
        overall_score: mockScore,
        primary_issue_code: "unclear_cta",
        secondary_issue_code: "weak_hero",
        hero_clarity: Math.floor(Math.random() * 40) + 30,
        cta_clarity: Math.floor(Math.random() * 40) + 30,
        cta_prominence: Math.floor(Math.random() * 30) + 40,
        visual_hierarchy: Math.floor(Math.random() * 30) + 40,
        message_order: Math.floor(Math.random() * 30) + 35,
        outcome_clarity: Math.floor(Math.random() * 40) + 25,
        trust_signal: Math.floor(Math.random() * 30) + 50,
        friction: Math.floor(Math.random() * 30) + 20,
        mobile_readability: Math.floor(Math.random() * 30) + 55,
        issue_codes: ["unclear_cta", "weak_hero"],
        issue_summaries: {
          unclear_cta: { short: "CTA is not prominent or action-oriented", detailed: "The primary call-to-action lacks clarity and is buried within page content. Visitors cannot immediately identify the next step they should take." },
          weak_hero: { short: "Hero section fails to communicate value", detailed: "The above-the-fold section does not clearly convey the unique value proposition or what the company does within the first 3 seconds." },
        },
        strengths: ["Mobile layout is responsive", "Contact information is visible"],
        recommended_priority_fix: "Clarify and reposition the primary CTA above the fold",
        confidence_score: 0.78,
        screenshot_url: null,
      };
    }

    const domain = analysisData.domain || parsedUrl.hostname.replace("www.", "");

    const analysisRecord = {
      accountId: account_id || "standalone",
      domain,
      pageUrl: url,
      pageType: "homepage",
      analyzedAt: new Date(),
      heroClarity: analysisData.hero_clarity ?? 0,
      ctaClarity: analysisData.cta_clarity ?? 0,
      ctaProminence: analysisData.cta_prominence ?? 0,
      visualHierarchy: analysisData.visual_hierarchy ?? 0,
      messageOrder: analysisData.message_order ?? 0,
      outcomeClarity: analysisData.outcome_clarity ?? 0,
      trustSignal: analysisData.trust_signal ?? 0,
      friction: analysisData.friction ?? 0,
      mobileReadability: analysisData.mobile_readability ?? 0,
      primaryIssueCode: analysisData.primary_issue_code ?? null,
      secondaryIssueCode: analysisData.secondary_issue_code ?? null,
      issueSummaryShort: analysisData.issue_summaries?.[analysisData.primary_issue_code]?.short ?? null,
      issueSummaryDetailed: analysisData.issue_summaries?.[analysisData.primary_issue_code]?.detailed ?? null,
      strengthsDetected: analysisData.strengths ?? [],
      recommendedPriorityFix: analysisData.recommended_priority_fix ?? null,
      confidenceScore: Math.round((analysisData.confidence_score ?? 0) * 100),
      rawNotes: analysisData,
      screenshotUrl: analysisData.screenshot_url ?? null,
    };

    const [analysis] = await db.insert(analysesTable).values(analysisRecord).returning();

    if (account_id && account_id !== "standalone") {
      const [existingAccount] = await db.select().from(accountsTable).where(eq(accountsTable.id, account_id)).limit(1);
      if (existingAccount) {
        const derived = computeDerivedFields({
          ...existingAccount,
          likelyPrimaryProblem: analysisData.primary_issue_code,
        });
        await db.update(accountsTable).set({
          likelyPrimaryProblem: analysisData.primary_issue_code,
          likelySecondaryProblem: analysisData.secondary_issue_code,
          personalizationLevel: derived.personalizationLevel,
          suggestedSequenceFamily: derived.suggestedSequenceFamily,
          updatedAt: new Date(),
        }).where(eq(accountsTable.id, account_id));
      }
    }

    res.status(201).json({ data: analysis });
  } catch (err) {
    req.log.error({ err }, "analyze error");
    res.status(500).json({ error: "internal_error", message: "An unexpected error occurred" });
  }
});

export default router;
