# Design Bees Outbound Revenue Engine — Phase 4 Build Brief
## Reply Inbox, CRM Workflow, Call Prep, Opportunities

You are Replit Agent 3. Build Phase 4 of the Design Bees Outbound Revenue Engine, completing the reply handling and sales workflow layers.

## Context

Phase 1, 2, & 3 established:
- Project scaffold, auth, database schema
- Prospect import, account/contact detail pages
- Homepage analyser integration
- Insight library, message generator, sequence builder
- Execution queue for scheduling outreach

Phase 4 adds:
1. Reply inbox (auto-classification via AI)
2. Task queue and CRM workflow
3. Pipeline stage tracking (outreach status)
4. Call prep page with discovery questions
5. Opportunity pipeline (kanban board)
6. Post-call logging

## Tech Stack (Confirmed)
- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, React Query
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: Supabase PostgreSQL
- **External APIs**: Anthropic API (Reply Triage Agent, Call Prep Agent)

---

## 4A. Reply Inbox

### Reply Inbox Page (`/app/reply-inbox`)

**Layout**: Left sidebar (filters) + main list.

**Left Sidebar (Filters & Actions)**:
- **+ Log Reply** button (manual entry)
- **Filter**:
  - Classification: All / Positive / Neutral / Negative / Do Not Contact / Special Request
  - Urgency: All / Immediate / High / Medium / Low
  - Status: Unreviewed / Reviewed / Actioned / Archived
  - Date: Last 7 days / Last 30 days / All time
  - Channel: All / Email / LinkedIn / Phone
- **Sort**: Urgency (desc), Recency, Classification
- Show count: "X unreviewed, Y total"

**Main Content** (List View):
- Each reply item shows:
  - **Contact Name** (linked to contact detail page)
  - **Company Name** (linked to account detail page)
  - **Snippet** (first 100 chars of reply text, or custom preview)
  - **Classification Badge** (Positive / Neutral / Negative / Do Not Contact / Special Request; color-coded)
  - **Urgency Badge** (Immediate / High / Medium / Low; color-coded)
  - **Confidence Score** (% in parentheses; e.g., "Positive (92%)")
  - **Received Date & Time** (relative: "2 hours ago")
  - **Status Icon** (unreviewed = dot, reviewed = checkmark, actioned = checkmark + filled)
  - Click row to open Reply Detail panel

**Empty State**:
- "No replies yet. Once contacts reply to your outreach, they'll appear here."

### Reply Detail Panel (Side Slide-out)

Opens when clicking a reply item or "Log Reply" button.

**For Received Replies**:

1. **Reply Header**
   - Contact name, company, sequence position (if applicable)
   - Back button to close panel

2. **Full Reply Text**
   - Display complete reply message (plain text)
   - Copy button

3. **AI Classification** (auto-filled if from API, editable)
   - Classification: [Positive / Neutral / Negative / Do Not Contact / Special Request] — dropdown to override
   - Urgency: [Immediate / High / Medium / Low] — dropdown to override
   - Confidence: [92%] (read-only, greyed out)
   - Explanation: "Why this classification" (read-only tooltip)

4. **Suggested Next Action** (AI-generated)
   - Text: "Reply with [suggested_response]", "Book call ASAP", "Update fit score", "Pause sequence", etc.
   - Explanation: Brief reason why

5. **Draft Response** (AI-generated, editable)
   - Textarea with AI-drafted response message
   - Operator can edit or replace
   - Word count below
   - Channel selector: Email / LinkedIn / Phone

6. **Action Buttons** (bottom of panel):
   - "Send Reply" → logs activity, creates reply activity, updates contact outreach_status
   - "Create Task" → creates task record (type, due date, assigned to, description)
   - "Book Call" → opens modal to create opportunity with stage = "booked"
   - "Reassign" → modal to reassign to different contact (if multi-contact reply)
   - "Do Not Contact" → marks contact with do_not_contact = true, soft-skips from sequences
   - "Mark Reviewed" → updates reply.reviewed_at timestamp
   - "Archive Reply" → soft-deletes reply from active inbox

