# Design Bees Outbound Revenue Engine — Phase 3 Build Brief
## Insight Library, Message Generator, Sequence Builder

You are Replit Agent 3. Build Phase 3 of the Design Bees Outbound Revenue Engine, focusing on the operator-facing messaging and sequence orchestration layer.

## Context

Phase 1 & 2 established:
- Project scaffold, auth, full database schema, basic layout
- Dashboard, accounts list, contacts list, settings
- CSV import for accounts and contacts
- Account and contact detail pages
- Homepage analyser API integration and analyses display
- Issue cluster explorer

Phase 3 adds:
1. Insight library (view, edit, manage, import insight blocks)
2. Message generator workspace (the core messaging engine)
3. Sequence builder (define multi-step cadences)
4. Prospect sequence assignment and execution queue
5. Integration with Anthropic API for message generation

## Tech Stack (Confirmed)
- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, React Query
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: Supabase PostgreSQL
- **External APIs**: Anthropic API (keys in settings), Message Writer Agent

---

## 3A. Insight Library

### Insight Library Page (`/app/insight-library`)

**Layout**: Left sidebar filters + main content area.

**Left Sidebar (Filters)**:
- **Issue Code**: Checkboxes for all 16 issue codes, with count of insights per code
- **ICP**: Checkboxes for ICPs the insight is tagged for (saas_founder, design_agency, etc.)
- **Channel**: Checkboxes (Email, LinkedIn, Phone)
- **Status**: Checkboxes (Active, Inactive)
- **Search**: Text input to search by keyword in short_insight_line or business_consequence
- **Apply Filters** button
- **+ Create New Insight** button (opens insight editor)
- **Bulk Import** button (opens file picker to import JSON)

**Main Content**:

**View Toggle**: Table or Card view options

**Table View** (default):
- Columns: Short Insight Line, Issue Code, ICP, Channel, Active, Usage Count (if data exists), Reply Rate (if data exists), Actions
- Sort by: Short insight line (A-Z), Issue code, ICP, Date created, Usage count, Reply rate
- Click row to open Insight Block Editor
- Pagination (20 per page)
- Show result count: "Showing X of Y insight blocks"

**Card View**:
- Grid of cards, one per insight block
- Each card shows:
  - Short insight line (truncated if long)
  - Issue code badges
  - ICP tags
  - Channel icons
  - Active/Inactive badge
  - Usage count (if > 0)
  - Click to open editor
  - Right-click context menu: Edit, Delete, Duplicate, Download JSON

**Empty State**:
- "No insight blocks yet. Create one or import seed data."
- Button: "Import Seed Data"

### Insight Block Editor (`/app/insight-library/[id]` or `/app/insight-library/new`)

**Layout**: Two-column — form on left, preview on right.

**Left Column (Form)**:
- **Short Insight Line** (text, 50-100 chars recommended)
  - Help text: "The hook or attention-grabber for the first line"
  - Live character count

- **Business Consequence** (textarea, 100-200 chars)
  - Help text: "The problem or pain the prospect is experiencing"

- **Full Insight Block** (textarea, markdown-supported)
  - Help text: "Complete insight paragraph (2-3 sentences). Can include context, data point, or surprising stat."

- **Issue Codes** (multi-select)
  - Dropdown with all 16 issue codes
  - Can select multiple
  - Required: at least one

- **ICPs** (multi-select)
  - Dropdown with all 8 ICP profiles
  - Can select multiple

- **Channels** (checkboxes)
  - Email, LinkedIn, Phone
  - At least one required

- **CTA Style** (select)
  - Options: Permission, Interest, Soft Close, Direct
  - Help text: "What kind of call-to-action pairs best with this insight?"

- **Related Assets** (multi-select, optional)
  - Show all 6 Design Bees assets
  - User can tag which assets pair well with this insight

- **Status** (radio)
  - Active / Inactive

- **Save** and **Cancel** buttons
- **Delete** button (if editing existing; confirm dialog)
- **Duplicate** button (if editing existing; creates copy with "(copy)" suffix)

