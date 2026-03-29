# Design Bees Outbound Revenue Engine — Phase 2 Build Brief
## Prospect Import, Homepage Analysis Integration, Issue Clusters

You are Replit Agent 3. Build Phase 2 of the Design Bees Outbound Revenue Engine for a sales ops team focused on ICP-driven, issue-centric outreach personalization.

## Context

Phase 1 established the foundation:
- Project scaffold with Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui
- Supabase database + Prisma ORM configured with full schema (users, accounts, contacts, analyses, replies, activities, opportunities, insight_blocks, message_templates, sequences, prospect_sequences, playbook_entries)
- Authentication (Supabase Auth) with role-based access
- Basic layout, navigation, routing structure
- Dashboard stub
- Accounts list page
- Contacts list page
- Settings page with API key management

Phase 2 adds:
1. Full prospect import system (CSV + manual entry) for Accounts and Contacts
2. Account and Contact detail pages with all context and actions
3. Homepage analyser API integration layer
4. Analysis detail page and results display
5. Analyses list page with filtering
6. Issue cluster explorer
7. Derived fields logic for auto-computed account attributes

## Tech Stack (Confirmed)
- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, React Query
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: Supabase PostgreSQL
- **External APIs**: Homepage Analyser API (URL configured in settings), Anthropic API (keys in settings)

---

## 2A. Prospect Import System

### CSV Import for Accounts and Contacts

**Build the CSV import flow** (`/app/accounts/import` and `/app/contacts/import` pages):

1. **Upload Interface**
   - Create drag-and-drop file upload area using shadcn components
   - Accept only `.csv` files
   - Show file size validation (max 10MB)
   - Trigger file picker as fallback

2. **CSV Preview & Column Mapping**
   - Parse CSV and display first 10 rows in a preview table
   - Show all CSV column headers in a separate row
   - Build column mapping UI:
     - Dropdown selectors for each CSV column
     - Target database fields (company_name, domain, website_url, industry, priority_tier, fit_score, etc. for accounts; first_name, last_name, email, phone, linkedin_url, job_title, seniority_level, account_id, etc. for contacts)
     - Auto-detect common names: "Company", "Domain", "Website", "Industry", "Email", "First Name", "Last Name", "Job Title", etc.
     - Mark required fields (company_name + domain for accounts; first_name + last_name + email for contacts)
     - Show which required fields are mapped (highlight missing ones in red)

3. **Data Validation**
   - **Before import**: Validate all rows
     - Required fields present
     - Valid email format (contacts)
     - Valid domain format (accounts)
     - Valid job titles exist in title-to-seniority mapping
   - **Display inline errors**: Show validation errors as a report
     - Row number, column, error message, suggested fix
     - Allow user to filter to error rows, fix in preview, or skip rows
   - **Deduplication**:
     - For accounts: detect duplicates by domain (case-insensitive, normalize domain)
     - For contacts: detect by email + account_id
     - For contacts: detect by LinkedIn URL if provided
     - Show dedup report before import: "X new accounts, Y updates, Z skipped duplicates"

4. **Normalization**
   - **Job title → seniority_level**: Map to enum (c_level, vp, director, manager, individual_contributor, other)
     - "CEO", "Founder", "C-Suite" → c_level
     - "VP", "VP of", "Chief" → vp
     - "Director", "Head of" → director
     - "Manager", "Coordinator" → manager
     - Default to individual_contributor if not recognized
   - Trim whitespace, standardize case for all text fields

5. **Import Progress & Results**
   - Show import dialog with progress bar
   - Display count: "Importing row X of Y..."
   - On completion, show summary:
     - "Imported X accounts successfully"
     - "Imported Y contacts successfully"
     - "Skipped Z duplicates"
     - "Z validation errors (review below)"
   - List any errors that occurred during import
   - Button to view newly imported records

6. **Import History**
   - Add import_logs table (or extend activities): timestamp, user_id, record_type, file_name, row_count, success_count, error_count
   - Display import history list on import page
   - Click to view details or re-review file

### Manual Entry Forms

**Add Account Form** (`/app/accounts/new`):
- Text fields: company_name (required), domain (required), website_url, industry, employee_count
- Dropdown: priority_tier (low/medium/high/strategic)
- Textarea: description, known_challenges
- Save button, Cancel button
- On save, redirect to account detail page

