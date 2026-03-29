import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  accountsTable,
  contactsTable,
  analysesTable,
  activitiesTable,
  opportunitiesTable,
} from "@workspace/db/schema";
import { eq, gte, count, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/metrics", async (req, res) => {
  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [[{ totalAccounts }], [{ totalContacts }], [{ accountsAnalyzed }], [{ callsBooked }], [{ positiveReplies }]] =
      await Promise.all([
        db.select({ totalAccounts: count() }).from(accountsTable),
        db.select({ totalContacts: count() }).from(contactsTable),
        db.select({ accountsAnalyzed: count() }).from(analysesTable),
        db
          .select({ callsBooked: count() })
          .from(opportunitiesTable)
          .where(gte(opportunitiesTable.bookedAt, weekAgo)),
        db
          .select({ positiveReplies: count() })
          .from(activitiesTable)
          .where(gte(activitiesTable.repliedAt, weekAgo)),
      ]);

    // Active prospects = contacts with in-progress status
    const [{ activeProspects }] = await db
      .select({ activeProspects: count() })
      .from(contactsTable)
      .where(
        sql`${contactsTable.outreachStatus} IN ('queued','contacted','replied','booked','held')`
      );

    res.json({
      data: {
        callsBookedThisWeek: Number(callsBooked),
        positiveRepliesThisWeek: Number(positiveReplies),
        activeProspects: Number(activeProspects),
        accountsAnalyzed: Number(accountsAnalyzed),
        tasksDueToday: 0,
        hotProspectsCount: 0,
        totalAccounts: Number(totalAccounts),
        totalContacts: Number(totalContacts),
        overallReplyRate: 0,
        closeRate: 0,
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

    const stages = stageCounts.map((s) => ({ stage: s.stage, count: Number(s.cnt) }));

    res.json({ data: { stages } });
  } catch (err) {
    req.log.error({ err }, "getPipeline error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/dashboard/activity-today", async (req, res) => {
  try {
    // Hot prospects: recently replied contacts
    const recentReplies = await db
      .select({
        contactId: activitiesTable.contactId,
        accountId: activitiesTable.accountId,
        repliedAt: activitiesTable.repliedAt,
      })
      .from(activitiesTable)
      .where(sql`${activitiesTable.repliedAt} IS NOT NULL`)
      .orderBy(sql`${activitiesTable.repliedAt} desc`)
      .limit(5);

    const hotProspects = await Promise.all(
      recentReplies.map(async (r) => {
        const [account] = await db
          .select()
          .from(accountsTable)
          .where(eq(accountsTable.id, r.accountId))
          .limit(1);
        const [contact] = await db
          .select()
          .from(contactsTable)
          .where(eq(contactsTable.id, r.contactId))
          .limit(1);
        return {
          id: account?.id ?? r.accountId,
          companyName: account?.companyName ?? "Unknown",
          contactName: contact?.fullName ?? null,
          icpType: account?.icpType ?? null,
          outreachStatus: contact?.outreachStatus ?? "replied",
          urgencyReason: "Recent reply — needs follow-up",
        };
      })
    );

    const recentActivities = await db
      .select()
      .from(activitiesTable)
      .orderBy(sql`${activitiesTable.sentAt} desc`)
      .limit(10);

    res.json({ data: { tasksDue: 0, hotProspects, recentActivities } });
  } catch (err) {
    req.log.error({ err }, "getActivityToday error");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
