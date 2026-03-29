import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { accountsTable, contactsTable, analysesTable, activitiesTable } from "@workspace/db/schema";
import { eq, ilike, or, sql, count } from "drizzle-orm";

const router: IRouter = Router();

// GET /accounts
router.get("/accounts", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1")));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || "20"))));
    const offset = (page - 1) * pageSize;
    const search = req.query.search as string | undefined;
    const priorityTier = req.query.priorityTier as string | undefined;
    const icpType = req.query.icpType as string | undefined;

    let query = db.select().from(accountsTable);

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(accountsTable.companyName, `%${search}%`),
          ilike(accountsTable.domain, `%${search}%`)
        )
      );
    }
    if (priorityTier) conditions.push(eq(accountsTable.priorityTier, priorityTier));
    if (icpType) conditions.push(eq(accountsTable.icpType, icpType));

    const [{ total }] = await db
      .select({ total: count() })
      .from(accountsTable)
      .$dynamic();

    const rows = await db
      .select()
      .from(accountsTable)
      .limit(pageSize)
      .offset(offset)
      .orderBy(sql`${accountsTable.createdAt} desc`);

    // Get contact counts
    const ids = rows.map((r) => r.id);
    const contactCounts: Record<string, number> = {};
    if (ids.length > 0) {
      const counts = await db
        .select({ accountId: contactsTable.accountId, cnt: count() })
        .from(contactsTable)
        .groupBy(contactsTable.accountId);
      counts.forEach((c) => { contactCounts[c.accountId] = Number(c.cnt); });
    }

    const data = rows.map((a) => ({ ...a, contactCount: contactCounts[a.id] ?? 0 }));

    res.json({ data, meta: { total: Number(total), page, pageSize } });
  } catch (err) {
    req.log.error({ err }, "listAccounts error");
    res.status(500).json({ error: "internal_error" });
  }
});

// POST /accounts
router.post("/accounts", async (req, res) => {
  try {
    const body = req.body;
    const [account] = await db
      .insert(accountsTable)
      .values({ ...body, ownerId: (req.session as any).userId || "default" })
      .returning();
    res.status(201).json({ data: account });
  } catch (err) {
    req.log.error({ err }, "createAccount error");
    res.status(500).json({ error: "internal_error" });
  }
});

// POST /accounts/import
router.post("/accounts/import", async (req, res) => {
  try {
    const { rows } = req.body as { rows: Record<string, unknown>[] };
    let imported = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        await db.insert(accountsTable).values({
          companyName: String(row.companyName || row.company_name || row["Company Name"] || "Unknown"),
          domain: String(row.domain || row.Domain || ""),
          websiteUrl: String(row.websiteUrl || row.website_url || row["Website URL"] || ""),
          industry: String(row.industry || row.Industry || ""),
          icpType: String(row.icpType || row.icp_type || ""),
          priorityTier: String(row.priorityTier || row.priority_tier || "B"),
          fitScore: parseInt(String(row.fitScore || row.fit_score || "50")),
          source: "csv_import",
          ownerId: (req.session as any).userId || "default",
        });
        imported++;
      } catch (e: any) {
        errors.push(`Row ${imported + errors.length + 1}: ${e.message}`);
      }
    }

    res.json({ imported, skipped: 0, errors });
  } catch (err) {
    req.log.error({ err }, "importAccounts error");
    res.status(500).json({ error: "internal_error" });
  }
});

// GET /accounts/:id
router.get("/accounts/:id", async (req, res) => {
  try {
    const [account] = await db
      .select()
      .from(accountsTable)
      .where(eq(accountsTable.id, req.params.id))
      .limit(1);

    if (!account) {
      res.status(404).json({ error: "not_found", message: "Account not found" });
      return;
    }

    const contacts = await db
      .select()
      .from(contactsTable)
      .where(eq(contactsTable.accountId, req.params.id));

    const analyses = await db
      .select()
      .from(analysesTable)
      .where(eq(analysesTable.accountId, req.params.id));

    const recentActivities = await db
      .select()
      .from(activitiesTable)
      .where(eq(activitiesTable.accountId, req.params.id))
      .limit(10)
      .orderBy(sql`${activitiesTable.sentAt} desc`);

    res.json({ data: { ...account, contacts, analyses, recentActivities } });
  } catch (err) {
    req.log.error({ err }, "getAccount error");
    res.status(500).json({ error: "internal_error" });
  }
});

// PUT /accounts/:id
router.put("/accounts/:id", async (req, res) => {
  try {
    const [account] = await db
      .update(accountsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(accountsTable.id, req.params.id))
      .returning();

    if (!account) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    res.json({ data: account });
  } catch (err) {
    req.log.error({ err }, "updateAccount error");
    res.status(500).json({ error: "internal_error" });
  }
});

// DELETE /accounts/:id
router.delete("/accounts/:id", async (req, res) => {
  try {
    await db.delete(accountsTable).where(eq(accountsTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "deleteAccount error");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
