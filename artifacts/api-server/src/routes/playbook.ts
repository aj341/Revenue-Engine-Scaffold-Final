import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { playbookEntriesTable, assetsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

// Playbook entries
router.get("/playbook-entries", async (req, res) => {
  try {
    const { category } = req.query as Record<string, string>;
    let query = db.select().from(playbookEntriesTable).$dynamic();
    if (category) query = query.where(eq(playbookEntriesTable.category, category));
    const rows = await query.orderBy(sql`${playbookEntriesTable.category} asc`, sql`${playbookEntriesTable.title} asc`);
    res.json({ data: rows, total: rows.length });
  } catch (err) {
    req.log.error({ err }, "listPlaybookEntries error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/playbook-entries/:id", async (req, res) => {
  try {
    const [entry] = await db.select().from(playbookEntriesTable).where(eq(playbookEntriesTable.id, req.params.id)).limit(1);
    if (!entry) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ data: entry });
  } catch (err) {
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/playbook-entries", async (req, res) => {
  try {
    const [entry] = await db.insert(playbookEntriesTable).values(req.body).returning();
    res.status(201).json({ data: entry });
  } catch (err) {
    req.log.error({ err }, "createPlaybookEntry error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.put("/playbook-entries/:id", async (req, res) => {
  try {
    const [entry] = await db.update(playbookEntriesTable).set({ ...req.body, updatedAt: new Date() }).where(eq(playbookEntriesTable.id, req.params.id)).returning();
    if (!entry) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ data: entry });
  } catch (err) {
    res.status(500).json({ error: "internal_error" });
  }
});

router.delete("/playbook-entries/:id", async (req, res) => {
  try {
    await db.delete(playbookEntriesTable).where(eq(playbookEntriesTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "internal_error" });
  }
});

// Assets
router.get("/assets", async (req, res) => {
  try {
    const { assetType, funnelStageBest } = req.query as Record<string, string>;
    let query = db.select().from(assetsTable).$dynamic();
    if (assetType) query = query.where(eq(assetsTable.assetType, assetType));
    const rows = await query.orderBy(sql`${assetsTable.assetName} asc`);
    res.json({ data: rows, total: rows.length });
  } catch (err) {
    req.log.error({ err }, "listAssets error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/assets/:id", async (req, res) => {
  try {
    const [asset] = await db.select().from(assetsTable).where(eq(assetsTable.id, req.params.id)).limit(1);
    if (!asset) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ data: asset });
  } catch (err) {
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/assets", async (req, res) => {
  try {
    const [asset] = await db.insert(assetsTable).values(req.body).returning();
    res.status(201).json({ data: asset });
  } catch (err) {
    req.log.error({ err }, "createAsset error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.put("/assets/:id", async (req, res) => {
  try {
    const [asset] = await db.update(assetsTable).set(req.body).where(eq(assetsTable.id, req.params.id)).returning();
    if (!asset) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ data: asset });
  } catch (err) {
    res.status(500).json({ error: "internal_error" });
  }
});

router.delete("/assets/:id", async (req, res) => {
  try {
    await db.delete(assetsTable).where(eq(assetsTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
