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