**For Manual Entry** ("Log Reply" button):

Modal or full-page form:
- **Contact** dropdown (required)
- **Company** (auto-filled from contact; read-only)
- **Received Date & Time** (default: now)
- **Channel** (dropdown: Email / LinkedIn / Phone)
- **Reply Text** (textarea, required)
- **Classify Button** → calls `/api/classify-reply` before saving
- **Save** button

After Save:
- Closes panel
- Refresh reply inbox
- Show toast: "Reply logged and classified"

### API Route: `/api/classify-reply`

**Endpoint**: `POST /api/classify-reply`

**Request body**:
```json
{
  "reply_text": "...",
  "contact_id": "uuid",
  "account_id": "uuid",
  "channel": "Email",
  "context": {
    "sequence_name": "SaaS Founder Sequence",
    "current_step": 2,
    "last_message_sent": "...",
    "contact_history": "..."
  }
}
```

**Logic**:
1. Validate inputs
2. Build prompt for Reply Triage Agent (see below)
3. Call Anthropic API (claude-opus or claude-sonnet):
4. Parse JSON response (expecting classification, urgency, next_action, suggested_response)
5. Create replies record:
   - contact_id, account_id
   - reply_text
   - channel
   - classification
   - urgency
   - confidence_score
   - suggested_next_action
   - draft_response
   - auto_classified (true)
   - reviewed_at (null until operator marks reviewed)
6. Return reply record with all fields

**Error Handling**:
- Missing API key: "Anthropic API key not configured. Set it in Settings."
- Rate limit: "API rate limit exceeded. Please try again in a moment."
- Invalid reply_text: "Reply text is required."
- API error: Return error with fallback classification: neutral / medium urgency

### Reply Triage Agent Prompt Template

```
You are an expert sales operations specialist. Analyze the following reply to a B2B SaaS outreach message and classify it into one of 5 categories.

CONTEXT:
- Contact: [contact_name], [contact_title] at [company_name]
- Sequence: [sequence_name], Step [current_step]
- Last Message Sent: "[last_message_excerpt]"
- Prior Contact History: [brief summary of prior interactions]

REPLY TEXT:
"[reply_text]"

CLASSIFY THE REPLY:
1. **Positive**: Contact is interested, asks questions, wants more info, or suggests next steps (meetings, calls, demos)
2. **Neutral**: Contact acknowledges, thanks, but doesn't show clear interest or disinterest (needs more engagement)
3. **Negative**: Contact is not interested, suggests contact person unfit, or gives clear rejection
4. **Do Not Contact**: Contact explicitly requests removal, marks as spam, or indicates hard bounce (unsubscribe)
5. **Special Request**: Contact asks for specific asset, introduction, or non-standard follow-up

URGENCY LEVELS (for positive/neutral/negative):
- **Immediate** (Positive only): Contact wants to jump on a call this week or next, or expresses high urgency
- **High**: Contact is interested and willing to move forward, but timeline is flexible
- **Medium**: Contact is exploring, might be interested with right context, asks clarifying questions
- **Low**: Contact is lukewarm, shows distant interest, or reply is generic

NEXT ACTION SUGGESTIONS:
- Positive + Immediate: "Book call ASAP, reference [their_question] on the call"
- Positive + High: "Send calendar invite for next week, offer 2-3 time slots"
- Positive + Medium: "Reply with case study, ask about [pain point]"
- Positive + Low: "Soft follow-up with one specific insight"
- Neutral: "Reply with value-add (tip, benchmark, resource)"
- Negative: "Pause sequence, move to 30-day re-engagement cadence"
- Do Not Contact: "Remove from all sequences, mark do_not_contact"
- Special Request: "Send requested asset, follow up with personalized note"

DRAFT RESPONSE:
Write a brief, personalized reply (30-100 words) that:
- Acknowledges their specific point/question
- Provides relevant context or insight
- Advances the conversation toward next step
- Matches tone (professional, not overly casual)

OUTPUT (JSON):
{
  "classification": "Positive" | "Neutral" | "Negative" | "Do Not Contact" | "Special Request",
  "urgency": "Immediate" | "High" | "Medium" | "Low" | null,
  "confidence_score": 0.92,
  "reasoning": "Brief explanation of classification logic",
  "suggested_next_action": "Book call ASAP...",
  "draft_response": "Thanks for your interest in [topic]..."
}

Analyze the reply now:
```

