import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sequencesTable } from "@workspace/db/schema";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/sequences", async (req, res) => {
  try {
    const rows = await db.select().from(sequencesTable).orderBy(sql`${sequencesTable.createdAt} desc`);
    res.json({ data: rows, total: rows.length });
  } catch (err) {
    req.log.error({ err }, "listSequences error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/sequences", async (req, res) => {
  try {
    const [seq] = await db.insert(sequencesTable).values(req.body).returning();
    res.status(201).json({ data: seq });
  } catch (err) {
    req.log.error({ err }, "createSequence error");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
