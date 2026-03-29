import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { activitiesTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/activities", async (req, res) => {
  try {
    const accountId = req.query.accountId as string | undefined;
    const contactId = req.query.contactId as string | undefined;
    let query = db.select().from(activitiesTable).$dynamic();
    if (accountId) query = query.where(eq(activitiesTable.accountId, accountId));
    if (contactId) query = query.where(eq(activitiesTable.contactId, contactId));
    const rows = await query.orderBy(sql`${activitiesTable.sentAt} desc`).limit(50);
    res.json({ data: rows, total: rows.length });
  } catch (err) {
    req.log.error({ err }, "listActivities error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/activities", async (req, res) => {
  try {
    const [activity] = await db.insert(activitiesTable).values(req.body).returning();
    res.status(201).json({ data: activity });
  } catch (err) {
    req.log.error({ err }, "createActivity error");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