---

## 4B. CRM / Sales Workflow

### Tasks System

**Add Tasks Table** (if not already present):
- id (uuid)
- account_id, contact_id (at least one required)
- type (enum: follow_up, book_call, send_asset, update_record, reply_needed, check_in, proposal_due, objection_handling)
- title (string, 100 chars)
- description (text)
- due_at (timestamp)
- assigned_to_user_id (uuid, default: current user)
- status (enum: open, in_progress, done, cancelled)
- priority (enum: low, medium, high, urgent)
- created_at, updated_at
- created_by_user_id

**Tasks Page** (`/app/tasks`):

**Left Sidebar (Filters)**:
- **View**:
  - My Tasks (assigned_to_user_id = current user)
  - Team Tasks (all)
  - Overdue
  - Due Today
  - Due This Week
- **Filter**:
  - Type: Follow-up / Book Call / Send Asset / Update / Reply Needed / Check-in / Proposal Due / Objection
  - Priority: Low / Medium / High / Urgent
  - Status: Open / In Progress / Done / Cancelled
- **Sort**: Due Date (asc), Priority (desc), Created Date (desc)

**Main Content** (List or Kanban):

**List View** (default):
- Table with columns: Task, Account, Contact, Type, Due Date, Priority, Status, Assigned To
- Row click to open task detail
- Right-click menu: Edit, Mark Done, Delete, Assign to

**Kanban View** (optional):
- Columns: Open, In Progress, Done, Cancelled
- Cards grouped by status
- Drag to change status
- Each card shows: task title, account, due date, priority color

**Task Detail** (modal or side panel):
- All fields editable
- Description (full text)
- Account & contact links
- Related activity/reply (if created from reply classification)
- Comments section (optional)
- Save & close, Delete buttons

**Task Creation**:

Tasks are created automatically:
1. **From reply classification**: When reply is classified as "Positive" or "Special Request", offer to create task
2. **From sequence**: When manually skipping a step, prompt to create task instead
3. **From settings alert**: If no-show detected on opportunity (see section 4C)

Or manually via:
- Button "Create Task" on any contact/account detail page
- Tasks page "New Task" button

### Outreach Status Pipeline

Update the contacts table to include `outreach_status` field (enum):
- **new**: Contact never reached
- **queued**: Sequence assigned, waiting to send first message
- **contacted**: First message sent, no reply yet
- **replied**: Received reply (any classification)
- **booked**: Call booked (opportunity created with stage = booked)
- **held**: Call held (opportunity.held_at is not null)
- **closed_won**: Deal closed (opportunity.stage = closed_won)
- **closed_lost**: Deal closed (opportunity.stage = closed_lost)
- **do_not_contact**: Marked as do not contact

**Auto-update Logic**:
1. On first message sent (activity created with type = outreach): outreach_status = "contacted"
2. On reply received (reply created): outreach_status = "replied"
3. On opportunity created with stage = booked: outreach_status = "booked"
4. On opportunity.held_at set: outreach_status = "held"
5. On opportunity.stage = closed_won/lost: outreach_status = closed_*
6. Operator can manually override via contact detail page dropdown

**Pipeline View** (`/app/pipeline`):

