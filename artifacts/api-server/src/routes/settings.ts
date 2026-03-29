import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const SYSTEM_USER_ID = "system";

router.get("/settings", async (req, res) => {
  try {
    const userId = (req.session as any)?.userId || SYSTEM_USER_ID;
    let [settings] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.userId, userId))
      .limit(1);

    if (!settings) {
      // Create default settings
      [settings] = await db
        .insert(settingsTable)
        .values({ userId })
        .returning();
    }

    res.json({
      data: {
        id: settings.id,
        defaultSenderEmail: settings.defaultSenderEmail,
        defaultSenderName: settings.defaultSenderName,
        homepageAnalyserApiUrl: settings.homepageAnalyserApiUrl,
        hasAnthropicKey: !!settings.anthropicApiKeyEncrypted,
        hasOpenaiKey: !!settings.openaiApiKeyEncrypted,
        hasAnalyserKey: !!settings.homepageAnalyserApiKey,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      },
    });
  } catch (err) {
    req.log.error({ err }, "getSettings error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/settings", async (req, res) => {
  try {
    const userId = (req.session as any)?.userId || SYSTEM_USER_ID;
    const {
      defaultSenderEmail,
      defaultSenderName,
      homepageAnalyserApiUrl,
      anthropicApiKey,
      openaiApiKey,
      analyserApiKey,
    } = req.body;

    const updateData: Record<string, unknown> = {
      defaultSenderEmail: defaultSenderEmail ?? null,
      defaultSenderName: defaultSenderName ?? null,
      homepageAnalyserApiUrl: homepageAnalyserApiUrl ?? null,
      updatedAt: new Date(),
    };

    // Only update key fields if non-empty values are provided
    if (anthropicApiKey) updateData.anthropicApiKeyEncrypted = anthropicApiKey;
    if (openaiApiKey) updateData.openaiApiKeyEncrypted = openaiApiKey;
    if (analyserApiKey) updateData.homepageAnalyserApiKey = analyserApiKey;

    const [existing] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.userId, userId))
      .limit(1);

    let settings;
    if (existing) {
      [settings] = await db
        .update(settingsTable)
        .set(updateData)
        .where(eq(settingsTable.userId, userId))
        .returning();
    } else {
      [settings] = await db
        .insert(settingsTable)
        .values({ userId, ...updateData })
        .returning();
    }

    res.json({
      data: {
        id: settings.id,
        defaultSenderEmail: settings.defaultSenderEmail,
        defaultSenderName: settings.defaultSenderName,
        homepageAnalyserApiUrl: settings.homepageAnalyserApiUrl,
        hasAnthropicKey: !!settings.anthropicApiKeyEncrypted,
        hasOpenaiKey: !!settings.openaiApiKeyEncrypted,
        hasAnalyserKey: !!settings.homepageAnalyserApiKey,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      },
    });
  } catch (err) {
    req.log.error({ err }, "saveSettings error");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