**Right Column (Preview)**:
- Live preview of how the insight line would appear in a typical email message
- Shows: "Hi [First Name], I noticed that [business_consequence]. [Full insight block]"
- Updates as user types
- Shows word count
- Below preview: Markdown rendering of the full insight block

**Behavior**:
- On Save:
  - Validate required fields
  - Create or update insight_blocks record
  - Show toast: "Insight saved!"
  - Redirect to insight library list (if new), stay on page (if editing)
- On Delete:
  - Show confirm dialog: "Delete this insight? This cannot be undone."
  - On confirm, delete record
  - Redirect to insight library list

### Bulk Import from JSON

**Bulk Import Modal** (`/app/insight-library/import`):
- File picker for JSON file
- Accept button, Cancel button
- Show preview of insights to be imported
- Validation: ensure all required fields present
- On import:
  - Upsert insight_blocks (by short_insight_line, assume unique)
  - Show import summary: "Imported X insight blocks, skipped Y duplicates"

**Seed Data File Format**:
```json
{
  "insight_blocks": [
    {
      "short_insight_line": "Most homepages don't articulate the core value proposition",
      "business_consequence": "Visitors leave confused about what you do",
      "full_insight_block": "I was reviewing your homepage and noticed the value prop isn't crystal clear in the hero. Most B2B sites make visitors work too hard to understand the core benefit. This usually leads to higher bounce rates.",
      "issue_codes": ["unclear_value_prop", "weak_hero"],
      "icps": ["saas_founder", "design_agency"],
      "channels": ["Email", "LinkedIn"],
      "cta_style": "Permission",
      "related_assets": [],
      "active": true
    }
  ]
}
```

### Admin Actions

**In Settings page, add a new "Data Management" section**:
- Button: "Import Seed Insight Blocks" → opens bulk import modal
- Button: "Export All Insights as JSON" → downloads JSON file
- Display: "Total insight blocks: X, Active: Y, Inactive: Z"

---

## 3B. Message Generator Workspace

This is the primary interface for creating outreach. It's a critical page for operator experience.

### Message Generator Page (`/app/message-generator`)

**Layout**: Three-column design — left (context), center (output), right (controls).

**Left Column (Prospect Context)**:

1. **Prospect Selector**
   - Radio buttons: "Use Existing Contact" or "Enter Details Manually"

   **If "Use Existing Contact"**:
   - Select account dropdown (required)
   - Dynamically populates contacts list below
   - Select contact dropdown (shows name, email, title)
   - On select:
     - Auto-fill all prospect context from database
     - Load analyzer findings (if analysis exists)
     - Load pain map results
     - Show matched ICP
     - Load available insight blocks for this prospect's issues

   **If "Enter Details Manually"**:
   - Text field: Company Name (required)
   - Text field: Industry (optional)
   - Text field: Contact Name (optional)
   - Multi-select: Issue Codes (optional, shows matching insight blocks)
   - Multi-select: Strengths (optional, pull from analysis or let operator type)

2. **Prospect Context Panel** (read-only, updates dynamically)
   - **Company**: Name, Industry, Website, Fit Score (if exists)
   - **Contact**: Name, Email, Title, Seniority Level
   - **ICP Match**: Matched ICP profile name and fit score
   - **Analyzer Findings**: (if analysis exists)
     - Primary issue: code + name
     - Secondary issue: code + name
     - Overall score
     - Button: "View Full Analysis"
   - **Available Insights**: List of insight_blocks matching the prospect's issue codes
     - Show: short insight line, CTA style, channels available
     - Click to preview insight block in message generator

**Right Column (Controls & Settings)**:

1. **Channel Selection** (radio buttons)
   - Email (icon)
   - LinkedIn DM (icon)
   - Phone (text for talking points)
   - On select, update message variants to show channel-appropriate versions

2. **Message Tone** (dropdown or radio buttons)
   - Concise: Short, direct, 40-60 words
   - Consultative: Thoughtful, research-backed, 70-100 words
   - Direct: Assertive, benefit-focused, 60-80 words
   - Default: Consultative

