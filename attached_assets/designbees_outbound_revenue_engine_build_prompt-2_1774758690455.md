# Design Bees Outbound Revenue Engine: Full Build Prompt for Code Builder

## Role

You are an elite product engineer, growth systems architect, and revenue operations designer.

Build a production-ready web application and internal operating system for Design Bees that helps generate qualified outbound pipeline and supports the target of signing 10 new paying subscribers in the next 3 weeks by generating 30 to 40 qualified consultation calls.

This app is not a generic CRM. It is a focused outbound execution engine that combines:
- research-backed outbound best practices
- Design Bees' existing assets
- website analysis outputs
- persona and industry segmentation
- message generation
- sequence generation
- experiment tracking
- KPI dashboards
- playbooks
- operator workflows
- agent prompts that can be reused by Codex / Claude Code / Cowork

The system should maximize the probability of pipeline creation, not simply automate low-quality outreach.

Build for speed, clarity, and daily operational use.

---

## Business Context

### Brand
Design Bees

### Core offer
Subscription-based graphic design support.

### Current commercial objective
Generate 30 to 40 qualified consultation/demo calls in 3 weeks to close 10 new paying subscribers.

### Existing Design Bees assets already available
These assets already exist and must be incorporated into the system, not rebuilt from scratch unless required for integration:
1. ROI Calculator
   - already models cost of multiple revisions
   - already models time wasted briefing freelancers
   - already models missed campaign costs / operational delay costs
   - should be used after engagement and during qualification / sales enablement
2. Homepage Analyser / Website Analyser
   - already built
   - should be used as the primary outbound trigger and observation engine
3. Lead magnets / tools already live
   - ROI Calculator
   - Brief Builder
   - Campaign Planner
   - Common Mistakes tool / page
   - Design Checklist
4. Design Bees website and positioning
   - use current site as system context and source of proof / offer framing

### Primary ICPs
1. Small business founders
2. Senior marketing managers at companies with 11 to 100 employees
3. Marketing agencies with 1 to 20 employees

### Working strategic principle
Do not lead with "subscription design" or "unlimited design".
Lead with a specific, observed operational or conversion problem.
Use Design Bees' tooling and insight to earn interest first.
Use the subscription model as the fulfillment vehicle after relevance is established.

---

## Outcome Required From This Build

The final app must help an operator do all of the following from one place:

1. Import or ingest prospect accounts and contacts
2. Analyze company homepages / landing pages using the existing homepage analyser
3. Categorize observed issues into repeatable insight clusters
4. Match the account to ICP, industry, and likely pain points
5. Generate personalized but modular outreach messages and multi-touch sequences
6. Assign the right Design Bees asset to the right stage of the funnel
7. Track all touches, replies, objections, booked calls, show rates, closes, and experiment results
8. Recommend next best action for every prospect
9. Produce a repeatable playbook for daily execution
10. Generate reusable prompts and learned skills for ongoing content and sequence generation
11. Support multichannel outbound with at least email, LinkedIn/social, and phone task orchestration
12. Provide dashboards that show whether the system is actually working

---

## Research Basis To Encode Into The System

Use the following evidence-backed operating assumptions inside the product logic and playbook:

1. First-touch outreach matters most.
   - Research from Instantly's 2026 benchmark says 58% of replies come from the first email.
   - Follow-ups still matter and account for the remaining 42%.

2. Shorter first-touch messages perform better.
   - Gong research indicates cold emails with about 100 words or fewer perform best.
   - Instantly reports elite senders average under 80 words on first touch.

3. Top performers do not pitch in the first message.
   - Gong reports pitching can reduce reply rates materially.
   - Problem-first, priority-based language performs better.

4. Interest-based CTAs outperform immediate meeting asks.
   - Use low-friction CTAs such as "worth sending the breakdown?" or "open to seeing what I noticed?"
   - Do not lead with calendar links on first touch.

5. Multi-channel beats single-channel.
   - Social outreach is highly responsive according to HubSpot's sales research.
   - Phone-led, coordinated sequences also perform strongly according to Cognism.
   - The app should support channel orchestration, not email only.

6. Follow-up structure matters.
   - 4 to 7 touches is a sensible working range.
   - Each follow-up must add a new angle, asset, proof point, or observation.

7. Speed-to-lead matters.
   - Once a prospect replies or fills a form, the app should flag immediate follow-up.
   - Target first response in under 5 minutes where possible.

8. Free tools are strong conversion assets.
   - Use the ROI calculator, analyser outputs, checklist, and brief builder after interest is created.

9. List quality beats brute-force volume.
   - The system must prioritize account fit, problem fit, and message relevance over blind blasting.

---

## High-Level Strategic Model

### Core positioning
Design Bees is not sold first as a design subscription.
Design Bees is introduced first as a system for diagnosing and reducing:
- campaign delay
- design bottlenecks
- homepage conversion friction
- creative inconsistency
- resource waste
- revision overhead
- briefing inefficiency
- overflow strain
- agency margin compression
- marketing execution drag

