import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { experimentsTable, settingsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();

router.get("/experiments", async (req, res) => {
  try {
    const { status } = req.query as Record<string, string>;
    let query = db.select().from(experimentsTable).$dynamic();
    if (status) query = query.where(eq(experimentsTable.status, status));
    const rows = await query.orderBy(sql`${experimentsTable.createdAt} desc`);
    res.json({ data: rows, total: rows.length });
  } catch (err) {
    req.log.error({ err }, "listExperiments error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/experiments/:id", async (req, res) => {
  try {
    const [exp] = await db.select().from(experimentsTable).where(eq(experimentsTable.id, req.params.id)).limit(1);
    if (!exp) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ data: exp });
  } catch (err) {
    req.log.error({ err }, "getExperiment error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/experiments", async (req, res) => {
  try {
    const [exp] = await db.insert(experimentsTable).values(req.body).returning();
    res.status(201).json({ data: exp });
  } catch (err) {
    req.log.error({ err }, "createExperiment error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.put("/experiments/:id", async (req, res) => {
  try {
    const [exp] = await db
      .update(experimentsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(experimentsTable.id, req.params.id))
      .returning();
    if (!exp) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ data: exp });
  } catch (err) {
    req.log.error({ err }, "updateExperiment error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.delete("/experiments/:id", async (req, res) => {
  try {
    await db.delete(experimentsTable).where(eq(experimentsTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "deleteExperiment error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/experiments/:id/analyze", async (req, res) => {
  try {
    const [exp] = await db.select().from(experimentsTable).where(eq(experimentsTable.id, req.params.id)).limit(1);
    if (!exp) { res.status(404).json({ error: "not_found" }); return; }

    const userId = (req.session as any).userId || "system";
    const [settings] = await db.select().from(settingsTable).where(eq(settingsTable.userId, userId)).limit(1);

    const apiKey = settings?.anthropicApiKey || process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
    const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;

    if (!apiKey && !baseURL) {
      res.status(400).json({ error: "no_api_key", message: "Anthropic API key not configured." });
      return;
    }

    const { controlMetrics = {}, testMetrics = {} } = req.body;

    const prompt = `You are an expert experimental design analyst. Analyze this A/B test and provide actionable insights.

EXPERIMENT:
- Name: ${exp.name}
- Hypothesis: ${exp.hypothesis || "Not specified"}
- Variable Tested: ${exp.variableTested || "Not specified"}
- Control: ${exp.controlVariant || "Not specified"}
- Test: ${exp.testVariant || "Not specified"}
- Status: ${exp.status}
- Started: ${exp.startDate ? new Date(exp.startDate).toLocaleDateString() : "Not started"}
- Ended: ${exp.endDate ? new Date(exp.endDate).toLocaleDateString() : "Not ended"}

RESULTS:
Control Variant:
- Sample size: ${controlMetrics.sampleSize || "unknown"}
- Positive reply rate: ${controlMetrics.replyRate ?? "unknown"}%
- Booked rate: ${controlMetrics.bookedRate ?? "unknown"}%

Test Variant:
- Sample size: ${testMetrics.sampleSize || "unknown"}
- Positive reply rate: ${testMetrics.replyRate ?? "unknown"}%
- Booked rate: ${testMetrics.bookedRate ?? "unknown"}%

OUTPUT JSON only, no other text:
{
  "whats_working": "...",
  "whats_failing": "...",
  "recommendation": "winner_control" | "winner_test" | "inconclusive",
  "confidence_level": "high" | "medium" | "low",
  "next_experiment_suggestion": "...",
  "audience_insights": "...",
  "key_takeaway": "One sentence summary"
}`;

    const clientConfig: any = { apiKey: apiKey || "placeholder" };
    if (baseURL) clientConfig.baseURL = baseURL;
    const anthropic = new Anthropic(clientConfig);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    const summary = [
      analysis.key_takeaway && `**Key Takeaway**: ${analysis.key_takeaway}`,
      analysis.whats_working && `**What's Working**: ${analysis.whats_working}`,
      analysis.whats_failing && `**What's Failing**: ${analysis.whats_failing}`,
      analysis.next_experiment_suggestion && `**Next Experiment**: ${analysis.next_experiment_suggestion}`,
      analysis.audience_insights && `**Audience Insights**: ${analysis.audience_insights}`,
    ].filter(Boolean).join("\n\n");

    const decisionMap: Record<string, string> = { winner_test: "Winner: Test", winner_control: "Winner: Control", inconclusive: "Inconclusive" };

    const [updated] = await db.update(experimentsTable).set({
      resultSummary: summary,
      decision: decisionMap[analysis.recommendation] || "Inconclusive",
      updatedAt: new Date(),
    }).where(eq(experimentsTable.id, req.params.id)).returning();

    res.json({ data: updated, analysis });
  } catch (err) {
    req.log.error({ err }, "analyzeExperiment error");
    res.status(500).json({ error: "internal_error", message: "Analysis failed." });
  }
});

export default router;