3. **Stage Selector** (dropdown)
   - First Touch
   - Follow-up 1
   - Follow-up 2
   - Follow-up 3
   - Follow-up 4
   - Breakup
   - Each stage changes the prompt context (opener, urgency, CTA approach)

4. **CTA Style** (dropdown)
   - Permission: "Can I send you...", "Would you be open to..."
   - Interest: "Would you find it valuable if...", "What if I showed you..."
   - Soft Close: "Let's find a time this week"
   - Direct: "Let's talk Monday at 2pm", "Reply with your availability"

5. **Asset to Reference** (dropdown, optional)
   - None (default)
   - Homepage Analyzer Result (if analysis exists)
   - Calculator (Design Bees tool)
   - Brief Builder (Design Bees tool)
   - Portfolio Link
   - Case Study Link
   - Webinar/Video Link
   - On select, updates message prompt to include asset positioning

6. **Advanced Options** (collapsible)
   - Word count target: slider 40-150 words (default varies by tone)
   - Personalization level: slider 0-100% (affects depth of insight)
   - Industry-specific language: toggle
   - Urgency level: Low / Medium / High

7. **Generate Button** (prominent, centered)
   - On click:
     - Validate prospect context (at least company + issue or contact selected)
     - Disable button, show spinner
     - Call `/api/generate-message`
     - On success, populate center panel with variants
     - On error, show error toast

**Center Column (Message Output)**:

**Default State** (before generation):
- Prompt: "Select a prospect and settings on the left, then click Generate."
- Show a diagram of how the generator works

**After Generation**:
- Display 3 message variants side-by-side (or stacked on mobile)
- Each variant card shows:

  **For Email**:
  - Label: "Variant 1 — [Tone] | [CTA Style]"
  - **Subject Line** (bold, 40-60 chars, in box)
  - **Body Text** (regular, word count below)
  - Highlight the CTA in blue background
  - Action buttons below:
    - Copy to Clipboard
    - Save as Template
    - Expand (fullscreen view)
    - Send (logs activity; not actual email yet)

  **For LinkedIn**:
  - Label: "Variant 1 — [Tone] | [CTA Style]"
  - **Message Body** (140-500 chars typically)
  - Highlight the CTA
  - Action buttons: Copy, Save as Template, Expand, Send

  **For Phone**:
  - Label: "Variant 1 — [Tone] | [CTA Style]"
  - **Talking Points** (bulleted list, 3-5 points)
  - Opening line
  - Pain point confirmation
  - Insight to share
  - CTA
  - Objection handle (if applicable)
  - Action buttons: Copy, Save as Template, Expand

- **Feedback Row** below variants:
  - "How was this output?" [Thumbs Up] [Thumbs Down]
  - Optional text: "Tell us what could improve..."
  - On feedback submit, send to `/api/feedback` for learning

**Expanded Message View** (modal or full screen):
- Single message displayed larger
- Full editing interface (textarea)
- Save edited version as template button
- Copy button
- Close button

### Save as Template Modal

When user clicks "Save as Template":
- Prompt for template name
- Optional: tags (free-form or select from existing)
- Optional: description
- Checkbox: "Save for this prospect only" or "Save as reusable template"
- Save button

Creates message_templates record.

### API Route: `/api/generate-message`

**Endpoint**: `POST /api/generate-message`

**Request body**:
```json
{
  "prospect_context": {
    "company_name": "Acme Corp",
    "industry": "SaaS",
    "contact_name": "John Doe",
    "contact_email": "john@acme.com",
    "contact_title": "VP Marketing",
    "icp": "saas_founder",
    "issue_codes": ["unclear_cta", "weak_hero"],
    "strengths": ["mobile responsive", "good trust signals"],
    "analysis_id": "uuid" (optional)
  },
  "generation_params": {
    "channel": "Email",
    "tone": "Consultative",
    "stage": "First Touch",
    "cta_style": "Permission",
    "asset_to_reference": null,
    "word_count_target": 70,
    "personalization_level": 75,
    "industry_specific_language": true,
    "urgency_level": "Medium"
  }
}
```

