# Homepage Analyser API Integration Spec

## Overview
Integrate the existing Design Bees Homepage Analyser API into the Outbound Revenue Engine. This analyser is the primary signal generator for outbound — it examines a prospect's website and returns structured findings that drive issue clustering, pain mapping, and message generation.

## API Details

### Base URL
```
https://striking-prosperity-production-b017.up.railway.app/api
```

### Authentication
None required.

### Content-Type
`application/json`

### Endpoints

#### 1. Create Analysis
```
POST /analyses
Body: { "url": "https://example.com" }
Response: { "id": "uuid", "url": "...", "status": "pending", ... }
```

#### 2. Check Status
```
GET /analyses/{id}/status
Response: { "status": "pending" | "processing" | "completed" | "failed" }
```

#### 3. Get Full Result
```
GET /analyses/{id}
```

#### 4. List All Analyses
```
GET /analyses
```

#### 5. Health Check
```
GET /healthz
Response: { "status": "ok" }
```

---

## Full Response Schema (from GET /analyses/{id})

```typescript
interface AnalysisResult {
  id: string;                    // UUID
  url: string;                   // The URL that was analyzed
  status: "pending" | "processing" | "completed" | "failed";
  screenshotUrl: string | null;  // Relative path e.g. "/api/screenshots/{id}_{hash}.png"
  screenshotWidth: number | null;
  screenshotHeight: number | null;
  overallScore: number;          // 0-100

  findings: Finding[];           // Array of 15-25 findings typically
  scores: CategoryScore[];       // Array of 5 category scores

  summary: string;               // 2-3 sentence executive summary
  pageIntent: string;            // e.g. "SaaS / Software", "eCommerce", "Agency"
  error: string | null;

  createdAt: string;             // ISO 8601
  completedAt: string | null;    // ISO 8601
}

interface Finding {
  id: string;                    // e.g. "f1", "f2"
  type: "strength" | "weakness";
  category: string;              // e.g. "Value Proposition", "Social Proof", "CTA Effectiveness", "Feature Communication", "Pricing Clarity"
  title: string;                 // Short finding headline
  evidence: string;              // What was observed on the page
  suggestion: string;            // Recommended fix
  x: number;                     // Position on page (percentage)
  y: number;                     // Position on page (percentage)
  width: number;                 // Size of finding region (percentage)
  height: number;                // Size of finding region (percentage)
}

interface CategoryScore {
  name: string;                  // "Value Proposition", "Feature Communication", "Social Proof", "Pricing Clarity", "CTA Effectiveness"
  score: number;                 // 0-100
  description: string;           // Explanation of the score
}
```

---

## Integration Implementation

### 1. Settings Page — API Configuration
Add to the Settings page:
```
Homepage Analyser API URL: [https://striking-prosperity-production-b017.up.railway.app/api]
```
Store this in a settings/config table so it can be changed without code changes.

### 2. Analysis Flow (from Account Detail Page)

**Step 1: Trigger Analysis**
- User clicks "Run Analysis" on Account detail page
- Pre-fill URL from account's `website_url` field
- Allow user to edit the URL before submitting
- POST to `{analyser_base_url}/analyses` with `{ "url": "..." }`
- Save the returned `id` and set status to "pending"

**Step 2: Poll for Completion**
- After creating, poll `GET /analyses/{id}/status` every 5 seconds
- Show a loading spinner with "Analyzing..." status
- Typical analysis takes 60-90 seconds
- On status = "completed", fetch full result
- On status = "failed", show error message

**Step 3: Store Result**
- Fetch full result from `GET /analyses/{id}`
- Map the response to the local `analyses` table:

```typescript
// Mapping from API response to local analyses table
{
  id: generateLocalId(),
  account_id: currentAccount.id,
  domain: extractDomain(result.url),
  page_url: result.url,
  page_type: result.pageIntent,
  analyzed_at: result.completedAt,

  // Map category scores
  hero_clarity_score: findScore(result.scores, "Value Proposition"),
  CTA_clarity_score: findScore(result.scores, "CTA Effectiveness"),
  CTA_prominence_score: findScore(result.scores, "CTA Effectiveness"), // same category
  visual_hierarchy_score: findScore(result.scores, "Feature Communication"),
  message_order_score: findScore(result.scores, "Feature Communication"),
  outcome_clarity_score: findScore(result.scores, "Value Proposition"),
  trust_signal_score: findScore(result.scores, "Social Proof"),
  friction_score: 100 - result.overallScore, // inverse of overall
  mobile_readability_score: null, // not scored separately by API

  // Map findings to issue codes
  primary_issue_code: mapToIssueCode(getTopWeakness(result.findings, 1)),
  secondary_issue_code: mapToIssueCode(getTopWeakness(result.findings, 2)),
  tertiary_issue_code: mapToIssueCode(getTopWeakness(result.findings, 3)),

  // Text fields
  issue_summary_short: result.summary,
  issue_summary_detailed: JSON.stringify(result.findings),
  strengths_detected_json: JSON.stringify(result.findings.filter(f => f.type === "strength")),
  recommended_priority_fix: getTopWeakness(result.findings, 1)?.suggestion || null,
  confidence_score: result.overallScore,
  raw_notes_json: JSON.stringify(result),
  screenshot_url: result.screenshotUrl
    ? `${analyser_base_url}${result.screenshotUrl.replace('/api/', '/')}`
    : null
}
```

