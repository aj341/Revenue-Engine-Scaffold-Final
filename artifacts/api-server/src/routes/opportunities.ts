import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { opportunitiesTable, accountsTable, contactsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

async function enrich(opp: any) {
  const [account] = opp.accountId
    ? await db.select({ companyName: accountsTable.companyName, domain: accountsTable.domain, icpType: accountsTable.icpType }).from(accountsTable).where(eq(accountsTable.id, opp.accountId)).limit(1)
    : [null];
  const [contact] = opp.contactId
    ? await db.select({ firstName: contactsTable.firstName, lastName: contactsTable.lastName, fullName: contactsTable.fullName, jobTitle: contactsTable.jobTitle, email: contactsTable.email }).from(contactsTable).where(eq(contactsTable.id, opp.contactId)).limit(1)
    : [null];
  return { ...opp, account, contact };
}

router.get("/opportunities", async (req, res) => {
  try {
    const { accountId, contactId, stage } = req.query as Record<string, string>;
    let query = db.select().from(opportunitiesTable).$dynamic();
    if (accountId) query = query.where(eq(opportunitiesTable.accountId, accountId));
    if (contactId) query = query.where(eq(opportunitiesTable.contactId, contactId));
    if (stage) query = query.where(eq(opportunitiesTable.stage, stage));
    const rows = await query.orderBy(sql`${opportunitiesTable.createdAt} desc`);
    const enriched = await Promise.all(rows.map(enrich));
    res.json({ data: enriched, total: enriched.length });
  } catch (err) {
    req.log.error({ err }, "listOpportunities error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/opportunities/:id", async (req, res) => {
  try {
    const [opp] = await db.select().from(opportunitiesTable).where(eq(opportunitiesTable.id, req.params.id)).limit(1);
    if (!opp) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ data: await enrich(opp) });
  } catch (err) {
    req.log.error({ err }, "getOpportunity error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/opportunities", async (req, res) => {
  try {
    const [opp] = await db.insert(opportunitiesTable).values(req.body).returning();
    res.status(201).json({ data: await enrich(opp) });
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
    res.json({ data: await enrich(opp) });
  } catch (err) {
    req.log.error({ err }, "updateOpportunity error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.delete("/opportunities/:id", async (req, res) => {
  try {
    await db.delete(opportunitiesTable).where(eq(opportunitiesTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "deleteOpportunity error");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