**Logic**:
1. Validate inputs
2. Build prompt for Message Writer Agent (see below)
3. Retrieve user's Anthropic API key from settings
4. Call Anthropic API (claude-opus or claude-sonnet):
   ```
   system: "You are an expert B2B SaaS outreach copywriter. Generate 3 message variants for [channel]..."
   user: [built prompt with all context]
   ```
5. Parse response (expecting 3 JSON-formatted variants with subject_line, body, cta)
6. Return 3 variants in structured format
7. Optionally save to generated_messages table for analytics

**Error Handling**:
- Missing API key: "Anthropic API key not configured. Set it in Settings."
- Rate limit: "API rate limit exceeded. Please try again in a moment."
- Invalid context: "Please provide a company name or select a contact."
- API error: Show user-friendly error message

### Message Writer Agent Prompt Template

```
You are an expert B2B SaaS outreach copywriter. Your goal is to generate 3 highly personalized, effective outreach messages.

PROSPECT CONTEXT:
- Company: [company_name] ([industry])
- Contact: [contact_name], [contact_title], Seniority: [seniority_level]
- ICP Match: [icp_profile]
- Likely Issues: [issue_codes] - [issue_descriptions]
- Strengths: [strengths_list]
[If analysis exists:]
- Homepage Analysis: Primary issue [code] (score X/100), Secondary [code]

GENERATION PARAMETERS:
- Channel: [Email/LinkedIn/Phone]
- Tone: [Concise/Consultative/Direct]
- Stage: [First Touch/Follow-up X/Breakup]
- CTA Style: [Permission/Interest/Soft Close/Direct]
- Asset to Reference: [asset or None]
- Target Word Count: [40-150 depending on tone]
- Personalization Level: [0-100]%

GUIDELINES:
1. Lead with a personalized insight about [primary_issue_code]. Avoid generic greetings.
2. Reference [company_name]'s specific situation if possible (use analyzer findings, ICP profile, industry context).
3. Keep messages concise and benefit-focused. Avoid jargon.
4. End with a clear, specific CTA matching the [CTA_style].
5. Tone should be [tone] — match the appropriate energy level.
6. For [channel], follow platform conventions (subject line for email, 280-char limit for LinkedIn DM, etc.).
7. Do NOT use emojis unless explicitly permitted.
8. Format the response as valid JSON with 3 variants, each with fields: subject_line (email only), body_text, cta, word_count.

OUTPUT (JSON):
[
  {
    "variant": 1,
    "subject_line": "...", // email only
    "body_text": "...",
    "cta": "...",
    "word_count": 62
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

Generate the 3 variants now:
```

---

## 3C. Sequence Builder

### Sequences List Page (`/app/sequences`)

**Layout**: Left sidebar (filters/actions) + main table.

**Left Sidebar**:
- **+ Create New Sequence** button (opens sequence editor)
- **Import Seed Sequences** button
- Filter by:
  - ICP (checkboxes)
  - Issue Cluster (checkboxes)
  - Status: Active / Inactive
  - Sort: Name A-Z, Date Created, # Steps

**Main Content** (Table):
- Columns: Sequence Name, Target ICP, Issue Cluster(s), # Steps, Status (Active/Inactive), Usage Count (# prospects assigned), Avg Reply Rate (if data exists)
- Click row to open sequence editor
- Right-click context menu: Edit, Duplicate, Deactivate/Activate, Export JSON, Delete

**Empty State**:
- "No sequences yet. Create one or import seed data."

### Sequence Editor (`/app/sequences/[id]` or `/app/sequences/new`)

**Layout**: Left sidebar (step list) + center (step editor) + right (sequence settings).