**Add Contact Form** (`/app/contacts/new`):
- Text fields: first_name (required), last_name (required), email (required), phone, linkedin_url
- Select account dropdown (required)
- Text field: job_title
- Select seniority_level (auto-filled from job_title if possible)
- Textarea: notes
- Save button, Cancel button
- On save, redirect to contact detail page

**Quick-Add Mode** (for rapid entry):
- On Accounts list page, add a "Quick Add" row at the top
- Inline form with just: company_name, domain, priority_tier
- Press Enter or Tab to move to next field
- Save with button or Ctrl+Enter
- Add new row after save for continuous entry

### API Route: `/api/accounts/import`
- Accept CSV file upload + column mapping + dedup strategy
- Parse file, validate rows, normalize data
- Check for duplicates against existing accounts (by domain)
- Insert new records, update existing (upsert), skip duplicates
- Return import result summary with row-level error details
- Handle file parsing errors gracefully

### API Route: `/api/contacts/import`
- Accept CSV file upload + column mapping
- Require account_id to be mapped (either from file or selected context)
- Validate email format, phone format
- Check for duplicate emails per account
- Normalize job title to seniority_level
- Insert new records, skip duplicates
- Return summary

---

## 2B. Account and Contact Detail Pages

### Account Detail Page (`/app/accounts/[id]`)

**Layout**: Two-column design — left content, right sidebar actions.

**Main Content (Left Column)**:

1. **Company Info Card** (editable inline)
   - Company name, domain, website_url, industry
   - Employee count, founded year (if available)
   - Edit button → opens modal or inline form
   - Save/Cancel buttons in edit mode
   - Delete button (confirm dialog)

2. **ICP & Fit Score Section**
   - Matched ICP: badge showing which ICP profile matches (if any)
   - Fit score: numeric (0-100) with color coding (red < 50, yellow 50-75, green > 75)
   - Fit score explanation: "Based on industry, employee count, and match to priority_tier"
   - Edit button to manually adjust fit score

3. **Associated Contacts List**
   - Table showing all contacts linked to this account
   - Columns: name, email, job_title, seniority_level, outreach_status, last_activity_date
   - Click row to view contact detail page
   - Add Contact button (pre-fills account_id)

4. **Analysis Results** (if any analyses exist)
   - Displays latest analysis (if any)
   - Shows: primary_issue_code, secondary_issue_code, overall_score
   - Button: "View Full Analysis" → links to analysis detail page
   - Button: "Run New Analysis" → modal with URL input

5. **Issue Cluster Display**
   - Badges showing all issue_codes from latest analysis
   - Click badge to jump to Issue Cluster detail page
   - Show severity indicator per issue

6. **Recommended Pains** (from pain maps + analysis)
   - List of likely pain points based on ICP + issue cluster
   - Source: "From analysis" or "From ICP matching"

7. **Sequence Assignment**
   - Shows currently assigned prospect_sequence (if any)
   - Sequence name, current_step, status (active/paused/completed)
   - Progress: "Step 2 of 5, due in 3 days"
   - Button: "Change Sequence" or "Assign Sequence"

8. **Activity Timeline**
   - List of all activities (messages sent, replies received, calls held, opportunities created)
   - Reverse chronological order
   - Each item: type icon, timestamp, contact name, description, any result
   - Scroll to load more (pagination or infinite scroll)

9. **Replies Timeline**
   - Filtered view of activities where type = reply
   - Shows reply text snippet, classification, urgency badge
   - Click to view full reply detail
   - If no replies yet, show placeholder

10. **Assets Used**
    - List all insight_blocks and message_templates shared with contacts at this account
    - Group by asset type
    - Show usage count per asset

11. **Opportunity Status**
    - Shows any open opportunities (stage != closed_won/closed_lost)
    - Displays: opportunity name, stage, value, days in stage
    - Button to create new opportunity
    - Click to jump to opportunity detail page

12. **Recommended Next Action Card** (from reply classifier or operator)
    - AI-generated suggestion based on latest reply/activity
    - Example: "Book follow-up call", "Send calendar invite", "Pause sequence", "Update fit score"
    - Operator can dismiss or act on suggestion

