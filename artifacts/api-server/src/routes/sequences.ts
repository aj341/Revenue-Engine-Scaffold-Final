import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  sequencesTable, sequenceStepsTable, prospectSequencesTable,
  activitiesTable, messageTemplatesTable, accountsTable, contactsTable,
} from "@workspace/db/schema";
import { eq, sql, count } from "drizzle-orm";

const router: IRouter = Router();

// ── Sequences ──────────────────────────────────────────────────────────────

router.get("/sequences", async (req, res) => {
  try {
    const { icp, issueCluster, active } = req.query as Record<string, string>;
    let rows = await db.select().from(sequencesTable).orderBy(sql`${sequencesTable.createdAt} desc`);
    if (icp) rows = rows.filter(r => !r.icp || r.icp === icp);
    if (issueCluster) rows = rows.filter(r => !r.issueCluster || r.issueCluster === issueCluster);
    if (active !== undefined) rows = rows.filter(r => r.active === (active === "true"));

    const withCounts = await Promise.all(rows.map(async (seq) => {
      const [sc] = await db.select({ c: count() }).from(sequenceStepsTable).where(eq(sequenceStepsTable.sequenceId, seq.id));
      const [uc] = await db.select({ c: count() }).from(prospectSequencesTable).where(eq(prospectSequencesTable.sequenceId, seq.id));
      return { ...seq, stepCount: Number(sc?.c ?? 0), usageCount: Number(uc?.c ?? 0) };
    }));

    res.json({ data: withCounts, total: withCounts.length });
  } catch (err) {
    req.log.error({ err }, "GET /api/sequences error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/sequences/:id", async (req, res) => {
  try {
    const [seq] = await db.select().from(sequencesTable).where(eq(sequencesTable.id, req.params.id)).limit(1);
    if (!seq) { res.status(404).json({ error: "Not found" }); return; }
    const steps = await db.select().from(sequenceStepsTable)
      .where(eq(sequenceStepsTable.sequenceId, req.params.id))
      .orderBy(sequenceStepsTable.stepNumber);
    res.json({ data: { ...seq, steps } });
  } catch (err) {
    req.log.error({ err }, "GET /api/sequences/:id error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/sequences", async (req, res) => {
  try {
    const { steps, description: _desc, ...seqData } = req.body;
    const [seq] = await db.insert(sequencesTable).values({
      sequenceName: seqData.sequenceName || "Untitled Sequence",
      icp: seqData.icp || null,
      issueCluster: seqData.issueCluster || null,
      channelMix: seqData.channelMix || null,
      ctaStrategy: seqData.ctaStrategy || null,
      assetStrategy: seqData.assetStrategy || null,
      active: seqData.active !== false,
    }).returning();

    if (Array.isArray(steps) && steps.length > 0) {
      await db.insert(sequenceStepsTable).values(
        steps.map((s: any, i: number) => ({
          sequenceId: seq.id,
          stepNumber: s.stepNumber ?? i + 1,
          dayOffset: s.dayOffset ?? i * 3,
          channel: s.channel || "email",
          objective: s.objective || null,
          angle: s.angle || null,
          templateId: s.templateId || null,
          assetToInclude: s.assetToInclude || s.asset || null,
        }))
      );
    }

    const createdSteps = await db.select().from(sequenceStepsTable)
      .where(eq(sequenceStepsTable.sequenceId, seq.id))
      .orderBy(sequenceStepsTable.stepNumber);

    res.status(201).json({ data: { ...seq, steps: createdSteps } });
  } catch (err) {
    req.log.error({ err }, "POST /api/sequences error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.put("/sequences/:id", async (req, res) => {
  try {
    const { steps, description: _desc2, ...seqData } = req.body;
    const [seq] = await db.update(sequencesTable)
      .set({
        sequenceName: seqData.sequenceName,
        icp: seqData.icp || null,
        issueCluster: seqData.issueCluster || null,
        channelMix: seqData.channelMix || null,
        ctaStrategy: seqData.ctaStrategy || null,
        assetStrategy: seqData.assetStrategy || null,
        active: seqData.active,
        updatedAt: new Date(),
      })
      .where(eq(sequencesTable.id, req.params.id))
      .returning();
    if (!seq) { res.status(404).json({ error: "Not found" }); return; }

    if (Array.isArray(steps)) {
      await db.delete(sequenceStepsTable).where(eq(sequenceStepsTable.sequenceId, req.params.id));
      if (steps.length > 0) {
        await db.insert(sequenceStepsTable).values(
          steps.map((s: any) => ({
            sequenceId: req.params.id,
            stepNumber: s.stepNumber,
            dayOffset: s.dayOffset ?? 0,
            channel: s.channel || "email",
            objective: s.objective || null,
            angle: s.angle || null,
            templateId: s.templateId || null,
            assetToInclude: s.assetToInclude || null,
          }))
        );
      }
    }

    const updatedSteps = await db.select().from(sequenceStepsTable)
      .where(eq(sequenceStepsTable.sequenceId, req.params.id))
      .orderBy(sequenceStepsTable.stepNumber);
    res.json({ data: { ...seq, steps: updatedSteps } });
  } catch (err) {
    req.log.error({ err }, "PUT /api/sequences/:id error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.delete("/sequences/:id", async (req, res) => {
  try {
    await db.delete(sequenceStepsTable).where(eq(sequenceStepsTable.sequenceId, req.params.id));
    await db.delete(sequencesTable).where(eq(sequencesTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/sequences/:id/steps", async (req, res) => {
  try {
    const steps = await db.select().from(sequenceStepsTable)
      .where(eq(sequenceStepsTable.sequenceId, req.params.id))
      .orderBy(sequenceStepsTable.stepNumber);
    res.json({ data: steps });
  } catch (err) {
    res.status(500).json({ error: "internal_error" });
  }
});

// ── Prospect Sequences ────────────────────────────────────────────────────

router.get("/prospect-sequences", async (req, res) => {
  try {
    const { accountId, contactId, status } = req.query as Record<string, string>;
    let rows = await db.select().from(prospectSequencesTable).orderBy(sql`${prospectSequencesTable.startedAt} desc`);
    if (accountId) rows = rows.filter(r => r.accountId === accountId);
    if (contactId) rows = rows.filter(r => r.contactId === contactId);
    if (status) rows = rows.filter(r => r.status === status);
    res.json({ data: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/prospect-sequences", async (req, res) => {
  try {
    const { accountId, contactId, sequenceId, startedAt } = req.body;
    if (!accountId || !sequenceId) {
      res.status(400).json({ error: "accountId and sequenceId are required" });
      return;
    }
    const [row] = await db.insert(prospectSequencesTable).values({
      accountId,
      contactId: contactId || "unassigned",
      sequenceId,
      status: "active",
      currentStep: 1,
      startedAt: startedAt ? new Date(startedAt) : new Date(),
    }).returning();
    res.status(201).json({ data: row });
  } catch (err) {
    req.log.error({ err }, "POST /api/prospect-sequences error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.put("/prospect-sequences/:id", async (req, res) => {
  try {
    const [row] = await db.update(prospectSequencesTable)
      .set(req.body)
      .where(eq(prospectSequencesTable.id, req.params.id))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ data: row });
  } catch (err) {
    res.status(500).json({ error: "internal_error" });
  }
});

// ── Execution Queue ───────────────────────────────────────────────────────

router.get("/execution-queue", async (req, res) => {
  try {
    const { filter = "all", channel, status } = req.query as Record<string, string>;

    const assignments = await db.select().from(prospectSequencesTable)
      .where(eq(prospectSequencesTable.status, "active"));

    const queue = (await Promise.all(assignments.map(async (a) => {
      const [seq] = await db.select().from(sequencesTable).where(eq(sequencesTable.id, a.sequenceId)).limit(1);
      const steps = await db.select().from(sequenceStepsTable)
        .where(eq(sequenceStepsTable.sequenceId, a.sequenceId))
        .orderBy(sequenceStepsTable.stepNumber);

      const currentStepNum = a.currentStep ?? 1;
      const step = steps.find(s => s.stepNumber === currentStepNum) || steps[currentStepNum - 1];
      if (!step) return null;

      const dueDate = new Date(a.startedAt);
      dueDate.setDate(dueDate.getDate() + (step.dayOffset ?? 0));

      const [contact] = a.contactId !== "unassigned"
        ? await db.select().from(contactsTable).where(eq(contactsTable.id, a.contactId)).limit(1)
        : [null];
      const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, a.accountId)).limit(1);

      return {
        id: a.id,
        accountId: a.accountId, contactId: a.contactId, sequenceId: a.sequenceId,
        sequenceName: seq?.sequenceName,
        currentStep: currentStepNum, totalSteps: steps.length,
        step, dueDate: dueDate.toISOString(),
        channel: step.channel, objective: step.objective, angle: step.angle,
        queueStatus: new Date(dueDate) < new Date() ? "overdue" : "due",
        contactName: contact ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim() : "All Contacts",
        contactEmail: contact?.email, companyName: account?.companyName,
      };
    }))).filter(Boolean) as any[];

    const now = new Date();
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);

    let filtered = queue;
    if (filter === "today") filtered = queue.filter(i => new Date(i.dueDate) <= todayEnd);
    else if (filter === "overdue") filtered = queue.filter(i => new Date(i.dueDate) < now);
    else if (filter === "week") filtered = queue.filter(i => new Date(i.dueDate) <= weekEnd);

    if (channel) filtered = filtered.filter(i => i.channel?.toLowerCase() === channel.toLowerCase());

    filtered.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    res.json({ data: filtered, total: filtered.length });
  } catch (err) {
    req.log.error({ err }, "GET /api/execution-queue error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/execution-queue/:id/send", async (req, res) => {
  try {
    const [a] = await db.select().from(prospectSequencesTable).where(eq(prospectSequencesTable.id, req.params.id)).limit(1);
    if (!a) { res.status(404).json({ error: "Not found" }); return; }

    const steps = await db.select().from(sequenceStepsTable)
      .where(eq(sequenceStepsTable.sequenceId, a.sequenceId))
      .orderBy(sequenceStepsTable.stepNumber);
    const currentIdx = (a.currentStep ?? 1) - 1;
    const nextStep = (a.currentStep ?? 1) + 1;
    const isComplete = nextStep > steps.length;

    await db.update(prospectSequencesTable)
      .set({
        currentStep: isComplete ? a.currentStep : nextStep,
        status: isComplete ? "completed" : "active",
        completedAt: isComplete ? new Date() : null,
      })
      .where(eq(prospectSequencesTable.id, req.params.id));

    await db.insert(activitiesTable).values({
      accountId: a.accountId,
      contactId: a.contactId !== "unassigned" ? a.contactId : null,
      activityType: "outreach",
      channel: steps[currentIdx]?.channel || "email",
      subject: `Sequence step ${a.currentStep ?? 1} sent`,
      notes: req.body?.notes || null,
      outcome: "sent",
    });

    res.json({ success: true, completed: isComplete, nextStep: isComplete ? null : nextStep });
  } catch (err) {
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/execution-queue/:id/skip", async (req, res) => {
  try {
    const [a] = await db.select().from(prospectSequencesTable).where(eq(prospectSequencesTable.id, req.params.id)).limit(1);
    if (!a) { res.status(404).json({ error: "Not found" }); return; }
    const steps = await db.select().from(sequenceStepsTable).where(eq(sequenceStepsTable.sequenceId, a.sequenceId));
    const nextStep = (a.currentStep ?? 1) + 1;
    await db.update(prospectSequencesTable)
      .set({ currentStep: nextStep > steps.length ? a.currentStep : nextStep, status: nextStep > steps.length ? "completed" : "active" })
      .where(eq(prospectSequencesTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/execution-queue/:id/pause", async (req, res) => {
  try {
    await db.update(prospectSequencesTable).set({ status: "paused" }).where(eq(prospectSequencesTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "internal_error" });
  }
});

// ── Message Templates ─────────────────────────────────────────────────────

router.get("/message-templates", async (req, res) => {
  try {
    const { channel, icp, issueCode } = req.query as Record<string, string>;
    let rows = await db.select().from(messageTemplatesTable).orderBy(sql`${messageTemplatesTable.createdAt} desc`);
    if (channel) rows = rows.filter(r => r.channel?.toLowerCase() === channel.toLowerCase());
    if (icp) rows = rows.filter(r => !r.icp || r.icp === icp);
    if (issueCode) rows = rows.filter(r => !r.issueCode || r.issueCode === issueCode);
    res.json({ data: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/message-templates", async (req, res) => {
  try {
    const [row] = await db.insert(messageTemplatesTable).values({
      channel: req.body.channel || "email",
      icp: req.body.icp || null,
      issueCode: req.body.issueCode || null,
      tone: req.body.tone || null,
      stage: req.body.stage || null,
      variantName: req.body.variantName || req.body.name || "Untitled Template",
      subjectTemplate: req.body.subjectTemplate || req.body.subject_line || null,
      bodyTemplate: req.body.bodyTemplate || req.body.body_text || "",
      ctaStyle: req.body.ctaStyle || null,
      active: true,
    }).returning();
    res.status(201).json({ data: row });
  } catch (err) {
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
