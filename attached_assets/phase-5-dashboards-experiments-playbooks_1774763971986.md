# Design Bees Outbound Revenue Engine — Phase 5 Build Brief
## Dashboards, Experiments, Playbooks, Asset Performance, Polish

You are Replit Agent 3. Build Phase 5 of the Design Bees Outbound Revenue Engine, completing the analytics, experimentation, and operational excellence layers.

## Context

Phase 1-4 established:
- Project scaffold, auth, database schema
- Prospect import and detail pages
- Homepage analyser integration
- Insight library, message generator, sequence builder
- Reply inbox and CRM workflow
- Call prep and opportunities pipeline

Phase 5 completes:
1. Full operational dashboard with KPIs and performance widgets
2. Experiment center for A/B testing and optimization
3. Playbook (operational guidelines and best practices)
4. Asset performance tracking (Design Bees tools)
5. Polish: exports, search, responsive design, keyboard shortcuts, performance targets

## Tech Stack (Confirmed)
- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, React Query
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: Supabase PostgreSQL
- **External APIs**: Anthropic API (Experiment Analyst Agent, Playbook Writer Agent)

---

## 5A. Full Dashboard

Replace the Phase 1 dashboard stub with the complete operational dashboard.

### Main Dashboard Page (`/app/dashboard`)

**Layout**: Header with date range selector + responsive grid of widgets.

**Header**:
- Title: "Dashboard"
- Date range selector (dropdown): Today / This Week / This Month / Last 30 Days / Custom (date picker)
- Refresh button (manual data refresh)
- View selector: Full / Compact (hides less important widgets)

**KPI Cards Row** (always visible at top):

Each card shows:
- Metric name (label)
- Current value (large, bold)
- Trend vs. prior period (% change, with up/down arrow, green/red color)
- Optional: Small sparkline chart

1. **Calls Booked This Week**
   - Query: Count opportunities where stage = "booked" and booked_at is in selected week
   - Trend: vs. previous week

2. **Positive Replies This Week**
   - Query: Count replies where classification = "positive" and received_at is in selected week
   - Trend: vs. previous week

3. **Reply Rate by Channel** (two-card: Email & LinkedIn)
   - Email Reply Rate: (replies_received / messages_sent) % for email channel
   - LinkedIn Reply Rate: same for LinkedIn channel
   - Show both in separate cards or one card with two numbers

4. **Meetings Booked by ICP** (summary)
   - Show top 3 ICPs with count of booked meetings this month
   - "SaaS Founders: 8 | Design Agencies: 5 | Enterprise: 3"

5. **Show Rate** (held / booked)
   - Calculate: (opportunities.held_at not null / booked at) %
   - Trend: vs. previous period

6. **Close Rate** (won / held)
   - Calculate: (closed_won / held) %
   - Trend: vs. previous period

7. **Active Prospects by Stage**
   - Count of contacts where outreach_status is not null
   - Display: "145 Active prospects in pipeline"
   - Breakdown: "23 booked, 8 held, 5 in negotiation, 3 won"

8. **Tasks Due Today**
   - Count of tasks where status = "open" and due_at is today
   - Show as single number
   - Clicking opens task queue filtered to today

**Dashboard Widgets Grid** (scrollable, responsive):

Widgets can be reordered (drag-and-drop) and hidden (eye icon toggle). Save widget preferences in user preferences.

1. **Pipeline Snapshot** (Bar Chart)
   - Y-axis: Number of opportunities
   - X-axis: Stages (Booked, Held, Proposal Sent, Negotiation, Closed Won)
   - Color-coded bars
   - Hover shows exact count
   - Click bar to jump to opportunities page filtered by stage

2. **Activity Today** (List)
   - Show last 10 activities logged today (outreach sent, reply received, call held, etc.)
   - Type icon, timestamp (relative: "2 hours ago"), contact name, description
   - Click to open related record

3. **Response Time Alerts** (Alert List)
   - Flag any replies received more than 5 minutes ago that haven't been reviewed
   - Show count: "2 replies waiting review"
   - Click to jump to reply inbox

4. **Upcoming Calls** (List)
   - Next 7 calendar days
   - Contact name, company, date, time
   - Color-coded: Today (blue), tomorrow (gray), later (light gray)
   - Click to open call prep page

5. **Top Issue Clusters** (Bar Chart)
   - Y-axis: Issue code
   - X-axis: Count of positive replies from accounts with this issue
   - Show top 5-8 issue codes
   - Hover: count and engagement rate
   - Insight: "Accounts with [issue] are replying 45% of the time"