### Core outbound logic
Observed signal -> diagnosis -> business consequence -> optional breakdown -> engagement -> proof asset -> consultation -> close

### Core personalization model
Do not fully custom-write every message.
Do not fully automate generic messages.
Use a hybrid model:
- 20% handcrafted context
- 80% modular insight blocks generated from real analyser output and segmentation

### Core sequencing model
- top-tier accounts: high personalization and optional Loom/video
- mid-tier accounts: semi-custom messages driven by analyzer findings
- lower-tier accounts: lighter modular messaging, still specific, never generic outreach

---

## Product Scope

Build the following modules.

# 1. Workspace / Dashboard Module

### Purpose
Single-screen command center for outbound execution.

### Must show
- calls booked this week
- total positive replies this week
- reply rate by channel
- meetings booked by ICP
- show rate
- close rate
- active prospects by stage
- analyzer issue clusters driving the most replies
- top performing message variants
- underperforming sequences
- tasks due today
- hot prospects requiring immediate follow-up
- asset usage by stage
- experiment leaderboard

### Dashboard widgets
- Pipeline Snapshot
- Activity Today
- Response Time Alerts
- Upcoming Calls
- Top Issue Clusters
- Best Performing Hooks
- Best Performing CTAs
- Channel Performance
- ICP Performance
- Sequence Performance
- Objection Trends
- Win / Loss Reasons

---

# 2. Prospect Import and Enrichment Module

### Purpose
Bring prospects and contacts into the system cleanly.

### Inputs
- CSV upload
- manual entry
- webhook ingestion
- API integration placeholders
- user-supplied exports

### Required fields
#### Account-level
- company_name
- domain
- website_url
- industry
- sub_industry
- employee_count_band
- revenue_band (optional)
- geography
- source
- source_detail
- source_capture_date
- account_owner
- priority_tier
- ICP_type
- fit_score

#### Contact-level
- first_name
- last_name
- full_name
- job_title
- seniority
- email
- phone
- LinkedIn URL
- contact_source
- source_date
- outreach_status field
- notes

### Derived fields
- likely_icp
- likely_primary_problem
- likely_secondary_problem
- likely_asset_to_offer
- personalization_level
- sequence_family

### Data hygiene features
- dedupe by domain + contact email
- dedupe by LinkedIn URL
- normalize titles
- map contacts to decision-maker type
- flag missing critical fields
- flag likely low-fit leads

---

# 3. Homepage Analysis Integration Module

### Purpose
Use the existing homepage analyser as the signal generator for outbound.

### Requirements
- do not rebuild the analyser logic unless required for integration
- build an integration layer so the app can send a domain / URL and retrieve structured results
- support homepage and selected landing page analysis

### Output schema required from analyser
- analysis_id
- domain
- page_url
- page_type
- analyzed_at
- hero_clarity_score
- CTA_clarity_score
- CTA_prominence_score
- visual_hierarchy_score
- message_order_score
- outcome_clarity_score
- trust_signal_score
- friction_score
- page_speed_proxy_score (optional)
- mobile_readability_score
- primary_issue_code
- secondary_issue_code
- tertiary_issue_code
- issue_summary_short
- issue_summary_detailed
- strengths_detected
- recommended_priority_fix
- confidence_score
- raw_notes
- screenshot_url if available

### Standard issue taxonomy
Create a normalized issue taxonomy such as:
- HERO_TOO_GENERIC
- CTA_TOO_SOFT
- CTA_NOT_OUTCOME_TIED
- FEATURE_FIRST_MESSAGING
- UNCLEAR_OFFER
- WEAK_ABOVE_FOLD_STRUCTURE
- TOO_MANY_COMPETING_ELEMENTS
- CLUTTERED_LAYOUT
- LOW_TRUST_SIGNAL_VISIBILITY
- WEAK_VISUAL_HIERARCHY
- POOR_MOBILE_READABILITY
- HIGH_COGNITIVE_LOAD
- MISSING_SOCIAL_PROOF
- MISSING_SEGMENT_CLARITY
- FRICTION_HEAVY_NAVIGATION
- SLOW_DECISION_PATH

### Additional logic
The system must be able to:
- cluster accounts by shared issue patterns
- surface the most common issues by ICP and industry
- feed those issue codes into sequence and message generation

---

# 4. ICP / Industry Pain Mapping Module

### Purpose
Map analyzer outputs and company traits to likely business pain.

### Pain maps required

## A. Small business founders
Likely pains:
- inconsistent design quality
- wasting time briefing freelancers
- campaign delays
- website underperformance
- no internal design process
- poor sales asset consistency
- lack of confidence in brand presentation
- too many revisions and back-and-forth
- no design capacity during busy periods
- poor use of paid traffic due to weak landing page structure