**Right Sidebar (Actions)**:
- Button: "Run Analysis" → modal with URL input (pre-filled from website_url)
- Button: "Generate Message" → opens message generator with this account pre-selected
- Button: "Assign Sequence" → dropdown to select sequence, assigns it
- Button: "Create Opportunity" → creates new opportunity record, opens form
- Button: "Quick Notes" → modal to add account-level notes
- Button: "Edit Account" → opens full edit form

### Contact Detail Page (`/app/contacts/[id]`)

**Layout**: Similar two-column design.

**Main Content (Left Column)**:

1. **Contact Info Card** (editable inline)
   - First name, last name, email, phone, linkedin_url, job_title, seniority_level
   - Edit button → modal or inline form

2. **Associated Account Link**
   - Show account name as a link
   - Company industry, fit score, priority_tier as context
   - Button: "View Account" → jump to account detail page

3. **Outreach Status Badge**
   - Display outreach_status (new, queued, contacted, replied, booked, held, closed_won, closed_lost)
   - Color-coded badge
   - Click to update status (if appropriate)

4. **Activity History**
   - All activities for this contact (messages sent, replies, calls, opportunities)
   - Type, timestamp, channel (email/LinkedIn/phone), status
   - Click to expand details

5. **Reply History**
   - Filtered view of all replies received from this contact
   - Reply text, received date, classification, urgency
   - Click to view full reply detail and suggested action

6. **Sequence Status**
   - If contact is part of an active prospect_sequence, show:
     - Sequence name, current step, step description, next action date
     - "Ready to send" if due date is today or earlier
     - Progress indicator

7. **Prior Messages**
   - Show all messages sent to this contact (in order)
   - Display message body, channel, sent date, reply received (yes/no)

**Right Sidebar (Actions)**:
- Button: "Generate Message" → opens message generator with this contact pre-selected
- Button: "Log Activity" → modal to log call, email, etc.
- Button: "Book Call" → creates opportunity with stage = booked, sets held_at to calendar pick
- Button: "View Account" → jump to associated account

---

## 2C. Homepage Analysis Integration

### Analysis Workflow

**From Account Detail Page, "Run Analysis" Button**:
1. Opens modal with URL input
2. Pre-fill with account.website_url if available
3. Allow user to edit/override URL
4. Show description: "This will analyze the homepage and identify key messaging clarity and design effectiveness issues"
5. Cancel or Submit button

**On Submit**:
1. Create analyses record with status = "pending"
2. Call API route `/api/analyze`
3. Show loading state with spinner: "Analyzing homepage..."
4. On success:
   - Create/update analyses record with response data
   - Redirect to Analysis Detail page
   - Show toast: "Analysis complete!"
5. On error:
   - Show user-friendly error message
   - Offer retry button
   - Log error details

### API Route: `/api/analyze`

**Endpoint**: `POST /api/analyze`

**Request body**:
```json
{
  "url": "https://example.com",
  "account_id": "uuid" (optional)
}
```

**Logic**:
1. Validate URL format
2. Retrieve analyzer endpoint from settings (settings.analyzer_api_endpoint)
3. Call external analyser API:
   - POST request with URL
   - Parse JSON response
   - Expected response structure (adjust based on actual API):
     ```json
     {
       "domain": "example.com",
       "overall_score": 65,
       "primary_issue_code": "unclear_cta",
       "secondary_issue_code": "weak_hero",
       "hero_clarity": 45,
       "cta_clarity": 60,
       "cta_prominence": 70,
       "visual_hierarchy": 55,
       "message_order": 50,
       "outcome_clarity": 40,
       "trust_signal": 75,
       "friction": 30,
       "mobile_readability": 80,
       "issue_codes": ["unclear_cta", "weak_hero", "missing_trust_signals"],
       "issue_summaries": {
         "unclear_cta": { "short": "CTA not clear", "detailed": "..." },
         "weak_hero": { "short": "Hero section weak", "detailed": "..." }
       },
       "strengths": ["Mobile is responsive", "Trust signals present"],
       "recommended_priority_fix": "Clarify primary CTA",
       "confidence_score": 0.82,
       "screenshot_url": "https://..."
     }
     ```
