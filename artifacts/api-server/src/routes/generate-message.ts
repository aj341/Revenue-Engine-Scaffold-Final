import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { settingsTable, analysesTable, contactsTable, accountsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();

const ISSUE_NAMES: Record<string, string> = {
  unclear_cta: "Unclear Call-to-Action",
  weak_hero: "Weak Hero Section",
  no_social_proof: "Missing Social Proof",
  poor_value_prop: "Poor Value Proposition",
  bad_mobile: "Poor Mobile Experience",
  slow_load: "Slow Page Load",
  confusing_nav: "Confusing Navigation",
  weak_copy: "Weak Copy",
  missing_trust: "Missing Trust Signals",
  no_personalization: "No Personalization",
  poor_seo: "Poor SEO",
  weak_design: "Weak Visual Design",
  no_analytics: "No Analytics Setup",
  poor_conversion: "Poor Conversion Path",
  unclear_pricing: "Unclear Pricing",
  weak_testimonials: "Weak Testimonials",
};

function buildPrompt(context: any, params: any): string {
  const issueDescriptions = (context.issue_codes || [])
    .map((code: string) => `${code} (${ISSUE_NAMES[code] || code})`)
    .join(", ");

  const strengthsList = (context.strengths || []).join(", ") || "none identified";
  const analysisSection = context.analysis_id
    ? `- Homepage Analysis: Primary issue ${context.issue_codes?.[0] || "unknown"}, Secondary ${context.issue_codes?.[1] || "unknown"}`
    : "";

  const wordTarget = params.word_count_target ?? (params.tone === "Concise" ? 50 : params.tone === "Direct" ? 70 : 80);

  return `You are an expert B2B outreach copywriter for a design subscription service called Design Bees.

PROSPECT CONTEXT:
- Company: ${context.company_name || "Unknown"} (${context.industry || "Unknown industry"})
- Contact: ${context.contact_name || "the decision maker"}, ${context.contact_title || ""}, Seniority: ${context.seniority_level || "unknown"}
- ICP Match: ${context.icp || "general"}
- Likely Issues: ${issueDescriptions || "general website issues"}
- Strengths: ${strengthsList}
${analysisSection}

GENERATION PARAMETERS:
- Channel: ${params.channel || "Email"}
- Tone: ${params.tone || "Consultative"}
- Stage: ${params.stage || "First Touch"}
- CTA Style: ${params.cta_style || "Permission"}
- Asset to Reference: ${params.asset_to_reference || "None"}
- Target Word Count: ${wordTarget}
- Personalization Level: ${params.personalization_level ?? 75}%

GUIDELINES:
1. Lead with a personalized insight. Avoid generic greetings like "I hope this finds you well."
2. Reference the company's specific situation using the analyzer findings and ICP context.
3. Keep messages concise and benefit-focused. No jargon.
4. End with a clear CTA matching the ${params.cta_style || "Permission"} style:
   - Permission: "Can I send you...", "Would you be open to..."
   - Interest: "Would you find it valuable if..."
   - Soft Close: "Let's find a time this week"
   - Direct: "Reply with your availability"
5. For Email: include a subject line (40-60 chars). For LinkedIn: keep under 300 chars. For Phone: provide 4-5 talking points.
6. Do NOT use emojis.
7. Vary each variant meaningfully — different angle, different opening, different CTA.
8. Format response as valid JSON array with exactly 3 variants.

OUTPUT FORMAT (JSON array, no markdown fences):
[
  {
    "variant": 1,
    "subject_line": "...",
    "body_text": "...",
    "cta": "...",
    "word_count": 65
  },
  {
    "variant": 2,
    "subject_line": "...",
    "body_text": "...",
    "cta": "...",
    "word_count": 58
  },
  {
    "variant": 3,
    "subject_line": "...",
    "body_text": "...",
    "cta": "...",
    "word_count": 71
  }
]

Generate the 3 variants now:`;
}

router.post("/generate-message", async (req, res) => {
  try {
    const { prospect_context, generation_params } = req.body;

    if (!prospect_context?.company_name && !prospect_context?.contact_name) {
      res.status(400).json({ error: "Please provide a company name or select a contact." });
      return;
    }

    const baseUrl = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
    const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

    if (!baseUrl || !apiKey) {
      res.status(503).json({ error: "Anthropic API not configured." });
      return;
    }

    const anthropic = new Anthropic({ baseURL: baseUrl, apiKey });

    const prompt = buildPrompt(prospect_context, generation_params || {});

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText = message.content[0]?.type === "text" ? message.content[0].text : "";

    let variants: any[] = [];
    try {
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        variants = JSON.parse(jsonMatch[0]);
      } else {
        variants = JSON.parse(rawText);
      }
    } catch {
      res.status(500).json({ error: "Failed to parse AI response. Please try again." });
      return;
    }

    res.status(200).json({
      data: {
        variants,
        channel: generation_params?.channel || "Email",
        tone: generation_params?.tone || "Consultative",
        stage: generation_params?.stage || "First Touch",
        cta_style: generation_params?.cta_style || "Permission",
      },
    });
  } catch (err: any) {
    req.log.error({ err }, "Message generation error");
    if (err?.status === 429) {
      res.status(429).json({ error: "Rate limit exceeded. Please try again in a moment." });
    } else {
      res.status(500).json({ error: "Message generation failed. Check your API configuration." });
    }
  }
});

export default router;