## B. Senior marketing managers at 11 to 100 employee companies
Likely pains:
- execution bottlenecks
- campaign launch delays
- internal stakeholder revision loops
- inconsistent output across channels
- slow production capacity relative to campaign demand
- poor design prioritization
- wasted team time managing freelancers
- difficulty scaling creative output
- weak landing page clarity hurting paid and lifecycle campaigns
- inability to get high-quality work without headcount increase

## C. Marketing agencies with 1 to 20 employees
Likely pains:
- overflow capacity issues
- margin erosion
- unreliable freelancers
- creative bottlenecks slowing client delivery
- white-label fulfillment pressure
- too much founder review time
- context switching
- inconsistent quality across contractors
- turnaround risk
- inability to scale retainers profitably

### Mapping logic
Create a rules engine:
- based on ICP + industry + analyzer issue cluster + employee count
- output top 3 likely pains
- output preferred outreach angle
- output best supporting asset
- output recommended CTA style
- output recommended proof style

---

# 5. Insight Library Module

### Purpose
Convert repeated problems into reusable insight blocks.

### Structure
Each insight block must include:
- insight_id
- issue_code
- ICP
- industries where relevant
- short_insight_line
- longer_explainer
- business_consequence
- severity_hint
- suitable_channels
- suitable_sequence_step
- CTA_pairings
- proof_asset_pairings
- confidence_notes

### Example block structure
#### Example 1
- issue_code: FEATURE_FIRST_MESSAGING
- short insight line:
  "You are explaining process before making the result feel urgent, which usually causes drop-off early."
- business consequence:
  "Paid or cold traffic may understand what you do but still fail to feel why they should act now."
- best ICPs:
  founders, marketing managers

#### Example 2
- issue_code: CTA_TOO_SOFT
- short insight line:
  "The CTA is safe but not tied to a clear outcome, which normally reduces action from cold visitors."
- business consequence:
  "The page may get attention without turning that attention into enquiries."

### Requirements
- minimum 40 starter insight blocks
- blocks tagged by ICP, channel, and issue code
- editable in admin UI
- performance data linked back to each block

---

# 6. Message Generation Module

### Purpose
Generate first-touch and follow-up outreach that feels specific, not mass-blasted.

### Non-negotiables
- first-touch email target length: 50 to 100 words
- first-touch LinkedIn/social DM target length: 40 to 90 words
- no generic "we help businesses grow"
- no hard pitch in first touch
- no calendar link in first touch by default
- CTA should usually ask permission / interest, not force a meeting request

### Message anatomy
Every first-touch message should support this structure:
1. observed signal
2. one genuine positive
3. one to two sharp diagnoses
4. consequence / why it matters
5. low-friction CTA

### Example pattern
- "Came across your homepage while reviewing [industry] companies..."
- "You are ahead of most in [specific strength]..."
- "One thing I noticed is..."
- "That usually leads to..."
- "Happy to send over the breakdown if useful."

### Inputs into message generation
- ICP
- industry
- company size
- issue cluster
- strengths detected
- priority tier
- channel
- stage in sequence
- selected asset
- prior interactions
- objection history
- desired tone
- personalization level

### Outputs required
- email subject line
- email body
- LinkedIn / social DM
- phone opener / voicemail script
- optional Loom/video script
- follow-up variants
- objection reply drafts
- positive reply handling drafts
- meeting-confirmation copy

### Prompting logic
The generator must create:
- concise versions
- direct versions
- more consultative versions
- more assertive versions
- versions by ICP
- versions by channel

### Quality rules
Message generator must avoid:
- buzzword stuffing
- platform / feature dump
- empty flattery
- robotic phrasing
- long intros
- generic "just following up"
- multiple asks in one message

---

# 7. Sequence Builder Module

### Purpose
Create multi-touch outbound sequences that combine channels and assets intelligently.

### Baseline sequence principles
- use 4 to 7 touches as default
- do not repeat the same angle each touch
- each follow-up must add something new
- first touch usually uses observation + diagnosis
- second touch can use alternate angle or consequence
- third touch can use an asset, benchmark, or additional observation
- later touches can use softer break-up or directness

### Sequence families required

## Sequence Family A: Founders
Touch ideas:
1. homepage issue + business consequence
2. same issue reframed as speed / wasted time / missed enquiries
3. offer quick breakdown or checklist
4. introduce ROI calculator if engaged
5. lighter bump / directness
6. breakup with observation recap

## Sequence Family B: Marketing managers
Touch ideas:
1. landing page / homepage friction linked to campaign performance
2. design bottleneck / campaign delay angle
3. brief builder / checklist / process simplification angle
4. ROI calculator or analyzer report
5. proof / benchmark / alternate issue angle
6. close-the-loop message

## Sequence Family C: Agencies
Touch ideas:
1. overflow capacity or page-quality observation
2. margin and revision-loop angle
3. white-label / delivery speed angle
4. workload relief or hidden cost angle
5. case-style operational angle
6. close-the-loop message

