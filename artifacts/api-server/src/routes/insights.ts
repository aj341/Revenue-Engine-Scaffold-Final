import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { insightBlocksTable } from "@workspace/db/schema";
import { eq, sql, count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/insights", async (req, res) => {
  try {
    const issueCode = req.query.issueCode as string | undefined;
    const icp = req.query.icp as string | undefined;
    let query = db.select().from(insightBlocksTable).$dynamic();
    if (issueCode) query = query.where(eq(insightBlocksTable.issueCode, issueCode));
    if (icp) query = query.where(eq(insightBlocksTable.icp, icp));
    const rows = await query.orderBy(sql`${insightBlocksTable.createdAt} desc`);
    res.json({ data: rows, total: rows.length });
  } catch (err) {
    req.log.error({ err }, "listInsights error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/insights", async (req, res) => {
  try {
    const [insight] = await db.insert(insightBlocksTable).values(req.body).returning();
    res.status(201).json({ data: insight });
  } catch (err) {
    req.log.error({ err }, "createInsight error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.put("/insights/:id", async (req, res) => {
  try {
    const [insight] = await db
      .update(insightBlocksTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(insightBlocksTable.id, req.params.id))
      .returning();
    if (!insight) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ data: insight });
  } catch (err) {
    req.log.error({ err }, "updateInsight error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.delete("/insights/:id", async (req, res) => {
  try {
    await db.delete(insightBlocksTable).where(eq(insightBlocksTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "deleteInsight error");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
