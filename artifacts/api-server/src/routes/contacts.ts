import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { contactsTable, accountsTable } from "@workspace/db/schema";
import { eq, ilike, or, sql, count } from "drizzle-orm";

const router: IRouter = Router();

// GET /contacts
router.get("/contacts", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1")));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || "20"))));
    const offset = (page - 1) * pageSize;
    const search = req.query.search as string | undefined;
    const accountId = req.query.accountId as string | undefined;
    const outreachStatus = req.query.outreachStatus as string | undefined;

    const conditions = [];
    if (accountId) conditions.push(eq(contactsTable.accountId, accountId));
    if (outreachStatus) conditions.push(eq(contactsTable.outreachStatus, outreachStatus));
    if (search) {
      conditions.push(
        or(
          ilike(contactsTable.fullName, `%${search}%`),
          ilike(contactsTable.email, `%${search}%`)
        )
      );
    }

    const [{ total }] = await db.select({ total: count() }).from(contactsTable);

    const rows = await db
      .select({
        contact: contactsTable,
        accountName: accountsTable.companyName,
      })
      .from(contactsTable)
      .leftJoin(accountsTable, eq(contactsTable.accountId, accountsTable.id))
      .limit(pageSize)
      .offset(offset)
      .orderBy(sql`${contactsTable.createdAt} desc`);

    const data = rows.map((r) => ({ ...r.contact, accountName: r.accountName }));

    res.json({ data, meta: { total: Number(total), page, pageSize } });
  } catch (err) {
    req.log.error({ err }, "listContacts error");
    res.status(500).json({ error: "internal_error" });
  }
});

// POST /contacts
router.post("/contacts", async (req, res) => {
  try {
    const body = req.body;
    const fullName = body.fullName || [body.firstName, body.lastName].filter(Boolean).join(" ") || null;
    const [contact] = await db
      .insert(contactsTable)
      .values({ ...body, fullName })
      .returning();
    res.status(201).json({ data: contact });
  } catch (err) {
    req.log.error({ err }, "createContact error");
    res.status(500).json({ error: "internal_error" });
  }
});

// GET /contacts/:id
router.get("/contacts/:id", async (req, res) => {
  try {
    const [row] = await db
      .select({ contact: contactsTable, accountName: accountsTable.companyName })
      .from(contactsTable)
      .leftJoin(accountsTable, eq(contactsTable.accountId, accountsTable.id))
      .where(eq(contactsTable.id, req.params.id))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    res.json({ data: { ...row.contact, accountName: row.accountName } });
  } catch (err) {
    req.log.error({ err }, "getContact error");
    res.status(500).json({ error: "internal_error" });
  }
});

// PUT /contacts/:id
router.put("/contacts/:id", async (req, res) => {
  try {
    const body = req.body;
    if (body.firstName || body.lastName) {
      body.fullName = [body.firstName, body.lastName].filter(Boolean).join(" ") || body.fullName;
    }
    const [contact] = await db
      .update(contactsTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(contactsTable.id, req.params.id))
      .returning();

    if (!contact) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    res.json({ data: contact });
  } catch (err) {
    req.log.error({ err }, "updateContact error");
    res.status(500).json({ error: "internal_error" });
  }
});

// POST /contacts/import
router.post("/contacts/import", async (req, res) => {
  try {
    const { rows, dedupStrategy = "skip" } = req.body as {
      rows: Record<string, unknown>[];
      dedupStrategy?: string;
    };

    const normalizeSeniority = (title: string): string => {
      const t = (title || "").toLowerCase();
      if (/ceo|cto|cfo|coo|cmo|ciso|founder|co-founder|c-suite|president|chief/.test(t)) return "c_level";
      if (/\bvp\b|vice president|vp of/.test(t)) return "vp";
      if (/director|head of|principal/.test(t)) return "director";
      if (/manager|coordinator|supervisor|lead/.test(t)) return "manager";
      if (/engineer|developer|designer|analyst|specialist|associate|executive|representative/.test(t)) return "individual_contributor";
      return "other";
    };

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    const existingEmails = new Set<string>();
    const existingRows = await db.select({ email: contactsTable.email }).from(contactsTable);
    existingRows.forEach(r => { if (r.email) existingEmails.add(r.email.toLowerCase()); });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;
      try {
        const firstName = String(row.firstName || row.first_name || row["First Name"] || "").trim();
        const lastName = String(row.lastName || row.last_name || row["Last Name"] || "").trim();
        const email = String(row.email || row.Email || "").trim().toLowerCase();
        const phone = String(row.phone || row.Phone || "").trim();
        const linkedinUrl = String(row.linkedinUrl || row.linkedin_url || row["LinkedIn URL"] || "").trim();
        const jobTitle = String(row.jobTitle || row.job_title || row["Job Title"] || row.title || "").trim();
        const accountId = String(row.accountId || row.account_id || "").trim();
        const notes = String(row.notes || row.Notes || "").trim();

        if (!firstName && !lastName) {
          errors.push(`Row ${rowNum}: Missing first name and last name`);
          continue;
        }
        if (!email) {
          errors.push(`Row ${rowNum}: Missing email address`);
          continue;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push(`Row ${rowNum}: Invalid email format: ${email}`);
          continue;
        }

        if (existingEmails.has(email)) {
          skipped++;
          continue;
        }

        const seniority = normalizeSeniority(jobTitle);
        const fullName = [firstName, lastName].filter(Boolean).join(" ");

        await db.insert(contactsTable).values({
          firstName,
          lastName,
          fullName,
          email,
          phone: phone || null,
          linkedinUrl: linkedinUrl || null,
          jobTitle: jobTitle || null,
          seniority,
          accountId: accountId || "standalone",
          notes: notes || null,
          outreachStatus: "new",
        });

        existingEmails.add(email);
        imported++;
      } catch (e: any) {
        errors.push(`Row ${rowNum}: ${e.message}`);
      }
    }

    res.json({ imported, skipped, errors, total: rows.length });
  } catch (err) {
    req.log.error({ err }, "importContacts error");
    res.status(500).json({ error: "internal_error" });
  }
});

// DELETE /contacts/:id
router.delete("/contacts/:id", async (req, res) => {
  try {
    await db.delete(contactsTable).where(eq(contactsTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "deleteContact error");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
