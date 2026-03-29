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
    const { rows, dedupStrategy = "skip" } = req.body as {
      rows: Record<string, unknown>[];
      dedupStrategy?: string;
    };

    const computeDerived = (priorityTier: string, fitScore: number) => {
      let personalizationLevel = "generic";
      if (priorityTier === "strategic") personalizationLevel = "high_touch";
      else if (fitScore >= 75) personalizationLevel = "moderate";
      return { personalizationLevel };
    };

    const existingDomains = new Map<string, string>();
    const existingRows = await db.select({ id: accountsTable.id, domain: accountsTable.domain }).from(accountsTable);
    existingRows.forEach(r => { if (r.domain) existingDomains.set(r.domain.toLowerCase().replace(/^www\./, ""), r.id); });

    let imported = 0;
    let skipped = 0;
    let updated = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;
      try {
        const companyName = String(row.companyName || row.company_name || row["Company Name"] || row.company || "").trim();
        const rawDomain = String(row.domain || row.Domain || row.website || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
        const websiteUrl = String(row.websiteUrl || row.website_url || row["Website URL"] || row.website || "").trim();
        const industry = String(row.industry || row.Industry || "").trim();
        const priorityTier = String(row.priorityTier || row.priority_tier || row["Priority Tier"] || "medium").trim().toLowerCase();
        const fitScore = Math.min(100, Math.max(0, parseInt(String(row.fitScore || row.fit_score || "50")))) || 50;
        const icpType = String(row.icpType || row.icp_type || row["ICP Type"] || "").trim();
        const geography = String(row.geography || row.Geography || row.location || "").trim();
        const employeeBand = String(row.employeeBand || row.employee_band || row.employees || row["Employee Count"] || "").trim();

        if (!companyName) {
          errors.push(`Row ${rowNum}: Missing company name`);
          continue;
        }
        if (!rawDomain) {
          errors.push(`Row ${rowNum}: Missing domain`);
          continue;
        }

        const { personalizationLevel } = computeDerived(priorityTier, fitScore);
        const normalizedDomain = rawDomain;

        if (existingDomains.has(normalizedDomain)) {
          if (dedupStrategy === "skip") {
            skipped++;
            continue;
          } else if (dedupStrategy === "update") {
            const existingId = existingDomains.get(normalizedDomain)!;
            await db.update(accountsTable).set({
              companyName,
              websiteUrl: websiteUrl || null,
              industry: industry || null,
              priorityTier: priorityTier || null,
              fitScore,
              icpType: icpType || null,
              geography: geography || null,
              employeeBand: employeeBand || null,
              personalizationLevel,
              updatedAt: new Date(),
            }).where(eq(accountsTable.id, existingId));
            updated++;
            continue;
          }
        }

        await db.insert(accountsTable).values({
          companyName,
          domain: normalizedDomain,
          websiteUrl: websiteUrl || null,
          industry: industry || null,
          priorityTier: priorityTier || null,
          fitScore,
          icpType: icpType || null,
          geography: geography || null,
          employeeBand: employeeBand || null,
          personalizationLevel,
          source: "csv_import",
          ownerId: (req.session as any).userId || "default",
        });

        existingDomains.set(normalizedDomain, "new");
        imported++;
      } catch (e: any) {
        errors.push(`Row ${rowNum}: ${e.message}`);
      }
    }

    res.json({ imported, updated, skipped, errors, total: rows.length });
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