4. Parse and validate response
5. If account_id provided:
   - Upsert analyses record (check if analysis with same account_id and domain already exists)
   - Update account.likely_primary_problem = primary_issue_code
   - Update account.likely_secondary_problem = secondary_issue_code
   - Auto-compute account.personalization_level (see derived fields section below)
6. Return success response with analyses record

**Error Handling**:
- Network error: "Unable to reach analyzer API. Check endpoint in Settings."
- Invalid URL: "URL is invalid or unreachable."
- Rate limit: "Analyzer service is busy. Please try again in a moment."
- 5xx from analyzer: "Analyzer service error. Please try again."
- Return error with status code and message

### Analysis Detail Page (`/app/analyses/[id]`)

**Layout**: Main content area with related sidebar.

**Main Content**:

1. **Domain Header**
   - Domain name, link to website
   - Analysis date, refresh button
   - Back to Analyses List link

2. **Overall Score & Gauges**
   - Large circle showing overall_score (0-100), color-coded
   - Below, grid of 8 metric gauges:
     - hero_clarity, cta_clarity, cta_prominence, visual_hierarchy
     - message_order, outcome_clarity, trust_signal, friction, mobile_readability
   - Each gauge is a horizontal bar from 0-100, color-coded (red < 40, yellow 40-70, green > 70)
   - Hover to show metric name and value

3. **Primary & Secondary Issues**
   - Display issue_codes as colored badges
   - Severity indicator (high/medium/low, inferred from score thresholds)
   - Category label (messaging, design, ux, etc.)

4. **Issue Detail Cards**
   - For each issue_code in the analysis:
     - Show short summary
     - Show detailed description
     - Severity badge
     - Related metrics that are low

5. **Strengths Section**
   - List of strengths_detected (if any)
   - Each as a checkmark badge

6. **Recommended Priority Fix**
   - Highlighted box with the top recommended fix
   - Brief explanation

7. **Confidence Score**
   - Display as percentage with explanation
   - "This analysis is X% confident"

8. **Screenshot** (if available)
   - Show screenshot_url as an image
   - Click to expand/lightbox

9. **Action Buttons**
   - "Generate Insight" button → triggers Insight Generator agent (Phase 3+)
   - "Generate Message" button → opens message generator with this analysis context pre-filled
   - "Back to Account" link → if account_id, jump to account detail page

### Analyses List Page (`/app/analyses`)

**Layout**: Main list with left sidebar filters.

**Left Sidebar (Filters)**:
- **Issue Code**: Checkboxes for all 16 issue codes, with count of analyses for each
- **ICP**: Checkboxes for matched ICPs
- **Date Range**: Dropdown (Last 7 days, Last 30 days, All time) or date picker
- **Min Confidence**: Slider 0-100%
- **Apply Filters** button

**Main Content**:
- Table or card view (toggle) showing all analyses matching filters
- Columns: Domain, Primary Issue, Secondary Issue, Overall Score, Date, Confidence, Account
- Sort by: Date (newest first), Overall Score, Confidence
- Click row to jump to Analysis Detail page
- Show result count: "Showing X of Y analyses"
- Pagination or infinite scroll

**Empty State**:
- "No analyses yet. Run an analysis from an account detail page."

---

## 2D. Issue Cluster Explorer

### Issue Cluster Explorer Page (`/app/issue-clusters`)

**Layout**: Responsive card grid with header and filters.

**Header**:
- Title: "Issue Cluster Explorer"
- Description: "Homepage messaging and design issues driving engagement and conversions"

**Left Sidebar (Filters)**:
- **Severity**: Checkboxes (High, Medium, Low)
- **Category**: Checkboxes (messaging, design, ux, trust, conversion)
- **Engagement Level**: Checkboxes (High, Medium, Low) — only appears if data exists
- **Apply Filters** button

**Main Content (Card Grid)**:
- Grid of cards, one per issue_code
- Each card shows:
  - **Issue Code** (e.g., "unclear_cta")
  - **Issue Name** (e.g., "Unclear Call-to-Action")
  - **Description** (short text, 1-2 sentences)
  - **Severity Badge** (High/Medium/Low, color-coded)
  - **Category Label** (Messaging / Design / UX / Trust / Conversion)
  - **Count Badge**: Number of accounts with this issue in latest analysis (e.g., "23 accounts")
  - **Engagement Indicator** (if data exists): "5 replies, 2 booked calls" — shows performance of this cluster
  - Click card to view Cluster Detail page