### 3. Finding-to-Issue-Code Mapping

Map the API's finding categories and titles to the standard issue taxonomy:

```typescript
function mapToIssueCode(finding: Finding): string {
  const category = finding.category;
  const title = finding.title.toLowerCase();
  const evidence = finding.evidence.toLowerCase();

  // Category-based mapping
  if (category === "Value Proposition") {
    if (title.includes("vague") || title.includes("generic") || title.includes("unclear"))
      return "HERO_TOO_GENERIC";
    if (title.includes("offer") || title.includes("buries") || title.includes("anchor"))
      return "UNCLEAR_OFFER";
    if (title.includes("feature") || title.includes("process before"))
      return "FEATURE_FIRST_MESSAGING";
    return "WEAK_ABOVE_FOLD_STRUCTURE";
  }

  if (category === "CTA Effectiveness") {
    if (title.includes("competing") || title.includes("dilute") || title.includes("multiple"))
      return "TOO_MANY_COMPETING_ELEMENTS";
    if (title.includes("soft") || title.includes("weak") || title.includes("lacks"))
      return "CTA_TOO_SOFT";
    if (title.includes("outcome") || title.includes("dead end") || title.includes("no form"))
      return "CTA_NOT_OUTCOME_TIED";
    return "CTA_TOO_SOFT";
  }

  if (category === "Social Proof") {
    if (title.includes("testimonial") || title.includes("quote") || title.includes("review"))
      return "MISSING_SOCIAL_PROOF";
    if (title.includes("trust") || title.includes("badge") || title.includes("credibility"))
      return "LOW_TRUST_SIGNAL_VISIBILITY";
    return "MISSING_SOCIAL_PROOF";
  }

  if (category === "Pricing Clarity") {
    if (title.includes("comparison") || title.includes("differentiation"))
      return "SLOW_DECISION_PATH";
    return "HIGH_COGNITIVE_LOAD";
  }

  if (category === "Feature Communication") {
    if (title.includes("hierarchy"))
      return "WEAK_VISUAL_HIERARCHY";
    if (title.includes("vague") || title.includes("undersold"))
      return "FEATURE_FIRST_MESSAGING";
    if (title.includes("cluttered") || title.includes("unclear"))
      return "CLUTTERED_LAYOUT";
    return "FEATURE_FIRST_MESSAGING";
  }

  // Fallback keyword matching
  if (title.includes("mobile") || title.includes("responsive"))
    return "POOR_MOBILE_READABILITY";
  if (title.includes("navigation") || title.includes("friction"))
    return "FRICTION_HEAVY_NAVIGATION";
  if (title.includes("segment") || title.includes("audience"))
    return "MISSING_SEGMENT_CLARITY";
  if (title.includes("cognitive") || title.includes("overwhelming"))
    return "HIGH_COGNITIVE_LOAD";

  return "WEAK_ABOVE_FOLD_STRUCTURE"; // safe default
}
```

### 4. Analysis Detail Page Display

Show the analysis result with:

**Score Dashboard:**
- Overall score as a large circular gauge (0-100, color-coded: red < 50, amber 50-70, green > 70)
- 5 category scores as horizontal bars with labels and scores
- Category names: Value Proposition, Feature Communication, Social Proof, Pricing Clarity, CTA Effectiveness

**Findings Panel:**
- Split into two columns: Strengths (left) and Weaknesses (right)
- Each finding shows: category badge, title, evidence text, suggestion text
- Findings sorted by category
- Weakness findings get an "Issue Code" badge showing the mapped issue code

**Screenshot Panel:**
- If screenshotUrl exists, show the full page screenshot
- Overlay finding positions on the screenshot using the x, y, width, height coordinates (percentage-based)
- Color-code overlays: green for strengths, red for weaknesses

**Summary:**
- Executive summary text
- Page intent badge
- Mapped issue codes with severity
- "Generate Outreach" button → opens Message Generator with this analysis context pre-loaded

### 5. Bulk Analysis

On the Accounts list page, add a "Bulk Analyze" button:
- Select multiple accounts via checkboxes
- Triggers sequential analysis for each (to avoid overwhelming the API)
- Shows progress: "Analyzing 3 of 12..."
- Updates each account as results come in
- Rate limit: max 1 concurrent analysis at a time, 10-second delay between starts

### 6. Screenshot Access

Screenshots are served from the analyser API at:
```
https://striking-prosperity-production-b017.up.railway.app/api/screenshots/{filename}
```
The `screenshotUrl` field in the response gives the relative path. Construct the full URL by prepending the base URL.

### 7. Error Handling

- If the analyser API is unreachable, show "Analyser service unavailable — check Settings"
- If an analysis fails (status = "failed"), show the error message and offer retry
- If polling exceeds 3 minutes, timeout and show "Analysis taking longer than expected — try again"
- Log all API errors to the events table for debugging

---

## Give This to Replit Agent

Copy this entire file and paste it into Replit Agent with the instruction:

> "Integrate the Homepage Analyser API into the app using this spec. The API is already live and working. Wire it into the Account detail page, create the Analysis detail page, and implement the finding-to-issue-code mapping. Follow this spec exactly."
