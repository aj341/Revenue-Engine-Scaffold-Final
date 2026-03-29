import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { experimentsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/experiments", async (req, res) => {
  try {
    const rows = await db.select().from(experimentsTable).orderBy(sql`${experimentsTable.createdAt} desc`);
    res.json({ data: rows, total: rows.length });
  } catch (err) {
    req.log.error({ err }, "listExperiments error");
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

export default router;