**Empty State**:
- If no filters match: "No issue clusters found matching filters. Try adjusting filters."

### Issue Cluster Detail Page (`/app/issue-clusters/[code]`)

**Main Content**:

1. **Cluster Header**
   - Issue code, full name, description
   - Severity and category badges
   - Edit button (admin only, opens form to edit cluster metadata)

2. **Accounts with This Issue**
   - Table showing all accounts where latest analysis.primary_issue_code or secondary_issue_code matches this code
   - Columns: Company, Domain, Industry, Priority Tier, Analysis Date, Status
   - Sort/filter options
   - Click row to jump to account detail page

3. **Engagement Stats** (if data exists)
   - Total accounts with this issue
   - Positive reply count
   - Booked call count
   - Show rate, close rate
   - Top performing ICP for this issue
   - Best performing insight_block for this issue

4. **Recommended Insight Blocks**
   - Show all insight_blocks tagged with this issue_code
   - Display each: title, short insight line, CTA style, channel
   - Usage count and reply rate per insight block
   - Button: "Use in Message" (pre-fills message generator with this insight)

5. **Recommended Sequences**
   - Show all sequences tagged with this issue_code
   - Positive reply rate, booked rate per sequence
   - Button: "View Sequence"

---

## 2E. Derived Fields Logic

After every import or analysis, auto-compute these fields on the account record:

1. **likely_primary_problem** (string, nullable)
   - Set to analysis.primary_issue_code if latest analysis exists
   - Otherwise null

2. **likely_secondary_problem** (string, nullable)
   - Set to analysis.secondary_issue_code if latest analysis exists
   - Otherwise null

3. **personalization_level** (enum: generic, moderate, high_touch)
   - Logic:
     - If priority_tier = "strategic": high_touch
     - Else if fit_score >= 75: moderate
     - Else: generic

4. **suggested_sequence_family** (string, nullable)
   - Logic based on ICP + issue cluster:
     - If likely_primary_problem in ["unclear_cta", "weak_cta"]: "cta_clarity_sequence"
     - Else if likely_primary_problem in ["missing_trust_signals", "weak_trust"]: "trust_building_sequence"
     - Else if ICP = "saas_founder": "founder_focused_sequence"
     - Else if ICP = "design_agency": "design_agency_sequence"
     - Else if priority_tier = "strategic": "high_touch_sequence"
     - Else: null

Implement these as database triggers or as logic in the import/analyze API routes.

---

## Testing Checklist

When Phase 2 is complete, verify:

- [ ] CSV import for accounts: upload, map columns, validate, deduplicate, import successfully
- [ ] CSV import for contacts: upload, map columns, validate against account_id, import successfully
- [ ] Duplicate detection works (accounts by domain, contacts by email)
- [ ] Job title normalization: CEO → c_level, VP → vp, etc.
- [ ] Manual add account form: create new account, redirect to detail page
- [ ] Manual add contact form: create new contact, select account, redirect to detail page
- [ ] Quick-add mode: rapid entry of accounts on accounts list
- [ ] Account detail page loads all sections: company info, contacts, analysis, sequence, activities, etc.
- [ ] Account detail page actions: Run Analysis, Generate Message, Assign Sequence, Create Opportunity, Edit
- [ ] Contact detail page loads all sections: info, account link, activity, replies, sequence status
- [ ] Contact detail page actions: Generate Message, Log Activity, Book Call, View Account
- [ ] Homepage analyser API integration: submit URL, show loading, display results
- [ ] Analysis detail page renders all gauges, issue detail, strengths, recommendations
- [ ] Analyses list page: filter by issue code, ICP, date, confidence; sort by columns
- [ ] Issue cluster explorer: card grid of 16 issues, counts, filter by severity/category
- [ ] Issue cluster detail: shows accounts with issue, engagement stats, recommended insights/sequences
- [ ] Derived fields: personalization_level, suggested_sequence_family auto-computed after import/analysis
- [ ] API error handling: network errors, invalid URL, rate limits, 5xx errors all handled gracefully
- [ ] Performance: list pages load with pagination, no major lag