### Sequence object schema
- sequence_id
- sequence_name
- ICP
- issue_cluster
- industry_filter
- priority_tier
- channel_mix
- steps[]
- CTA_strategy
- asset_strategy
- escalation_rules
- pause_rules
- stop_rules

### Step object schema
- step_number
- day_offset
- channel
- objective
- angle
- message_variant_id
- asset_to_include
- personalization_required_fields
- send_window
- fallback_behavior

---

# 8. Asset Matching and Stage Progression Module

### Purpose
Match the right Design Bees asset to the correct moment in the funnel.

### Asset strategy
#### Existing assets
1. Homepage Analyser
   - first-touch trigger
   - reply catalyst
   - optional report artifact
2. ROI Calculator
   - use after curiosity / engagement
   - use pre-call qualification
   - use on-call proof and urgency
3. Brief Builder
   - strong fit for marketing managers and agencies
   - can be framed as operational efficiency tool
4. Campaign Planner
   - good as follow-up value-add for marketing managers and founders
5. Design Checklist
   - good low-friction asset
6. Mistakes / education asset
   - useful as supporting angle but not primary first touch

### Asset progression rules
- cold touch: usually no link unless specifically testing it
- positive reply: send tailored breakdown or analyzer insight
- warm prospect: offer calculator / tailored review
- post-call: send recap + relevant tool
- stalled prospect: send a narrower asset tied to their problem

### Asset recommendation engine
Based on ICP + issue + stage + response type, recommend:
- next best asset
- next best CTA
- whether to hold the asset until after reply
- whether to use summary or direct link

---

# 9. Reply Classification and Next-Best-Action Module

### Purpose
Turn replies into immediate actionable workflows.

### Reply classes required
- positive_interest
- neutral_curiosity
- soft_no
- hard_no
- referral_to_other_person
- timing_not_now
- objection_budget
- objection_need
- objection_internal_resource
- objection_already_have_designer
- do_not_contact
- special_request
- out_of_office

### Next-best-action rules
#### positive_interest
- generate reply within 5 minutes if possible
- offer tailored breakdown or booking option
- suggest calculator / quick walkthrough where appropriate
- create call task

#### neutral_curiosity
- answer briefly
- do not oversell
- provide one concrete insight or asset
- ask a single low-friction next-step question

#### referral_to_other_person
- create new contact record
- transfer context
- generate referral message

#### timing_not_now
- capture future follow-up date
- place in nurture queue
- generate light follow-up reminder

#### objection_already_have_designer
- reframe around speed, overflow, revision drag, campaign volume, or backup capacity
- do not argue
- keep it concise

---

# 10. Experimentation and Learning Module

### Purpose
Treat outbound like an experiment system, not guesswork.

### Required capabilities
- A/B test subject lines
- A/B test first lines
- A/B test CTA type
- compare channels
- compare issue clusters
- compare sequence families
- compare asset timing
- compare ICP performance
- compare industry performance

### Experiment rules
- only test one major variable at a time
- define winner by meaningful business outcomes, not vanity metrics
- use sufficient sample before declaring winner
- preserve control sequence

### Metrics hierarchy
Primary:
- positive reply rate
- meetings booked rate
- held meeting rate
- close rate

Secondary:
- open rate where available
- reply rate
- asset click-through
- time-to-first-reply
- analyzer-to-meeting conversion
- reply sentiment

### Experiment object schema
- experiment_id
- name
- hypothesis
- variable_tested
- control_variant
- test_variant
- segment
- start_date
- end_date
- sample_size
- result_summary
- decision
- rollout_status

---

# 11. Playbook Module

### Purpose
Embed the actual operating playbook into the app so the user knows what to do daily and weekly.

### Must include
- daily workflow
- weekly workflow
- ICP-specific messaging rules
- issue-cluster playbooks
- call prep playbook
- post-call playbook
- speed-to-lead playbook
- objection handling playbook
- sequence editing playbook
- escalation rules
- kill rules for bad campaigns
- measurement guide

### Example daily workflow
#### Morning
1. Review dashboard
2. Respond to hot replies first
3. Review calls due today
4. Import / validate next batch of prospects
5. Run homepage analysis on new accounts
6. Finalize Tier 1 messages
7. Launch or queue sequences

#### Midday
1. Review reply classifications
2. Push warm prospects into call-booking workflow
3. Adjust copy if one variant is clearly underperforming
4. Send manual follow-ups to high-value accounts

#### Afternoon
1. Process analyzer clusters
2. Build tomorrow's list
3. Review experiment health
4. Log notes from calls and objections
5. Update next-best-action queues

### Example weekly workflow
1. Review conversion by ICP
2. Review conversion by industry
3. Review which issue clusters drive meetings
4. Review which assets are actually advancing deals
5. Kill underperforming messages
6. Promote winning variants
7. Refresh top 10 insight blocks
8. Review source quality
9. Set next week's experiments