Kanban-style view of all contacts:
- Columns: New, Queued, Contacted, Replied, Booked, Held, Closed Won, Closed Lost, Do Not Contact
- Cards grouped by outreach_status
- Card shows: contact name, company, priority tier, days in current stage, last activity date
- Drag to manually change status
- Click to open contact detail

---

## 4C. Call Prep

### Call Prep Page (`/app/call-prep`)

**Purpose**: Central hub for preparing for upcoming calls.

**Layout**: Left sidebar (call list) + main (prep brief).

**Left Sidebar (Upcoming Calls)**:
- Filter: Today / This Week / Next 2 Weeks / All Future
- Each opportunity listed:
  - Contact name, company name
  - Scheduled date & time
  - Days until call
  - Status: Ready / Prep Needed (if no prep brief generated yet) / In Progress / Completed
  - Click to select and load prep brief

**Main Content Area (Call Prep Brief)**:

When a call is selected, display the auto-generated brief:

1. **Call Header**
   - Contact name, title, company
   - Scheduled date, time, duration (default 30 min)
   - Edit button (changes date/time, updates opportunity.booked_at)

2. **Company Summary** (from account record)
   - Company name, industry, size, website
   - Known challenges (if in account notes)
   - ICP match, fit score

3. **Analyzer Findings** (snapshot from latest analysis)
   - Overall score
   - Primary issue, secondary issue
   - Top 3 metrics that are low
   - Key strengths detected

4. **Likely Pain Points** (from analysis + ICP)
   - Bulleted list of inferred pain points
   - Source: "From analyzer findings" or "From ICP: [icp_name]"

5. **Prior Messages & Replies** (brief context)
   - Show last 2-3 messages sent and replies received (truncated)
   - Focus on tone, themes, questions asked
   - "Full history available in contact detail page" link

6. **Assets Already Shared**
   - List any assets (case studies, calculators, etc.) already shared with this contact

7. **Discovery Questions** (AI-generated, 6-8 questions)
   - Open-ended questions designed to uncover pain, urgency, budget, decision-maker info
   - Example:
     - "How is your current homepage performing in terms of visitor-to-lead conversion?"
     - "What's your biggest frustration with your current homepage setup?"
     - "What does success look like for a redesign project for you?"
     - "What's the timeline you're working with?"
     - "Who else needs to be involved in this decision?"
   - Each question has a brief note about what to listen for

8. **Suggested Proof Points**
   - 2-3 relevant case studies, benchmarks, or specific examples
   - Example: "XYZ SaaS improved CTA clarity by 34% with our approach"

9. **Likely Objections & Reframes** (from common objection map)
   - If common objections exist for this ICP + issue cluster, show:
     - Objection: "We can redesign our own site"
     - Reframe: "Many startups try. Here's why most fail: [reason]. Here's how we approach it differently: [approach]"

10. **Asset / Content Angle to Discuss**
    - Recommended asset to reference on the call: "Homepage Analyzer results, Calculator demo, Brief Builder"
    - Why this asset: "Shows clear ROI on CTA clarity improvement"

11. **Desired Next Steps** (from opportunity record or playbook)
    - "Close: Proposal sent within 24h"
    - "Next stage: Follow-up call with finance/tech lead"

12. **Call Notes Editor** (textarea)
    - Pre-filled with empty notes
    - Operator can add notes during call or after

**Action Buttons**:
- "Generate Brief" (if not yet generated; calls `/api/call-prep`)
- "Print Brief" (exports to PDF or print-friendly format)
- "Start Call" (marks opportunity.call_started_at, opens post-call form when call ends)
- "Skip Call" (marks opportunity as no-show; creates follow-up task)

### API Route: `/api/call-prep`

**Endpoint**: `POST /api/call-prep`

**Request body**:
```json
{
  "opportunity_id": "uuid"
}
```

