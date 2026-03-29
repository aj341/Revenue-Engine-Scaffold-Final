import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { opportunitiesTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/opportunities", async (req, res) => {
  try {
    const accountId = req.query.accountId as string | undefined;
    const stage = req.query.stage as string | undefined;
    let query = db.select().from(opportunitiesTable).$dynamic();
    if (accountId) query = query.where(eq(opportunitiesTable.accountId, accountId));
    if (stage) query = query.where(eq(opportunitiesTable.stage, stage));
    const rows = await query.orderBy(sql`${opportunitiesTable.createdAt} desc`);
    res.json({ data: rows, total: rows.length });
  } catch (err) {
    req.log.error({ err }, "listOpportunities error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/opportunities", async (req, res) => {
  try {
    const [opp] = await db.insert(opportunitiesTable).values(req.body).returning();
    res.status(201).json({ data: opp });
  } catch (err) {
    req.log.error({ err }, "createOpportunity error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.put("/opportunities/:id", async (req, res) => {
  try {
    const [opp] = await db
      .update(opportunitiesTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(opportunitiesTable.id, req.params.id))
      .returning();
    if (!opp) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ data: opp });
  } catch (err) {
    req.log.error({ err }, "updateOpportunity error");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