---

# 12. Tracking Framework Module

### Purpose
Track each component of the outbound system from source to closed-won.

### Funnel stages
- sourced
- imported
- enriched
- analyzed
- segmented
- queued
- contacted
- replied
- positive_reply
- booked
- held
- proposal_sent
- closed_won
- closed_lost
- nurture
- blocked

### Track these events at minimum
- prospect_imported
- prospect_enriched
- homepage_analyzed
- issue_cluster_assigned
- message_generated
- message_sent
- message_delivered
- message_opened (if available)
- reply_received
- reply_classified
- asset_shared
- calculator_used
- call_booked
- call_held
- objection_logged
- next_action_assigned
- opportunity_created
- deal_closed
- contact_blocked_logged
- special_request_logged

### Tracking entities
#### Account performance
- domain
- ICP
- industry
- issue_cluster
- total touches
- channel mix
- reply outcome
- meeting outcome
- revenue outcome

#### Contact performance
- contact seniority
- channel response
- time-to-reply
- objection type
- asset engagement
- meeting show / no-show
- close contribution

#### Sequence performance
- sequence family
- step-level performance
- reply rate per step
- positive reply rate per step
- booked rate per step
- do-not-contact rate
- stop rate

#### Insight block performance
- usage count
- positive reply rate
- booked rate
- close rate
- by ICP
- by industry
- by channel

#### Asset performance
- asset shown count
- asset engagement count
- asset-to-booked-call rate
- asset-to-close rate

### Required dashboards
1. Executive Overview
2. Daily Execution Board
3. ICP Performance Board
4. Industry Performance Board
5. Sequence Performance Board
6. Insight Block Leaderboard
7. Asset Effectiveness Board
8. Response Time Board
9. Objection Analytics Board
10. Revenue Attribution Board

### Core KPI definitions
- positive_reply_rate = positive replies / delivered first touches
- booked_rate = booked calls / delivered first touches
- held_rate = held calls / booked calls
- close_rate = closed won / held calls
- analyzer_to_reply_rate = positive replies / analyzed prospects contacted
- analyzer_to_booked_rate = booked calls / analyzed prospects contacted
- asset_assisted_booked_rate = booked calls where asset was used / total prospects sent asset
- speed_to_lead = time from reply_received to first_human_or_system_response
- contact_to_close_days = close date - first touch date

---

# 13. CRM / Sales Workflow Module

### Purpose
Keep pipeline operational, not just top-of-funnel.

### Required features
- call booking status
- follow-up reminders
- task queue
- proposal status
- notes
- objection log
- owner assignment
- pipeline stage changes
- meeting confirmation workflow
- no-show follow-up workflow
- nurture reminders

### Call preparation panel
For each booked call, show:
- company summary
- analyzer findings
- likely pain points
- prior messages
- assets shared
- suggested discovery questions
- suggested proof points
- likely objections
- calculator angle to use

### Post-call workflow
Prompt operator to log:
- pain confirmed?
- urgency
- timeline
- decision maker status
- current design setup
- volume needs
- fit score
- next steps
- proposal probability
- objections surfaced
- custom notes

---

# 14. AI Agent / Learned Skill Layer

### Purpose
Create reusable agent prompts that can run continuously and generate relevant material.

Build the app with a prompt library and "skills" registry.

## Required skills / agents

### Agent 1: Prospect Strategist
Purpose:
- review imported accounts
- assign ICP
- assign priority tier
- suggest likely pains
- suggest best sequence family

### Agent 2: Analyzer Interpreter
Purpose:
- turn raw analyser output into concise operator-friendly insight
- assign issue cluster
- suggest business consequence
- suggest best hook angle

### Agent 3: Message Writer
Purpose:
- create first-touch and follow-up copy
- adapt by channel and ICP
- keep first touches concise
- ensure CTA is low-friction

### Agent 4: Sequence Builder
Purpose:
- assemble full 4 to 7 touch sequence
- select proper angles per step
- avoid repetitive follow-ups

### Agent 5: Asset Recommender
Purpose:
- pick the right Design Bees asset for the stage
- recommend whether to send summary or link
- recommend whether to hold the asset until after reply

### Agent 6: Reply Triage Agent
Purpose:
- classify incoming replies
- draft suggested response
- set urgency and next-best-action

### Agent 7: Call Prep Agent
Purpose:
- generate briefing notes for booked calls
- prepare discovery questions
- suggest proof points and calculator usage

### Agent 8: Experiment Analyst
Purpose:
- analyze performance
- identify winners / losers
- suggest next experiments
- detect when a sequence should be paused

### Agent 9: Playbook Writer
Purpose:
- update playbook sections based on latest learnings
- summarize what is working by ICP and industry

---

## Prompt templates for the skills registry