**Logic**:
1. Fetch opportunity record (with related account, contact, analyses, activities, replies)
2. Build prompt for Call Prep Agent (see below)
3. Call Anthropic API (claude-opus or claude-sonnet)
4. Parse JSON response (expecting discovery_questions, proof_points, objections, etc.)
5. Create/update call_preps table record (or store in opportunity.call_prep_json)
   - opportunity_id, generated_at, brief_data (JSON)
6. Return call prep brief

**Cache**: Cache the brief for 24 hours so it doesn't regenerate on every page load. Operator can manually regenerate.

### Call Prep Agent Prompt Template

```
You are an expert B2B sales consultant preparing a deal closer for an important discovery call. Generate a comprehensive call prep brief.

PROSPECT CONTEXT:
- Contact: [contact_name], [contact_title] at [company_name]
- Company: [industry], [size] employees
- ICP Match: [icp_profile]
- Fit Score: [score]%

OPPORTUNITY:
- Scheduled: [booked_at]
- Expected Duration: [duration, default 30 min]
- Stage: [current_stage]

RECENT INTERACTIONS:
- Last message sent: "[last_message_excerpt]"
- Last reply: "[last_reply_excerpt]"
- Prior tone/themes: [summary of prior conversation direction]

ANALYZER FINDINGS (if any):
- Overall score: [score]
- Primary issue: [issue_code] — [issue_name]
- Secondary issue: [issue_code] — [issue_name]
- Strengths detected: [list]

GENERATE:
1. **Discovery Questions** (6-8): Open-ended questions to ask on the call to uncover:
   - Current state / how they're measuring success
   - Key pain points and urgency
   - Budget and timeline
   - Decision-makers and buying process
   - Key assumptions/blockers
   - Each question with a brief note: "Listen for: [what to listen for]"

2. **Suggested Proof Points** (2-3): Relevant case studies, benchmarks, or examples that show credibility on the primary pain point

3. **Likely Objections** (3-4 objections + reframes):
   - Objection: [common objection for this ICP + issue cluster]
   - Reframe: [how to address/reframe]

4. **Key Asset to Use**: Which asset to reference on the call (Analyzer findings, Calculator, Brief Builder, Case Study) and why

5. **Desired Next Steps** (1-2): What closing action is ideal after this call? (Send proposal, schedule decision-maker call, etc.)

6. **Success Metrics**: How to measure a successful call (proposals sent, next call scheduled, budget confirmed, etc.)

OUTPUT (JSON):
{
  "discovery_questions": [
    {
      "question": "How is your current homepage performing in terms of visitor-to-lead conversion?",
      "listen_for": "Current metrics, satisfaction level, urgency to improve"
    }
  ],
  "proof_points": [
    {
      "company": "Acme SaaS",
      "metric": "Increased CTR by 34%",
      "reason": "Improved CTA clarity and prominence"
    }
  ],
  "likely_objections": [
    {
      "objection": "We can redesign our own site",
      "reframe": "Many startups try. Here's why most fail: [reason]. Here's how we approach it differently: [approach]"
    }
  ],
  "asset_to_use": {
    "asset": "Homepage Analyzer Results",
    "reasoning": "Shows clear ROI opportunity on their primary pain point"
  },
  "desired_next_steps": [
    "Send proposal within 24h of call",
    "Schedule follow-up with decision-maker"
  ],
  "success_metrics": "Proposal sent, next call scheduled with 2+ stakeholders"
}

Generate the call prep brief now:
```

### Post-Call Form

After the call ends (operator clicks "End Call"), prompt operator to log call outcomes:

**Modal Form**:
1. **Pain Confirmed?** (radio)
   - Yes, fully confirmed
   - Partially confirmed
   - Not confirmed / Different pain
   - Help text: "Did the contact agree their homepage has the issue(s) you discussed?"

2. **Urgency** (radio)
   - High (wants to move fast, budget/timeline confirmed)
   - Medium (interested, exploring options)
   - Low (interested in future, no clear timeline)

