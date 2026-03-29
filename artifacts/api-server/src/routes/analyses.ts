import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { analysesTable } from "@workspace/db/schema";
import { eq, sql, count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/analyses", async (req, res) => {
  try {
    const accountId = req.query.accountId as string | undefined;
    let rows;
    if (accountId) {
      rows = await db.select().from(analysesTable).where(eq(analysesTable.accountId, accountId));
    } else {
      rows = await db.select().from(analysesTable).orderBy(sql`${analysesTable.createdAt} desc`).limit(50);
    }
    res.json({ data: rows, total: rows.length });
  } catch (err) {
    req.log.error({ err }, "listAnalyses error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/analyses", async (req, res) => {
  try {
    const [analysis] = await db.insert(analysesTable).values(req.body).returning();
    res.status(201).json({ data: analysis });
  } catch (err) {
    req.log.error({ err }, "createAnalysis error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/analyses/:id", async (req, res) => {
  try {
    const [analysis] = await db
      .select()
      .from(analysesTable)
      .where(eq(analysesTable.id, req.params.id))
      .limit(1);
    if (!analysis) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ data: analysis });
  } catch (err) {
    req.log.error({ err }, "getAnalysis error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.put("/analyses/:id", async (req, res) => {
  try {
    const [analysis] = await db
      .update(analysesTable)
      .set(req.body)
      .where(eq(analysesTable.id, req.params.id))
      .returning();
    if (!analysis) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ data: analysis });
  } catch (err) {
    req.log.error({ err }, "updateAnalysis error");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