### Skill Prompt 1: Prospect Strategist
```text
You are the Prospect Strategist for Design Bees.

Your job is to review a prospect account and decide:
1. Which ICP it belongs to
2. Its priority tier
3. The top 3 likely pains this company has related to design, campaign execution, creative operations, or conversion friction
4. Which outreach angle is most likely to create curiosity
5. Which Design Bees asset should be used later in the sequence
6. Which sequence family should be assigned

Use the following context:
- company name
- domain
- industry
- employee band
- homepage analyser output
- job titles available
- any notes or source details

Important rules:
- Do not default to "they need design"
- Focus on operational pain, friction, or missed revenue opportunities
- Keep reasoning concise and commercial
- Output structured JSON
```

### Skill Prompt 2: Analyzer Interpreter
```text
You are the Analyzer Interpreter for Design Bees.

Convert structured homepage analyser output into:
- 1 short observed signal
- 1 genuine positive
- 1 to 2 sharp diagnoses
- 1 business consequence
- 1 recommended hook angle
- 1 recommended CTA style

Rules:
- Make it commercially meaningful
- Avoid generic UX language
- Translate findings into business impact
- Keep the first observed signal concise enough to be used in an opening line
- Output JSON plus a plain-English summary
```

### Skill Prompt 3: Message Writer
```text
You are the Message Writer for Design Bees.

Write outbound copy that feels specific and relevant, not mass-blasted.

Inputs:
- ICP
- company details
- industry
- priority tier
- analyzer findings
- selected insight blocks
- sequence step
- channel
- chosen CTA style
- chosen asset strategy
- prior reply history if any

Rules:
- First-touch emails should usually be 50 to 100 words
- Do not pitch the subscription service in the first touch
- Do not use generic "just checking in" language
- Do not ask for a meeting in the first line
- Use an interest CTA when cold
- Sound commercially sharp and observant
- Output 3 variants: concise, consultative, direct
```

### Skill Prompt 4: Sequence Builder
```text
You are the Sequence Builder for Design Bees.

Create a multichannel 4 to 7 touch outbound sequence.

Inputs:
- ICP
- issue cluster
- industry
- channel mix
- asset timing
- priority tier
- top likely pains
- tone preference

Rules:
- Each step must introduce a new angle, proof point, or asset
- Avoid repetitive follow-ups
- Use low-friction CTAs early
- Keep channel shifts logical
- Include stop rules if positive reply, hard no, referral, or do_not_contact occurs
- Output JSON and human-readable summary
```

### Skill Prompt 5: Asset Recommender
```text
You are the Asset Recommender for Design Bees.

Select the best next asset to use based on:
- ICP
- funnel stage
- issue cluster
- engagement level
- prior asset exposure
- likely pain

Available assets:
- Homepage Analyser
- ROI Calculator
- Brief Builder
- Campaign Planner
- Design Checklist
- Mistakes / educational asset

Rules:
- Do not overuse assets in first touch
- Use the ROI Calculator after interest is established
- Use assets to increase conviction, not create noise
- Output recommended asset, timing, and delivery format
```

### Skill Prompt 6: Reply Triage Agent
```text
You are the Reply Triage Agent for Design Bees.

Classify an inbound reply and determine:
- reply class
- urgency
- recommended next-best-action
- draft response
- whether to offer a booking link, calculator, or tailored breakdown
- whether a human should review before sending

Rules:
- Keep replies concise and commercially aware
- Do not oversell
- Respect do-not-contact and special requests immediately
- Output JSON plus ready-to-send draft
```

### Skill Prompt 7: Call Prep Agent
```text
You are the Call Prep Agent for Design Bees.

Prepare a short call brief for a booked consultation.

Include:
- company summary
- likely pains
- analyzer insights
- what triggered the reply
- likely decision criteria
- suggested discovery questions
- which Design Bees asset to reference
- likely objections
- desired next step after the call

Keep it concise, practical, and sales-usable.
```

### Skill Prompt 8: Experiment Analyst
```text
You are the Experiment Analyst for Design Bees.

Review outbound performance data and determine:
- what is working
- what is failing
- which sequence should be scaled
- which message should be killed
- what experiment to run next
- whether performance differs by ICP, industry, issue cluster, channel, or asset timing

Prioritize:
- positive reply rate
- booked rate
- held rate
- close rate

Do not optimize for vanity metrics alone.
```

### Skill Prompt 9: Playbook Writer
```text
You are the Playbook Writer for Design Bees.

Your job is to update the outbound operating playbook using recent performance data.

Summarize:
- what hooks are winning
- what issue clusters convert
- which assets advance deals
- which ICPs are most responsive
- what objections are recurring
- what the operators should change this week

Output a concise, practical playbook update.
```

---

# 15. Suggested Tech Stack

Use a practical, modern stack that Codex / Claude can build quickly.

### Frontend
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui or similar component layer
- React Query or server actions
- charting library for dashboards

### Backend
- Next.js API routes or dedicated Node service
- TypeScript
- Supabase or PostgreSQL
- Prisma ORM
- background jobs with Trigger.dev / BullMQ / similar