**Left Sidebar (Step Timeline)**:
- Visual timeline showing each step as a card
- Each step card displays:
  - Step number (1, 2, 3, etc.)
  - Day offset (e.g., "Day 0", "Day 3", "Day 7")
  - Channel icon (email, LinkedIn, phone)
  - Brief objective (e.g., "Intro + hook", "Value-add follow-up", "Breakup")
- Click card to select step (highlights selected)
- **+ Add Step** button at bottom (inserts new step before or after selected)
- **- Remove Step** button (deletes selected step; confirm dialog)
- Drag to reorder steps (drag-and-drop)

**Center Panel (Step Details Editor)**:
- Appears when a step is selected
- **Step Number & Day Offset**:
  - Display: "Step 1 of 5"
  - Input: Day offset (0-90)
  - Help text: "Days after sequence starts to send this step"

- **Channel** (radio):
  - Email / LinkedIn / Phone
  - Changes available message template type

- **Objective** (text input, 50 chars)
  - Help text: "What's the goal of this step? (e.g., 'Introduce solution', 'Social proof')"

- **Angle / Hook** (textarea, 100-200 chars)
  - Help text: "The opening insight or angle for this step. What makes this step different from prior steps?"

- **Asset to Use** (dropdown, optional):
  - None
  - Homepage Analyzer Result
  - Calculator
  - Brief Builder
  - Portfolio
  - Case Study
  - Webinar

- **CTA Type** (dropdown):
  - Permission / Interest / Soft Close / Direct
  - Adjusted per stage (softer for early steps, more direct for later)

- **Message Template** (dropdown):
  - Filter to show templates matching: channel + cta_type + angle
  - Or button: "Generate Message" (opens message generator with step context pre-filled)
  - Show template name and preview

- **Custom Message** (textarea, optional):
  - Allow operator to override template with custom text
  - Show word count

- **Save Step** button

**Right Panel (Sequence Settings)**:
- **Sequence Name** (text input)
- **Description** (textarea)
- **Target ICP(s)** (multi-select)
- **Issue Cluster(s)** (multi-select)
- **Channel Mix** (display, read-only, auto-calculated):
  - "3 emails, 2 LinkedIn, 0 phone"
- **Overall CTA Strategy** (dropdown):
  - Soft → Moderate → Assertive
  - Shows recommended CTA type per step
- **Asset Strategy** (dropdown):
  - Lead with Asset → Use Asset Mid-Sequence → No Assets
- **Status** (radio):
  - Active / Inactive
- **Save Sequence** button
- **Duplicate Sequence** button (if editing existing)
- **Delete Sequence** button (confirm dialog)

**Behavior**:
- On Save:
  - Validate: sequence has 3-8 steps, each has unique day offset, at least 1 ICP tagged
  - Create/update sequences record
  - Create/update sequence_steps records
  - Show toast: "Sequence saved!"
- Preview sequence: Show timeline view with all steps

### Assign Sequence to Prospect

**From Account Detail Page, "Assign Sequence" Button**:
1. Opens modal: "Assign Sequence"
2. Dropdown: Select sequence
   - Show only active sequences
   - Filter by matched ICP (if account has matched ICP)
3. Dropdown: Start date (default: today)
4. Checkbox: "Manually review each message before sending" (default: checked for early adopters)
5. Assign button

**On Assign**:
1. Create prospect_sequences record:
   - account_id
   - contact_id (if specific contact selected) or null (all contacts)
   - sequence_id
   - started_at (today or selected date)
   - current_step (1)
   - status ("active")
2. Show toast: "Sequence assigned!"
3. Display on account detail page: "Sequence: [Name], Step 1 of 5, due in 1 day"

### Execution Queue Page (`/app/execution-queue`)

**Purpose**: Single view of all messages due to send today/overdue.

**Layout**: Left sidebar (filters) + main list.

**Left Sidebar**:
- **Filter**:
  - Due: Today / Overdue / This Week / All
  - Channel: All / Email / LinkedIn / Phone
  - Status: Due to Send / Sent / Skipped / On Hold
- **Sort**: Due Date (ascending), Contact Name