3. **Timeline** (dropdown)
   - This month / Next month / Q2 / Q3 / Undecided

4. **Decision Maker** (radio)
   - Contact is final decision maker
   - Contact is influencer, other DM exists
   - Contact is not involved in decision

5. **Current Design Setup** (textarea)
   - What design/platform are they currently using? (WordPress, Webflow, custom, etc.)

6. **Volume / Scale Needs** (text input)
   - What's the size/complexity of the project? (pages, sections, etc.)

7. **Update Fit Score** (slider 0-100)
   - Pre-filled with current fit_score
   - Operator can adjust based on new info

8. **Next Steps** (textarea)
   - What was agreed to? (send proposal, schedule follow-up, send calculator, etc.)

9. **Proposal Probability** (%)
   - Operator's estimate: likelihood of closing deal (0-100%)

10. **Objections Surfaced** (multi-select)
    - Show common objections list
    - Operator checks ones that came up
    - Add custom objection field

11. **Custom Notes** (textarea)
    - Any additional notes from the call

12. **Save** button

**On Save**:
- Update opportunity record:
  - pain_confirmed: yes/partial/no
  - urgency_level: high/medium/low
  - timeline: month/q2/q3/etc.
  - is_decision_maker: boolean
  - current_design_setup: string
  - fit_score: updated
  - proposal_probability: %
  - notes: string
  - held_at: current timestamp
- Create activity record (type = "call_held", opportunity_id, notes)
- Update contact.outreach_status = "held"
- Show toast: "Call logged! Next step: send proposal."
- Offer quick action: "Send Proposal Now" (opens message generator or proposal template)

---

## 4D. Opportunities Pipeline

### Opportunities Page (`/app/opportunities`)

**Layout**: Kanban board view.

**Header**:
- Title: "Opportunities Pipeline"
- View toggle: Kanban / Table / List
- Filter button: By ICP, By Stage, By Created Date
- Summary row: Total in pipeline, weighted value (sum of values in open opportunities)

**Kanban Board** (5 columns):

1. **Booked** (stage = "booked")
   - Cards for opportunities with scheduled date coming up
   - Card shows: contact name, company, value estimate, "Call in X days"

2. **Held** (stage = "held")
   - Cards for completed calls awaiting next step
   - Card shows: contact name, company, value estimate, fit score, pain confirmed (yes/no)

3. **Proposal Sent** (stage = "proposal_sent")
   - Cards for prospects who've received proposal
   - Card shows: contact name, company, value estimate, "Sent X days ago"

4. **Negotiation** (stage = "negotiation")
   - Cards for active deals in discussion
   - Card shows: contact name, company, value estimate, "In negotiation since X days"

5. **Closed Won** & **Closed Lost** (right side, summarized)
   - Show summary cards: "X won this month ($Y value)" and "Z lost"
   - Click to expand to see all

**Card Details**:
- Contact name, company name (both linked)
- Value estimate ($)
- Priority tier / ICP badge
- Days in current stage (color-coded: green < 7 days, yellow 7-14, red > 14)
- Last activity date
- Right-click menu: View Details, Update Stage, Add Note, Send Message, Close Deal

**Drag & Drop**:
- Drag card between columns to change stage
- On drop, update opportunity.stage
- Show confirmation toast: "Opportunity moved to [Stage]"

**Create Opportunity**:
- Button in header or from any contact/account detail page
- Modal form:
  - Select contact (required)
  - Company auto-filled
  - Value estimate (optional)
  - Booked date/time (if stage = booked)
  - Description (optional)
  - Create button

### Opportunity Detail Page (`/app/opportunities/[id]`)

**Layout**: Two-column — main content + right sidebar actions.

**Main Content**:

1. **Opportunity Header**
   - Contact name & link, company & link, opportunity value
   - Current stage (dropdown to change)
   - Created date, days in pipeline

