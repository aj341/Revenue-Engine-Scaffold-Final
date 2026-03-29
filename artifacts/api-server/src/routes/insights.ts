import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { insightBlocksTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/insights", async (req, res) => {
  try {
    const { issueCode, icp, channel, active, search, page = "1", pageSize = "50" } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let rows = await db.select().from(insightBlocksTable).orderBy(sql`${insightBlocksTable.createdAt} desc`);

    if (issueCode) {
      const codes = issueCode.split(",");
      rows = rows.filter(r => codes.includes(r.issueCode));
    }
    if (icp) {
      const icps = icp.split(",");
      rows = rows.filter(r => !r.icp || icps.includes(r.icp));
    }
    if (channel) {
      const channels = channel.split(",").map(c => c.toLowerCase());
      rows = rows.filter(r => {
        const sc = r.suitableChannels as string[] | null;
        return !sc || sc.some(c => channels.includes(c.toLowerCase()));
      });
    }
    if (active !== undefined) {
      const isActive = active === "true";
      rows = rows.filter(r => r.active === isActive);
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.shortInsightLine?.toLowerCase().includes(q) ||
        r.businessConsequence?.toLowerCase().includes(q) ||
        r.longerExplainer?.toLowerCase().includes(q)
      );
    }

    const total = rows.length;
    const paginated = rows.slice(offset, offset + parseInt(pageSize));

    res.json({ data: paginated, total, page: parseInt(page), pageSize: parseInt(pageSize) });
  } catch (err) {
    req.log.error({ err }, "GET /api/insights error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/insights/:id", async (req, res) => {
  try {
    if (req.params.id === "bulk-import") { res.status(404).json({ error: "use POST" }); return; }
    const [row] = await db.select().from(insightBlocksTable).where(eq(insightBlocksTable.id, req.params.id)).limit(1);
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ data: row });
  } catch (err) {
    req.log.error({ err }, "GET /api/insights/:id error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/insights/bulk-import", async (req, res) => {
  try {
    const { insight_blocks } = req.body;
    if (!Array.isArray(insight_blocks)) {
      res.status(400).json({ error: "Expected { insight_blocks: [...] }" });
      return;
    }

    let imported = 0;
    let skipped = 0;

    for (const block of insight_blocks) {
      if (!block.short_insight_line && !block.shortInsightLine) { skipped++; continue; }
      const line = block.short_insight_line || block.shortInsightLine;
      const existing = await db.select().from(insightBlocksTable)
        .where(eq(insightBlocksTable.shortInsightLine, line)).limit(1);
      if (existing.length > 0) { skipped++; continue; }

      await db.insert(insightBlocksTable).values({
        issueCode: (block.issue_codes || [])[0] || block.issueCode || "general",
        icp: (block.icps || [])[0] || block.icp || "general",
        shortInsightLine: line,
        longerExplainer: block.full_insight_block || block.longerExplainer || null,
        businessConsequence: block.business_consequence || block.businessConsequence || null,
        suitableChannels: block.channels || block.suitableChannels || null,
        ctaPairings: block.cta_style ? [block.cta_style] : block.ctaPairings || null,
        assetPairings: block.related_assets || block.assetPairings || null,
        active: block.active !== false,
      });
      imported++;
    }

    res.json({ data: { imported, skipped } });
  } catch (err) {
    req.log.error({ err }, "POST /api/insights/bulk-import error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/insights", async (req, res) => {
  try {
    const {
      issueCode, icp, shortInsightLine, longerExplainer, businessConsequence,
      severityHint, suitableChannels, suitableSteps, ctaPairings, assetPairings,
      confidenceNotes, active = true,
    } = req.body;

    if (!shortInsightLine) {
      res.status(400).json({ error: "shortInsightLine is required" });
      return;
    }

    const [row] = await db.insert(insightBlocksTable).values({
      issueCode: issueCode || "general",
      icp: icp || "general",
      shortInsightLine,
      longerExplainer: longerExplainer || null,
      businessConsequence: businessConsequence || null,
      severityHint: severityHint || null,
      suitableChannels: suitableChannels || null,
      suitableSteps: suitableSteps || null,
      ctaPairings: ctaPairings || null,
      assetPairings: assetPairings || null,
      confidenceNotes: confidenceNotes || null,
      active,
    }).returning();

    res.status(201).json({ data: row });
  } catch (err) {
    req.log.error({ err }, "POST /api/insights error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.put("/insights/:id", async (req, res) => {
  try {
    const [row] = await db.update(insightBlocksTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(insightBlocksTable.id, req.params.id))
      .returning();
    if (!row) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ data: row });
  } catch (err) {
    req.log.error({ err }, "PUT /api/insights/:id error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.delete("/insights/:id", async (req, res) => {
  try {
    await db.delete(insightBlocksTable).where(eq(insightBlocksTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "DELETE /api/insights/:id error");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
