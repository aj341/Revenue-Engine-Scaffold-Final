import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  accountsTable,
  contactsTable,
  analysesTable,
  activitiesTable,
  opportunitiesTable,
  repliesTable,
  tasksTable,
} from "@workspace/db/schema";
import { eq, gte, count, sql, and, isNull, lte } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/metrics", async (req, res) => {
  try {
    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const [[{ totalAccounts }], [{ totalContacts }], [{ accountsAnalyzed }], [{ callsBooked }], [{ positiveReplies }], [{ tasksDueToday }], [{ openOpps }]] =
      await Promise.all([
        db.select({ totalAccounts: count() }).from(accountsTable),
        db.select({ totalContacts: count() }).from(contactsTable),
        db.select({ accountsAnalyzed: count() }).from(analysesTable),
        db.select({ callsBooked: count() }).from(opportunitiesTable).where(gte(opportunitiesTable.bookedAt, weekAgo)),
        db.select({ positiveReplies: count() }).from(repliesTable).where(
          and(eq(repliesTable.classification, "Positive"), gte(repliesTable.receivedAt, weekAgo))
        ),
        db.select({ tasksDueToday: count() }).from(tasksTable).where(
          and(eq(tasksTable.status, "open"), lte(tasksTable.dueAt, todayEnd))
        ),
        db.select({ openOpps: count() }).from(opportunitiesTable).where(
          sql`${opportunitiesTable.stage} NOT IN ('closed_won', 'closed_lost')`
        ),
      ]);

    const [{ activeProspects }] = await db
      .select({ activeProspects: count() })
      .from(contactsTable)
      .where(sql`${contactsTable.outreachStatus} IN ('queued','contacted','replied','booked','held')`);

    // Reply rate: positive replies / total replies this week
    const [{ weeklyReplies }] = await db.select({ weeklyReplies: count() }).from(repliesTable).where(gte(repliesTable.receivedAt, weekAgo));
    const positiveCount = Number(positiveReplies);
    const totalReplies = Number(weeklyReplies);
    const replyRate = totalReplies > 0 ? Math.round((positiveCount / totalReplies) * 100) : 0;

    res.json({
      data: {
        callsBookedThisWeek: Number(callsBooked),
        positiveRepliesThisWeek: positiveCount,
        activeProspects: Number(activeProspects),
        accountsAnalyzed: Number(accountsAnalyzed),
        tasksDueToday: Number(tasksDueToday),
        hotProspectsCount: Number(openOpps),
        totalAccounts: Number(totalAccounts),
        totalContacts: Number(totalContacts),
        overallReplyRate: replyRate,
        closeRate: 0,
        openPipelineCount: Number(openOpps),
      },
    });
  } catch (err) {
    req.log.error({ err }, "getDashboardMetrics error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/dashboard/pipeline", async (req, res) => {
  try {
    const stageCounts = await db
      .select({ stage: contactsTable.outreachStatus, cnt: count() })
      .from(contactsTable)
      .groupBy(contactsTable.outreachStatus);

    const oppStages = await db
      .select({ stage: opportunitiesTable.stage, cnt: count() })
      .from(opportunitiesTable)
      .groupBy(opportunitiesTable.stage);

    const stages = stageCounts.map((s) => ({ stage: s.stage, count: Number(s.cnt) }));
    const oppsByStage = oppStages.map((s) => ({ stage: s.stage, count: Number(s.cnt) }));

    res.json({ data: { stages, oppsByStage } });
  } catch (err) {
    req.log.error({ err }, "getPipeline error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/dashboard/activity-today", async (req, res) => {
  try {
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // Hot prospects: unactioned positive replies
    const hotReplies = await db
      .select()
      .from(repliesTable)
      .where(and(eq(repliesTable.classification, "Positive"), isNull(repliesTable.actionedAt)))
      .orderBy(sql`${repliesTable.receivedAt} desc`)
      .limit(5);

    const hotProspects = await Promise.all(
      hotReplies.map(async (r) => {
        const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, r.accountId)).limit(1);
        const [contact] = await db.select().from(contactsTable).where(eq(contactsTable.id, r.contactId)).limit(1);
        return {
          id: r.id,
          accountId: r.accountId,
          companyName: account?.companyName ?? "Unknown",
          contactName: contact?.fullName ?? null,
          icpType: account?.icpType ?? null,
          outreachStatus: contact?.outreachStatus ?? "replied",
          urgencyReason: r.urgency ? `${r.urgency} urgency — ${r.suggestedNextAction || "needs follow-up"}` : "Positive reply — needs follow-up",
          channel: r.channel,
          urgency: r.urgency,
          receivedAt: r.receivedAt,
        };
      })
    );

    // Tasks due today
    const tasksDue = await db
      .select()
      .from(tasksTable)
      .where(and(eq(tasksTable.status, "open"), lte(tasksTable.dueAt, todayEnd)))
      .orderBy(sql`${tasksTable.dueAt} asc`)
      .limit(5);

    const tasksEnriched = await Promise.all(tasksDue.map(async (t) => {
      const [account] = t.accountId ? await db.select({ companyName: accountsTable.companyName }).from(accountsTable).where(eq(accountsTable.id, t.accountId)).limit(1) : [null];
      return { ...t, companyName: account?.companyName };
    }));

    // Upcoming calls (booked opps)
    const upcomingCalls = await db
      .select()
      .from(opportunitiesTable)
      .where(sql`${opportunitiesTable.stage} IN ('booked', 'held')`)
      .orderBy(sql`${opportunitiesTable.bookedAt} desc`)
      .limit(3);

    const callsEnriched = await Promise.all(upcomingCalls.map(async (o) => {
      const [account] = await db.select({ companyName: accountsTable.companyName }).from(accountsTable).where(eq(accountsTable.id, o.accountId)).limit(1);
      const [contact] = await db.select({ fullName: contactsTable.fullName, firstName: contactsTable.firstName, lastName: contactsTable.lastName }).from(contactsTable).where(eq(contactsTable.id, o.contactId)).limit(1);
      return { ...o, companyName: account?.companyName, contactName: contact?.fullName || `${contact?.firstName || ""} ${contact?.lastName || ""}`.trim() };
    }));

    const recentActivities = await db
      .select()
      .from(activitiesTable)
      .orderBy(sql`${activitiesTable.sentAt} desc`)
      .limit(10);

    res.json({ data: { tasksDue: tasksEnriched, hotProspects, recentActivities, upcomingCalls: callsEnriched } });
  } catch (err) {
    req.log.error({ err }, "getActivityToday error");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