2. **All Opportunity Fields** (editable inline):
   - booked_at, held_at (timestamps or date pickers)
   - pain_confirmed (dropdown: yes/partial/no)
   - urgency_level (dropdown: high/medium/low)
   - timeline (dropdown: month/q2/q3/etc.)
   - is_decision_maker (checkbox)
   - current_design_setup (text)
   - fit_score (slider)
   - proposal_probability (slider or %)
   - loss_reason (dropdown, only if stage = closed_lost): Budget / Feature Gap / Lost to Competitor / No Urgency / No Decision Maker / Other
   - win_reason (dropdown, only if stage = closed_won): ROI / Speed to Launch / Our Approach / Price / Personal Fit / Other
   - notes (textarea)

3. **Related Activities**
   - All activities for this opportunity (messages, calls, proposals sent)
   - Reverse chronological order
   - Type, timestamp, description

4. **Stage Transition History**
   - Timeline showing when stage changed and by whom
   - Visual timeline: Booked → Held → Proposal → Negotiation → Won/Lost

**Right Sidebar (Actions)**:
- **+ Add Note** button → inline textarea to add note to opportunity
- **Send Message** button → opens message generator with this opportunity context
- **Reschedule Call** button → date/time picker if stage = booked
- **Send Proposal** button → opens message generator with proposal template
- **Close Won** button → prompt for win_reason, sets stage = closed_won, updates contact.outreach_status = closed_won
- **Close Lost** button → prompt for loss_reason, sets stage = closed_lost, updates contact.outreach_status = closed_lost
- **Delete** button → soft delete or hard delete with confirm dialog

---

## 4E. No-Show Handling

**Auto-detect no-shows**:
- Daily job (or triggered on-demand):
  - Check for opportunities with stage = "booked" and booked_at is in the past (more than 24 hours ago)
  - If held_at is null (not marked as held), mark as no-show
  - Create task: type = "follow_up", title = "[Contact] – No-show follow-up", due = same day, assigned to contact's owner

**Operator Workflow**:
1. See no-show task in task queue
2. Review call prep brief for context
3. Log reply or send follow-up message via reply inbox
4. Mark task done

---

## Testing Checklist

When Phase 4 is complete, verify:

- [ ] Reply inbox loads all received replies, filterable by classification, urgency, status
- [ ] Manual reply entry: log reply, auto-classify via API
- [ ] Reply classification works (Positive, Neutral, Negative, Do Not Contact, Special Request)
- [ ] Draft response generated and editable
- [ ] Reply actions: Send Reply, Create Task, Book Call, Mark Reviewed, Archive all work
- [ ] Tasks created from reply classification and other sources
- [ ] Tasks page shows all open tasks, filterable by type, priority, status
- [ ] Task Kanban view: cards can be dragged between Open/In Progress/Done/Cancelled
- [ ] Outreach status pipeline: tracks contact progress from new → held → closed_won/lost
- [ ] Call prep page shows upcoming calls, loads prep brief
- [ ] API `/api/call-prep` generates discovery questions, proof points, objections
- [ ] Post-call form captures pain confirmed, urgency, timeline, fit score update, etc.
- [ ] Opportunities pipeline: Kanban board shows booked, held, proposal sent, negotiation, closed columns
- [ ] Opportunities can be dragged between columns to change stage
- [ ] Opportunity detail page shows all fields, editable, displays activity history
- [ ] Close Won/Close Lost buttons prompt for win/loss reason
- [ ] No-show detection: opportunities overdue without held_at marked, create follow-up task
- [ ] Contact outreach_status auto-updates: new → contacted → replied → booked → held → closed_won/lost
- [ ] Reply triage API handles errors gracefully (missing API key, rate limit, API error)
- [ ] Performance: list pages load instantly, call prep brief generates within 5 seconds
- [ ] All date/time pickers work, timezone handling correct
