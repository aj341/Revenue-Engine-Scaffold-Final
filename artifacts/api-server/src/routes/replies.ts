import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { repliesTable, contactsTable, accountsTable, settingsTable } from "@workspace/db/schema";
import { eq, sql, desc, and, isNull } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();

router.get("/replies", async (req, res) => {
  try {
    const { classification, urgency, status, channel, accountId, contactId } = req.query as Record<string, string>;

    let query = db.select().from(repliesTable).$dynamic();
    const conditions: any[] = [];

    if (classification) conditions.push(eq(repliesTable.classification, classification));
    if (urgency) conditions.push(eq(repliesTable.urgency, urgency));
    if (channel) conditions.push(eq(repliesTable.channel, channel));
    if (accountId) conditions.push(eq(repliesTable.accountId, accountId));
    if (contactId) conditions.push(eq(repliesTable.contactId, contactId));
    if (status === "unreviewed") conditions.push(isNull(repliesTable.reviewedAt));
    if (status === "reviewed") conditions.push(sql`${repliesTable.reviewedAt} is not null`);
    if (status === "archived") conditions.push(sql`${repliesTable.archivedAt} is not null`);

    if (conditions.length) query = query.where(and(...conditions));
    const rows = await query.orderBy(desc(repliesTable.receivedAt));

    // Enrich with contact/account names
    const enriched = await Promise.all(rows.map(async (r) => {
      const [contact] = await db.select({ firstName: contactsTable.firstName, lastName: contactsTable.lastName, fullName: contactsTable.fullName, jobTitle: contactsTable.jobTitle }).from(contactsTable).where(eq(contactsTable.id, r.contactId)).limit(1);
      const [account] = await db.select({ companyName: accountsTable.companyName }).from(accountsTable).where(eq(accountsTable.id, r.accountId)).limit(1);
      return { ...r, contactName: contact?.fullName || `${contact?.firstName || ""} ${contact?.lastName || ""}`.trim() || "Unknown", contactTitle: contact?.jobTitle, companyName: account?.companyName };
    }));

    res.json({ data: enriched, total: enriched.length });
  } catch (err) {
    req.log.error({ err }, "listReplies error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/replies/:id", async (req, res) => {
  try {
    const [reply] = await db.select().from(repliesTable).where(eq(repliesTable.id, req.params.id)).limit(1);
    if (!reply) { res.status(404).json({ error: "not_found" }); return; }
    const [contact] = await db.select().from(contactsTable).where(eq(contactsTable.id, reply.contactId)).limit(1);
    const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, reply.accountId)).limit(1);
    res.json({ data: { ...reply, contact, account } });
  } catch (err) {
    req.log.error({ err }, "getReply error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/replies", async (req, res) => {
  try {
    const [reply] = await db.insert(repliesTable).values(req.body).returning();
    res.status(201).json({ data: reply });
  } catch (err) {
    req.log.error({ err }, "createReply error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.put("/replies/:id", async (req, res) => {
  try {
    const [reply] = await db.update(repliesTable).set({ ...req.body, updatedAt: new Date() }).where(eq(repliesTable.id, req.params.id)).returning();
    if (!reply) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ data: reply });
  } catch (err) {
    req.log.error({ err }, "updateReply error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.delete("/replies/:id", async (req, res) => {
  try {
    await db.delete(repliesTable).where(eq(repliesTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "deleteReply error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/classify-reply", async (req, res) => {
  try {
    const { reply_text, contact_id, account_id, channel = "Email", context = {} } = req.body;

    if (!reply_text?.trim()) {
      res.status(400).json({ error: "validation_error", message: "Reply text is required." });
      return;
    }
    if (!contact_id || !account_id) {
      res.status(400).json({ error: "validation_error", message: "contact_id and account_id are required." });
      return;
    }

    const userId = (req.session as any).userId || "system";
    const [settings] = await db.select().from(settingsTable).where(eq(settingsTable.userId, userId)).limit(1);

    const [contact] = await db.select().from(contactsTable).where(eq(contactsTable.id, contact_id)).limit(1);
    const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, account_id)).limit(1);

    const contactName = contact?.fullName || `${contact?.firstName || ""} ${contact?.lastName || ""}`.trim() || "Unknown Contact";
    const companyName = account?.companyName || "Unknown Company";

    let classification: string, urgency: string | null, confidenceScore: number, reasoning: string, suggestedNextAction: string, draftResponse: string;

    const apiKey = settings?.anthropicApiKey || process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
    const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;

    if (!apiKey && !baseURL) {
      classification = "Neutral";
      urgency = "Medium";
      confidenceScore = 0.5;
      reasoning = "Anthropic API key not configured. Using fallback classification.";
      suggestedNextAction = "Review and classify manually in Settings.";
      draftResponse = "Thank you for your reply. We'll follow up shortly.";
    } else {
      const clientConfig: any = { apiKey: apiKey || "placeholder" };
      if (baseURL) clientConfig.baseURL = baseURL;
      const anthropic = new Anthropic(clientConfig);

      const prompt = `You are an expert sales operations specialist. Analyze the following reply to a B2B outreach message and classify it.

CONTEXT:
- Contact: ${contactName}, ${contact?.jobTitle || "Unknown Title"} at ${companyName}
- Sequence: ${context.sequence_name || "Unknown Sequence"}, Step ${context.current_step || 1}
- Last Message Sent: "${context.last_message_sent || "Not available"}"

REPLY TEXT:
"${reply_text}"

CLASSIFY THE REPLY into one of these categories:
1. Positive: Contact is interested, asks questions, wants more info, or suggests next steps
2. Neutral: Contact acknowledges but doesn't show clear interest or disinterest
3. Negative: Contact is not interested or gives clear rejection
4. Do Not Contact: Contact explicitly requests removal or marks as spam
5. Special Request: Contact asks for specific asset, introduction, or non-standard follow-up

URGENCY (for Positive/Neutral only):
- Immediate: Wants to jump on a call this week or expresses high urgency
- High: Interested but flexible timeline
- Medium: Exploring, asks clarifying questions
- Low: Lukewarm or generic

OUTPUT JSON only, no other text:
{
  "classification": "Positive" | "Neutral" | "Negative" | "Do Not Contact" | "Special Request",
  "urgency": "Immediate" | "High" | "Medium" | "Low" | null,
  "confidence_score": 0.92,
  "reasoning": "Brief explanation",
  "suggested_next_action": "...",
  "draft_response": "30-100 word personalized reply"
}`;

      try {
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-5",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        });

        const text = response.content[0].type === "text" ? response.content[0].text : "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON in response");
        const parsed = JSON.parse(jsonMatch[0]);

        classification = parsed.classification || "Neutral";
        urgency = parsed.urgency || null;
        confidenceScore = parsed.confidence_score || 0.75;
        reasoning = parsed.reasoning || "";
        suggestedNextAction = parsed.suggested_next_action || "";
        draftResponse = parsed.draft_response || "";
      } catch (aiErr: any) {
        req.log.error({ aiErr }, "classify-reply AI error");
        classification = "Neutral";
        urgency = "Medium";
        confidenceScore = 0.5;
        reasoning = "AI classification failed. Using fallback.";
        suggestedNextAction = "Review manually.";
        draftResponse = "";
      }
    }

    const [reply] = await db.insert(repliesTable).values({
      contactId: contact_id,
      accountId: account_id,
      replyText: reply_text,
      channel,
      classification,
      urgency,
      confidenceScore,
      reasoning,
      suggestedNextAction,
      draftResponse,
      autoClassified: true,
      receivedAt: new Date(),
    }).returning();

    await db.update(contactsTable).set({ outreachStatus: "replied", updatedAt: new Date() }).where(eq(contactsTable.id, contact_id));

    res.status(201).json({ data: reply });
  } catch (err) {
    req.log.error({ err }, "classify-reply error");
    res.status(500).json({ error: "internal_error", message: "Classification failed." });
  }
});

export default router;