6. **Best Performing Hooks** (Table)
   - Rank top 5 first-touch message lines by reply rate
   - Columns: Hook (truncated), ICP, Reply Rate, Sample Size
   - Click to view full message template
   - Color-code high (green), medium (yellow), low (red) performing

7. **Best Performing CTAs** (Table)
   - Rank top 5 CTA styles by response rate
   - Columns: CTA Style, Channel, Response Rate, Sample Size
   - Insight: "Direct CTAs on follow-up 3 have highest reply rate (38%)"

8. **Channel Performance** (Comparison Table or Dual Bar Chart)
   - Email: messages sent, replies received, reply rate, positive rate
   - LinkedIn: same metrics
   - Phone: calls scheduled, calls held, show rate
   - Side-by-side comparison

9. **ICP Performance** (Table)
   - Rank all ICPs by reply rate, booked rate, close rate
   - Columns: ICP, Reply Rate, Booked Rate, Close Rate
   - Click ICP name to filter all other dashboard metrics to that ICP

10. **Sequence Performance** (Table)
    - Rank all sequences by positive reply rate (and volume)
    - Columns: Sequence Name, ICP, Volume (# prospects), Reply Rate, Booked Rate
    - Sort: by reply rate or volume
    - Filter: only active sequences

11. **Objection Trends** (Pie Chart or Bar Chart)
    - Show most common objection codes logged this week
    - Top 5-8 objections with count
    - Insight: "Budget objections up 20% week-over-week"

12. **Win/Loss Reasons** (Pie Chart)
    - Closed Won: show breakdown of win reasons (ROI, Speed to Launch, etc.) as pie slices
    - Closed Lost: show breakdown of loss reasons (Budget, Competitor, etc.)
    - Can toggle between won and lost

**Widget Customization**:
- Drag corners to resize widgets (some have min/max width)
- Right-click or click icon to hide widget
- Restore hidden widgets via settings
- Save layout per user

---

## 5B. Experiment Center

### Experiments Page (`/app/experiments`)

**Layout**: Left sidebar (actions/filters) + main list/detail.

**Left Sidebar**:
- **+ Create Experiment** button
- **Filter**:
  - Status: Active / Completed / Draft / Archived
  - Variable: Subject Line / First Line / CTA Type / Channel / Issue Cluster / Sequence Family / Asset Timing / ICP / Industry
  - Created: Last 7 days / Last 30 days / All time
  - Sort: By Date Created, By Status, By Results

**Main Content** (Table View):
- Columns: Hypothesis, Variable Tested, Status, Sample Size (control + test), Date Created, Result
- Click row to open Experiment Detail page
- Right-click menu: View Details, Duplicate, Archive, Delete

**Empty State**:
- "No experiments yet. Create one to start testing."

### Create Experiment Modal / Page

**Form Fields**:

1. **Experiment Name** (text input, required)
   - Example: "Subject Line Test: Question vs. Statement"

2. **Hypothesis** (textarea, 100-200 chars)
   - What are you testing and why?
   - Example: "Short question-based subject lines will have higher open rates than statement-based lines"

3. **Variable Tested** (dropdown, required)
   - Options: Subject Line, First Line, CTA Type, Channel, Issue Cluster, Sequence Family, Asset Timing, ICP Segment, Industry Segment
   - Help text explaining what each means

4. **Control Variant** (textarea, 200-300 chars)
   - Description of control (the baseline)
   - Example: "Standard statement subject line: 'Homepage Analysis: Your Key Findings'"

5. **Test Variant** (textarea, 200-300 chars)
   - Description of test variant
   - Example: "Question-based subject line: 'Is Your Homepage Clear Enough?'"

6. **Target Segment** (multi-select, optional)
   - ICP: Checkboxes for each ICP (run test on all ICPs, or specific ones)
   - Industry: Checkboxes for specific industries
   - Priority Tier: Low / Medium / High / Strategic
   - Help: "Leave blank to test on all prospects"

7. **Start Date** (date picker)
   - When to activate the experiment
   - Default: today

8. **End Date** (date picker)
   - When to close the experiment (auto-close on this date)
   - Suggested: 7-30 days from start

9. **Minimum Sample Size** (number input, optional)
   - Example: 30 (don't close experiment until we have 30 samples in each variant)
   - Default: 20

10. **Create** button

**On Create**:
- Create experiments record:
  - status = "draft"
  - variable_tested, hypothesis, control_variant, test_variant
  - target_segment_filters (JSON)
  - started_at, ended_at (or null if not set)
  - created_by_user_id
- Redirect to experiment detail page
- Show toast: "Experiment created. Activate it to start testing."

### Experiment Detail Page (`/app/experiments/[id]`)

**Layout**: Two columns — main content + right sidebar.

**Main Content**:

1. **Experiment Header**
   - Name, hypothesis
   - Status badge (Draft / Active / Completed / Archived)
   - Variable tested label
   - Activate button (if draft)

2. **Variants Side-by-Side Comparison**
   - Two boxes: Control | Test
   - Each shows:
     - Variant description
     - Sample size: "N = 45 prospects"
     - Metrics:
       - Positive reply rate: 31%
       - Booked rate: 7%
       - Message-to-held rate: 4%
       - Close rate: 0% (if not enough data)
     - Visual comparison (side-by-side bars or percentage difference callout)

3. **Statistical Significance Indicator**
   - Display: "Not yet significant (need 30 samples per variant)" or "Statistically significant (p < 0.05)" with badge
   - If p-value available, show confidence level

4. **Results Summary** (editable)
   - Textarea: "Control outperformed test by 12% in reply rate. Recommending control for main sequence."
   - Edit button

5. **Decision** (dropdown, optional)
   - Options: Not Decided, Winner: Control, Winner: Test, Inconclusive, Needs More Data
   - When set, shows on experiments list

6. **Rollout Status** (if experiment completed)
   - "Ready to rollout" if clear winner
   - Rollout button: "Apply test variant to [sequence/channel/segment]"

**Right Sidebar**:
- **Experiment Settings** (editable):
  - Started At, Ended At (date pickers)
  - Min sample size (number input)
  - Target segment summary (ICPs, industries, etc.)
- **Actions**:
  - Activate button (if draft)
  - Pause button (if active)
  - Analyze button (triggers Experiment Analyst agent, see below)
  - Edit button (reopens form)
  - Duplicate button
  - Archive button
  - Delete button

### Analyze Experiment

**"Analyze" Button** opens Experiment Analyst Agent request:

Calls `/api/analyze-experiment` which:
1. Fetches experiment data + performance metrics
2. Builds prompt for Experiment Analyst Agent
3. Calls Anthropic API
4. Parses response (what's working, what's failing, recommendation, next experiment)
5. Stores analysis result on experiments record

**Experiment Analyst Agent Prompt Template**:

```
You are an expert experimental design analyst. Analyze the results of this A/B test and provide actionable insights.

EXPERIMENT:
- Hypothesis: [hypothesis]
- Variable Tested: [variable]
- Control: [control_variant_description]
- Test: [test_variant_description]

RESULTS:
Control Variant:
- Sample size: [n_control]
- Positive reply rate: [x]%
- Booked rate: [y]%
- Held rate: [z]%
- Close rate: [w]%

Test Variant:
- Sample size: [n_test]
- Positive reply rate: [x']%
- Booked rate: [y']%
- Held rate: [z']%
- Close rate: [w']%

STATISTICAL SIGNIFICANCE: [significant or not; p-value if available]
TARGET SEGMENT: [ICPs, industries tested]
RUN DURATION: [start to end date]

ANALYSIS:
1. **What's Working**: What did the test variant do well (if anything)? What metrics improved?
2. **What's Failing**: What underperformed? By how much?
3. **Recommendation**: Which variant should be used going forward? Why?
4. **Confidence Level**: How confident are you in this recommendation (low/medium/high)?
5. **Next Experiment**: What should you test next to build on these learnings?
6. **Audience Insights**: Did results vary significantly by ICP or segment? Which segment should get this treatment?

OUTPUT (JSON):
{
  "whats_working": "...",
  "whats_failing": "...",
  "recommendation": "winner_control | winner_test | inconclusive",
  "confidence_level": "high",
  "next_experiment_suggestion": "...",
  "audience_insights": "...",
  "key_takeaway": "One sentence summary of the most important learning"
}

Analyze the experiment now:
```

---

## 5C. Playbook

### Playbook Page (`/app/playbook`)

**Purpose**: Living document of operational guidelines, best practices, and tribal knowledge.

**Layout**: Left sidebar (sections) + main content (rendered markdown).

**Left Sidebar (Categories)**:
- **Daily Workflow** (collapsible)
  - Morning standup checklist
  - Daily message sending guidelines
  - Reply inbox triage process
  - Daily review checklist
  - Evening wrap-up

- **Weekly Workflow**
  - Weekly analytics review
  - Sequence performance review
  - Playbook update meeting notes
  - Win/loss analysis
  - Team calibration call agenda

- **First Touch Rules**
  - Opener structure (hook, insight, CTA)
  - Word count targets (50-100)
  - Personalization depth
  - Asset strategy (when to reference analyzer, calculator, etc.)
  - Do's and don'ts

- **Follow-up Rules**
  - Follow-up 1: structure, timing, angle (value-add focus)
  - Follow-up 2: structure, timing, angle (urgency intro)
  - Follow-up 3: structure, timing, angle (breakup consideration)
  - Follow-up 4+: when to use, when to retire

- **Asset Rules**
  - When to share Homepage Analyzer results
  - When to share Calculator
  - When to share Brief Builder
  - When to share Portfolio/Case Study
  - Sequencing: how many assets per sequence

- **Call Rules**
  - Call prep checklist
  - Discovery questions framework
  - Objection handling approach
  - Post-call logging
  - No-show follow-up protocol

- **Experiment Rules**
  - When to run experiments
  - Minimum sample size
  - Test duration guidelines
  - Statistical significance threshold
  - When to pause experiment

- **Objection Handling**
  - Common objections by ICP
  - Common objections by issue cluster
  - Reframes and responses
  - When to escalate

**Main Content Area**:
- Rendered markdown of selected section
- Full-width text area with markdown support
- Syntax highlighting for code blocks (if any)
- Edit button (slides to edit mode)

**Edit Mode**:
- Markdown textarea (full width)
- Live preview below
- Save & Publish button
- Cancel button
- Show: "Last edited by [user] on [date]"
- Show version history dropdown

**Version History**:
- Dropdown showing all versions
- Each version shows: date, edited by, first 50 chars of change
- Click to view diff or revert to version

**Actions**:
- **Refresh Playbook** button (top of page)
  - Calls Playbook Writer Agent with recent performance data
  - Shows modal: "Updating playbook from latest performance data..."
  - Updates playbook_entries with AI-generated recommendations
  - Show toast: "Playbook refreshed with latest insights"

### Playbook Writer Agent Prompt Template

```
You are an expert sales operations specialist. Update the operational playbook based on recent performance data and best practices.

RECENT PERFORMANCE DATA (Last 30 days):
- Best performing sequence: [sequence_name] ([reply_rate]% reply rate)
- Best performing message hook: "[hook_line]" ([reply_rate]% reply rate)
- Best performing CTA: [cta_style] ([response_rate]% response rate)
- Best performing ICP: [icp_name] ([reply_rate]% reply rate)
- Best performing channel: [channel] ([reply_rate]% reply rate)
- Common objections: [objection_codes with frequency]
- Win reasons: [win_reasons with frequency]
- Loss reasons: [loss_reasons with frequency]
- Average days from booked to held: [days]
- Show rate: [%]
- Close rate: [%]

CURRENT PLAYBOOK SECTION: [section_name]
CURRENT PLAYBOOK CONTENT: [full markdown of current section]

UPDATE APPROACH:
1. Preserve existing structure and formatting
2. Update recommendations based on recent performance data
3. Add new insights from recent wins/losses
4. Remove or soften guidance that contradicts recent results
5. Highlight what's working and scaling
6. Add warnings about what's not working

OUTPUT (Markdown):
[Updated playbook section with enhanced guidelines, data-driven insights, and specific recommendations]

Generate the updated playbook section now:
```

### Seed Data for Playbook

On app initialization, load a seed playbook from JSON:

```json
{
  "playbook_entries": [
    {
      "section": "Daily Workflow",
      "title": "Morning Standup",
      "content": "# Morning Standup (8:00 AM)\n\n## Checklist\n1. Review overnight replies in inbox — classify and prioritize immediate responses...",
      "version": 1
    }
  ]
}
```

---

## 5D. Asset Performance

### Asset Performance Page (`/app/assets`)

**Purpose**: Track usage and effectiveness of the 6 Design Bees assets.

**Layout**: Table with metrics, filters, detail drill-down.

**Assets Tracked**:
1. Homepage Analyzer Result (analysis + insight)
2. Calculator (Design Bees ROI calculator)
3. Brief Builder (design brief template generator)
4. Portfolio (case studies / portfolio link)
5. Webinar/Video (recorded webinar or demo video)
6. Template (email template or resource)

**Main Table**:
- Columns:
  - Asset Name
  - Times Shared (count)
  - Times Engaged (clicked, viewed, downloaded)
  - Engagement Rate (engaged / shared %)
  - Asset-to-Reply Rate (received reply after sharing %)
  - Asset-to-Booked Rate (contact booked call after sharing %)
  - Asset-to-Close Rate (contact closed-won after sharing %)
  - Last Shared Date

**Sorting**:
- By times shared (desc)
- By engagement rate (desc)
- By asset-to-booked rate (desc)
- By asset-to-close rate (desc)

**Filters**:
- ICP: Checkboxes for each ICP
- Sequence Family: Checkboxes for sequences
- Stage: First Touch / Follow-up / Breakup
- Date Range: Last 7 days, 30 days, 90 days, all time

**Click Row to View Asset Detail**:
- Asset name, metrics summary
- Usage timeline: bar chart of shares per week (last 12 weeks)
- Engagement timeline: line chart of engagement rate per week
- Performance by ICP: table showing metrics per ICP
- Performance by sequence: table showing metrics per sequence
- List of recent shares: table of who shared it, when, result (replied/booked/closed)

### Asset Performance Queries

Build API routes or raw SQL queries for:
- Count of messages that referenced each asset (asset_id in message_templates or manually cited in sent_messages)
- Count of replies received after sharing asset (activity.created_at after message.created_at)
- Count of opportunities booked after sharing asset
- Count of opportunities closed won after sharing asset

---

## 5E. Final Polish

### CSV Export to All List Pages

Add export button to:
- Accounts list (`/app/accounts`)
- Contacts list (`/app/contacts`)
- Analyses list (`/app/analyses`)
- Activities list (`/app/activities`)
- Opportunities list (`/app/opportunities`)
- Sequences list (`/app/sequences`)
- Insight blocks list (`/app/insight-library`)
- Reply inbox (`/app/reply-inbox`)

**Button**: "Export as CSV" (top right of list)
- Downloads file: `[page_name]_[date].csv`
- Includes all columns shown in table
- Respects current filters/sort
- Max 10,000 rows (warn if more)

**Implementation**:
- Use a library like `papaparse` or `csv-stringify`
- Build API route `/api/export/[resource]` that:
  - Accepts query filters
  - Returns CSV data
  - Frontend triggers download

### Global Search

**Add search to all list pages**:
- Text input at top of list: "Search [resource]..."
- Real-time filtering (debounced, 300ms)
- Search across multiple columns (fuzzy matching)
- Example searches:
  - Accounts: by company name, domain, industry
  - Contacts: by name, email, job title
  - Messages: by snippet, subject line

**Keyboard Shortcut**: Cmd+K (Mac) / Ctrl+K (Windows)
- Global search modal opens
- Type to search across all resource types
- Results grouped by type (accounts, contacts, sequences, etc.)
- Click result to navigate to detail page

### Responsive Design

Ensure all pages are mobile-responsive:
- Check at 375px (mobile), 768px (tablet), 1440px (desktop)
- Sidebar collapses to hamburger on mobile
- Tables convert to card layout on mobile
- Modals stack properly on small screens
- Touch-friendly button sizes (min 44x44px)

### Loading States & Empty States

All pages should have:
- **Loading state**: Skeleton loaders or spinner while fetching data
- **Empty state**: Friendly message + CTA when no data
  - Example: "No prospects yet. Import a CSV or add them manually."
  - Include button to take action (Import CSV, Add Contact, etc.)

### Error Handling & User Feedback

- **Toast notifications** for all actions: Save, Delete, Send, Export, etc.
  - Success: Green toast, "Saved successfully"
  - Error: Red toast, "Failed to save. Please try again."
  - Warning: Yellow toast, "This action cannot be undone"
- **Inline validation errors** on forms: Red text below field, real-time feedback
- **Network error page**: If API fails to load, show friendly message with retry button
- **Timeout handling**: If action takes > 30 seconds, prompt to try again or cancel

### Keyboard Shortcuts

Add shortcuts for common actions:

| Shortcut | Action |
| --- | --- |
| `Cmd+K` / `Ctrl+K` | Global search |
| `Cmd+N` / `Ctrl+N` | New (context-aware: new account, contact, sequence, etc.) |
| `Cmd+S` / `Ctrl+S` | Save |
| `Escape` | Close modal / cancel edit |
| `?` | Show keyboard shortcuts help |

Implement using a library like `react-hotkeys` or `downshift`.

### Performance Targets Panel

**In Settings page, add "Performance Targets" section**:

Show user-configurable targets:

1. **Message Targets**
   - First-touch email word count: 50-100 (adjustable sliders)
   - First-touch DM word count: 40-90
   - Follow-up message word count: 60-120

2. **Sequence Targets**
   - Default touches per sequence: 4-7
   - Max days per sequence: 30-60
   - Recommended ICP match: >70% fit score

3. **Engagement Targets** (by ICP)
   - Target reply rate: [20-60]%
   - Target booked rate: [5-15]%
   - Target held rate: [60-90]%
   - Target close rate: [10-30]%
   - Allow different targets per ICP

4. **Operational Targets**
   - Target reply review time: < 5 minutes
   - Target call prep time: < 15 minutes
   - Target proposal send time: < 24 hours of call

**Save Targets** button → store in settings table

### Internal Benchmarks Panel

**On Main Dashboard, add an "Internal Benchmarks" section**:

Compares actual performance to targets:

- Actual vs. Target reply rate: "Actual 32% vs. Target 25% — On Track (↑ 28%)"
- Actual vs. Target booked rate: "Actual 8% vs. Target 10% — Below Target (↓ 20%)"
- Actual vs. Target close rate: "Actual 14% vs. Target 15% — On Track (↓ 7%)"
- Show by ICP: "SaaS Founder: 35% reply rate (target 30%) — Above target ✓"
- Show by channel: "Email: 28% reply rate (target 25%) — Above target ✓"

Use visual indicators:
- Green checkmark if actual >= target
- Red X if actual < target
- Show % variance (+ or -)

---

## 5F. Performance Optimization

- **Code splitting**: Lazy-load dashboard widgets and pages (use `dynamic()` in Next.js)
- **Data caching**: Use React Query with stale-time 5 minutes for list pages, 30 seconds for dashboard
- **Pagination**: All list pages paginate (20-50 per page), with infinite scroll option
- **Image optimization**: Use Next.js `Image` component for any images
- **Bundle size**: Monitor with `next/bundle-analyzer`

---

## Testing Checklist

When Phase 5 is complete, verify:

- [ ] Dashboard loads with all KPI cards visible, data populates correctly
- [ ] Dashboard widgets render: pipeline snapshot, activity today, upcoming calls, best performing hooks, ICP performance, etc.
- [ ] Widget drag-to-resize works, widget hide/show works, layout persists in user preferences
- [ ] KPI cards show trends (vs. prior period) with direction arrows
- [ ] Experiments list shows all experiments, filterable by status, variable
- [ ] Create experiment form validates required fields, creates record, redirects to detail page
- [ ] Experiment detail shows control vs. test comparison, metrics side-by-side
- [ ] "Analyze Experiment" button calls API, generates AI analysis, displays results
- [ ] Playbook page loads all sections, markdown renders correctly, edit mode works
- [ ] "Refresh Playbook" button calls Playbook Writer Agent, updates with fresh insights
- [ ] Asset performance page shows all 6 assets, metrics calculated correctly
- [ ] Asset metrics: times shared, times engaged, asset-to-reply rate, asset-to-booked rate all calculated
- [ ] Asset detail page shows usage timeline, performance by ICP/sequence
- [ ] CSV export works on all list pages, downloads correctly formatted file
- [ ] Global search (Cmd+K) opens modal, searches across all resource types
- [ ] Performance targets can be set in Settings, saved to database
- [ ] Internal benchmarks panel shows actual vs. target with visual indicators
- [ ] Keyboard shortcuts (Cmd+K, Cmd+N, Cmd+S) work across app
- [ ] Empty states display on all list pages when no data
- [ ] Loading states display while fetching data
- [ ] Error toasts display for failed actions
- [ ] Responsive design: mobile (375px), tablet (768px), desktop (1440px) all work
- [ ] All images optimized with Next.js Image component
- [ ] Dashboard loads in < 3 seconds
- [ ] List pages load in < 2 seconds
- [ ] Message generation < 5 seconds
- [ ] No console errors or warnings
- [ ] Accessibility: keyboard navigation works, color contrast sufficient, alt text on images