### Data / storage
- PostgreSQL
- object storage for reports / screenshots / exports

### Auth
- Clerk / Supabase Auth / NextAuth

### AI orchestration
- provider-agnostic interface
- support OpenAI and Anthropic model providers
- prompt versioning table
- JSON schema validation for structured outputs

### Integrations
- existing homepage analyser integration
- email provider abstraction
- social / CRM webhook stubs
- calendaring integration stubs
- CSV import/export
- webhook support

### Observability
- structured logs
- error tracking
- audit logs
- event tables for analytics

---

# 16. Data Model

Create at minimum the following tables or equivalent entities.

## accounts
- id
- company_name
- domain
- website_url
- industry
- sub_industry
- employee_band
- revenue_band
- geography
- ICP_type
- fit_score
- priority_tier
- source
- source_detail
- source_capture_date
- owner_id
- created_at
- updated_at

## contacts
- id
- account_id
- first_name
- last_name
- full_name
- job_title
- seniority
- email
- phone
- linkedin_url
- contact_source
- source_date
- outreach_context
- contact_block_status
- created_at
- updated_at

## analyses
- id
- account_id
- domain
- page_url
- page_type
- analyzed_at
- hero_clarity_score
- CTA_clarity_score
- CTA_prominence_score
- visual_hierarchy_score
- message_order_score
- outcome_clarity_score
- trust_signal_score
- friction_score
- mobile_readability_score
- primary_issue_code
- secondary_issue_code
- tertiary_issue_code
- issue_summary_short
- issue_summary_detailed
- strengths_detected_json
- recommended_priority_fix
- confidence_score
- raw_notes_json
- screenshot_url

## issue_clusters
- id
- issue_code
- issue_name
- description
- severity_default
- category

## insight_blocks
- id
- issue_code
- ICP
- industries_json
- short_insight_line
- longer_explainer
- business_consequence
- suitable_channels_json
- suitable_steps_json
- CTA_pairings_json
- asset_pairings_json
- active
- created_at
- updated_at

## sequences
- id
- sequence_name
- ICP
- issue_cluster
- industry_filter
- priority_tier
- channel_mix_json
- CTA_strategy
- asset_strategy
- active
- created_at
- updated_at

## sequence_steps
- id
- sequence_id
- step_number
- day_offset
- channel
- objective
- angle
- template_id
- asset_to_include
- personalization_required_fields_json
- send_window
- fallback_behavior

## message_templates
- id
- channel
- ICP
- issue_code
- tone
- stage
- variant_name
- subject_template
- body_template
- CTA_style
- active
- created_at
- updated_at

## prospect_sequences
- id
- account_id
- contact_id
- sequence_id
- status
- current_step
- started_at
- completed_at
- stopped_reason

## activities
- id
- account_id
- contact_id
- channel
- activity_type
- subject
- body
- sent_at
- delivered_at
- opened_at
- replied_at
- activity_metadata_json

## replies
- id
- activity_id
- raw_reply
- classified_as
- sentiment
- urgency
- suggested_next_action
- human_review_required
- created_at

## assets
- id
- asset_name
- asset_type
- description
- funnel_stage_best
- ICP_fit_json
- issue_fit_json
- delivery_modes_json
- existing_url
- active

## asset_usage
- id
- asset_id
- account_id
- contact_id
- activity_id
- stage
- shared_at
- engaged_at
- engagement_type

## opportunities
- id
- account_id
- contact_id
- stage
- value_estimate
- booked_at
- held_at
- proposal_sent_at
- closed_at
- closed_status
- loss_reason
- win_reason
- notes

## experiments
- id
- name
- hypothesis
- variable_tested
- control_variant
- test_variant
- segment_json
- start_date
- end_date
- status
- result_summary
- decision

## events
- id
- event_name
- account_id
- contact_id
- related_id
- payload_json
- occurred_at

## playbook_entries
- id
- category
- title
- body_markdown
- version
- active
- created_at

---

# 17. Core UI Screens

Build the following UI pages:

1. Dashboard
2. Accounts list
3. Contact list
4. Account detail page
5. Analysis detail page
6. Issue cluster explorer
7. Insight library editor
8. Message generator workspace
9. Sequence builder page
10. Execution queue page
11. Reply inbox / triage page
12. Call prep page
13. Opportunities pipeline page
14. Asset performance page
15. Experiment center
16. Playbook page
17. Settings / integrations

### Account detail page must show
- company info
- ICP and fit
- analyzer snapshot
- issue cluster
- recommended pains
- recommended sequence
- messages generated
- activities timeline
- replies timeline
- assets used
- opportunity status
- recommended next action

---

# 18. Performance Targets Inside the App

Set editable benchmark targets, not hardcoded promises.