**Main Content** (Table or List):
- Group by "Due Today" (overdue = red, due today = blue, due tomorrow = gray)
- Each item shows:
  - Contact name, company name
  - Sequence name, step number (e.g., "SaaS Founder Sequence — Step 2 of 5")
  - Channel icon
  - Objective / angle (preview)
  - Due date/time
  - Action buttons: View Message, Send Now, Skip, Pause, Edit

**View Message Button**:
- Opens a side panel or modal showing the templated message for this step
- All tokens filled in (contact name, company, etc.)
- Operator can review, edit, or send

**Send Button**:
- Creates activity record (type = "outreach", channel, prospect_id, content)
- Marks prospect_sequences.current_step += 1
- Updates next due date
- Shows toast: "Message sent!"
- Moves item off list

**Skip Button**:
- Marks step as skipped
- Moves current_step forward
- Creates activity note: "Skipped step X (reason: manual skip)"

**Pause Button**:
- Sets prospect_sequences.status = "paused"
- Shows toast: "Sequence paused. Click to resume from Settings."

**Edit Button**:
- Opens message editor (same as message generator)
- Allows operator to tweak message before sending
- Save edits and send, or cancel

### Bulk Sequence Operations

**In Sequences list, add checkboxes**:
- Select multiple sequences
- Bulk actions: Activate All, Deactivate All, Export as JSON

---

## 3D. Seed Data

### Seed Sequences JSON Format

```json
{
  "sequences": [
    {
      "name": "SaaS Founder — First Response",
      "icp": ["saas_founder"],
      "issue_clusters": ["unclear_cta", "weak_hero"],
      "channel_mix": ["email", "email", "linkedin", "email"],
      "steps": [
        {
          "step_number": 1,
          "day_offset": 0,
          "channel": "email",
          "objective": "Introduce yourself and homepage insight",
          "angle": "Most homepages don't articulate the core value prop clearly",
          "asset": null,
          "cta_style": "Permission",
          "message_template_id": "template_uuid_1"
        },
        {
          "step_number": 2,
          "day_offset": 3,
          "channel": "email",
          "objective": "Value-add: relevant case study or tip",
          "angle": "Here's how other SaaS founders improved their homepage CTR by 40%",
          "asset": "case_study",
          "cta_style": "Interest",
          "message_template_id": "template_uuid_2"
        }
      ]
    }
  ]
}
```

### Admin Import Action

In Settings page, "Data Management" section:
- Button: "Import Seed Sequences" → opens file picker
- On import, creates all sequences and steps

---

## Testing Checklist

When Phase 3 is complete, verify:

- [ ] Insight library page loads with all insights, filterable by issue code, ICP, channel
- [ ] Insight block editor: create, edit, delete insights
- [ ] Insight preview shows how insight appears in message
- [ ] Bulk import of insight blocks from JSON works
- [ ] Message generator loads, accepts prospect selection (existing or manual)
- [ ] Prospect context populates correctly (company, contact, ICP, analysis findings)
- [ ] Message generator generates 3 variants on button click
- [ ] Each variant displays subject line (email), body, CTA, word count
- [ ] Copy, Save Template, Send buttons work
- [ ] Message variants update when settings change (tone, channel, stage, CTA style)
- [ ] Feedback (thumbs up/down) can be submitted
- [ ] Sequences list shows all sequences, sortable, filterable
- [ ] Sequence editor: add, edit, delete, reorder steps
- [ ] Step cards update with day offset, channel, objective
- [ ] Assign sequence from account detail page works
- [ ] Execution queue shows all due messages, grouped by due date
- [ ] Send, Skip, Pause, Edit buttons work in execution queue
- [ ] Activity records created on Send
- [ ] prospect_sequences.current_step increments after Send
- [ ] Seed data can be imported (insights, sequences)
- [ ] API `/api/generate-message` calls Anthropic API and returns 3 variants
- [ ] Error handling: missing API key, rate limit, invalid context all handled gracefully
- [ ] Performance: message generation < 5 seconds, list pages load instantly
