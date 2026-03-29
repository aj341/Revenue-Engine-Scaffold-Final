import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { tasksTable, accountsTable, contactsTable } from "@workspace/db/schema";
import { eq, sql, desc, and, isNull, lte } from "drizzle-orm";

const router: IRouter = Router();

router.get("/tasks", async (req, res) => {
  try {
    const { status, priority, type, accountId, contactId, view } = req.query as Record<string, string>;
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const weekEnd = new Date(todayEnd.getTime() + 6 * 24 * 60 * 60 * 1000);

    let query = db.select().from(tasksTable).$dynamic();
    const conditions: any[] = [];

    if (status) conditions.push(eq(tasksTable.status, status));
    if (priority) conditions.push(eq(tasksTable.priority, priority));
    if (type) conditions.push(eq(tasksTable.type, type));
    if (accountId) conditions.push(eq(tasksTable.accountId, accountId));
    if (contactId) conditions.push(eq(tasksTable.contactId, contactId));
    if (view === "overdue") conditions.push(lte(tasksTable.dueAt, now));
    if (view === "today") conditions.push(lte(tasksTable.dueAt, todayEnd));
    if (view === "week") conditions.push(lte(tasksTable.dueAt, weekEnd));

    if (conditions.length) query = query.where(and(...conditions));
    const rows = await query.orderBy(sql`${tasksTable.dueAt} asc nulls last`, desc(tasksTable.createdAt));

    const enriched = await Promise.all(rows.map(async (t) => {
      const [account] = t.accountId
        ? await db.select({ companyName: accountsTable.companyName }).from(accountsTable).where(eq(accountsTable.id, t.accountId)).limit(1)
        : [null];
      const [contact] = t.contactId
        ? await db.select({ firstName: contactsTable.firstName, lastName: contactsTable.lastName, fullName: contactsTable.fullName, jobTitle: contactsTable.jobTitle }).from(contactsTable).where(eq(contactsTable.id, t.contactId)).limit(1)
        : [null];
      return {
        ...t,
        companyName: account?.companyName,
        contactName: contact?.fullName || `${contact?.firstName || ""} ${contact?.lastName || ""}`.trim() || undefined,
      };
    }));

    res.json({ data: enriched, total: enriched.length });
  } catch (err) {
    req.log.error({ err }, "listTasks error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/tasks/:id", async (req, res) => {
  try {
    const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, req.params.id)).limit(1);
    if (!task) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ data: task });
  } catch (err) {
    req.log.error({ err }, "getTask error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/tasks", async (req, res) => {
  try {
    const [task] = await db.insert(tasksTable).values(req.body).returning();
    res.status(201).json({ data: task });
  } catch (err) {
    req.log.error({ err }, "createTask error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.put("/tasks/:id", async (req, res) => {
  try {
    const [task] = await db.update(tasksTable).set({ ...req.body, updatedAt: new Date() }).where(eq(tasksTable.id, req.params.id)).returning();
    if (!task) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ data: task });
  } catch (err) {
    req.log.error({ err }, "updateTask error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.delete("/tasks/:id", async (req, res) => {
  try {
    await db.delete(tasksTable).where(eq(tasksTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "deleteTask error");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