### Default working targets
- first-touch email word count: 50 to 100
- first-touch DM word count: 40 to 90
- default touches per sequence: 4 to 7
- target reply time after inbound response: under 5 minutes
- target positive reply rate by cluster and ICP: configurable
- target booked-call rate by sequence: configurable
- target held rate: configurable

### Internal benchmark panel
Show:
- actual vs target
- which metric is constraining pipeline
- where bottlenecks are occurring
- what operator action is recommended

---

# 21. Seed Playbook Content To Preload

Add these starter playbook sections directly into the product.

## Playbook: first-touch rules
- lead with an observed signal
- include one specific positive if genuine
- mention 1 to 2 issues max
- tie issue to business consequence
- do not hard pitch
- use low-friction CTA
- keep it short

## Playbook: follow-up rules
- every follow-up must add a new angle
- do not send "just bumping this"
- vary by consequence, proof, or asset
- stop when prospect clearly says no
- redirect if referred

## Playbook: asset rules
- do not over-link in first touch
- use the analyser as observation source
- use the ROI calculator after interest
- use the brief builder for process pain
- use the checklist as a low-friction value add

## Playbook: call rules
- review analyzer before call
- confirm pain rather than assume it
- use calculator to quantify operational waste
- align solution to current workflow
- agree clear next step before call ends

## Playbook: experimentation rules
- test one variable at a time
- scale only when business metrics improve
- log why a test won or lost
- refresh weak insight blocks

---

# 22. Example Sequence Outputs To Seed The System

## Example Founder Sequence
### Touch 1
Observation about homepage clarity + business consequence
CTA: "Worth sending the breakdown?"

### Touch 2
Reframe around wasted enquiries / unclear next step
CTA: "Open to seeing the one area I would fix first?"

### Touch 3
Offer checklist or short analyzer summary
CTA: "Want me to send the summary over?"

### Touch 4
Introduce operational cost angle
CTA: "Would a quick benchmark be useful?"

### Touch 5
Short direct follow-up
CTA: "Should I close the loop on this?"

## Example Marketing Manager Sequence
### Touch 1
Landing page / message-order issue
CTA: "Happy to share what I noticed if useful."

### Touch 2
Campaign delay / creative bottleneck angle
CTA: "Open to a quick summary?"

### Touch 3
Brief Builder or process angle
CTA: "Would seeing the framework help?"

### Touch 4
ROI calculator summary / hidden cost angle
CTA: "Worth comparing notes on this?"

### Touch 5
Performance / conversion angle
CTA: "Should I send the short version?"

## Example Agency Sequence
### Touch 1
Overflow / delivery-quality angle
CTA: "Worth sending the breakdown?"

### Touch 2
Margin erosion via revision loops
CTA: "Open to seeing where this usually leaks time?"

### Touch 3
White-label capacity angle
CTA: "Want me to send the summary?"

### Touch 4
Operational efficiency angle
CTA: "Useful to compare workflows?"

### Touch 5
Close-the-loop
CTA: "Should I leave this with you?"

---

# 20. Build Phases

## Phase 1
- authentication
- database
- account/contact import
- homepage analyser integration
- issue cluster assignment
- dashboard basics

## Phase 2
- insight library
- message generator
- sequence builder
- activity logging
- reply inbox
- next-best-action engine

## Phase 3
- asset matching
- experiment center
- playbook module
- call prep
- opportunities pipeline

## Phase 4
- automation polish
- prompt versioning
- advanced dashboards
- exports
- admin tools
- deeper integration hooks

---

# 21. Acceptance Criteria

The build is acceptable only if all of the following are true:

1. I can import a prospect list and analyze domains at scale.
2. The system can convert analyzer output into issue clusters and likely business pains.
3. The system can generate personalized first-touch messages and follow-ups by ICP.
4. The system can recommend which Design Bees asset to use and when.
5. I can track performance by account, contact, sequence, issue cluster, asset, and ICP.
6. I can see a daily task queue and hot prospects requiring rapid follow-up.
7. I can run experiments and compare performance across variants.
8. I can use the built-in playbook to operate the system daily.
9. I can export prompts / templates / sequence logic for use in Codex or Cowork.

---

# 22. Implementation Notes for the Builder

- Build cleanly and modularly.
- Favor readable code over cleverness.
- Use strong typing and clear schemas.
- Use server-side validation.
- Validate AI JSON outputs before persisting.
- Build seed data so the product is usable immediately after setup.
- Include demo data for all three ICPs.
- Include at least 10 seed issue clusters and 40 seed insight blocks.
- Include at least 3 seed sequences, one per ICP.
- Include an easy way to edit prompts and templates in-app.
- Include CSV export for reports and playbook snapshots.

---

# 23. What Success Looks Like

Success is not "the app exists."

Success is:
- the app helps create better first touches
- the app helps cluster real issues from homepage analysis
- the app helps route the right asset at the right time
- the app helps improve reply quality and booked calls
- the app helps the operator know what to do every day
- the app captures enough data to improve itself week over week

Build the system accordingly.
