# Discover: student-directed recommendations

Added to the existing volunteer site; its audience and core service-hour flows are unchanged.

## Working functionality

- /#/discover, /#/discover/profile, /#/discover/:id, sidebar navigation, mobile navigation, and overview entry point.
- Three modes using the agreed nine-criterion matrix: experience (25/15/5/15/10/10/10/5/5), learn (20/0/5/25/20/10/10/5/5), interests (35/0/0/20/15/10/10/5/5).
- Resume excerpt input, text/Markdown import (200 KB limit), deterministic suggested tags, editable tags, explicit review, optional LinkedIn reference and resume-free exploration.
- Live ranking updates for topic, day, transport, travel time, commitment, travel-cost limit, and cause. Mode changes do not change mandatory checks.
- Role descriptions, training pathways, source status, uncertainty ranges, and criterion-level scoring explanations.
- Save/unsave on device, saved view, browse-all view, hide and restore recommendations, empty states and unknown route state.

## Honest boundaries

This is an interactive local prototype, not an operational Claude agent. All seven openings and providers, their requirements, routes and costs are fictional fixtures. VITA is a real program type; its sample provider is fictional and the UI links separately to the official IRS volunteering information page.

No Anthropic API credential or live-opportunity service was supplied. No AI call, LinkedIn fetch, live geocoding/routing, application submission, coordinator assignment or skill verification is performed. Text extraction uses a small, disclosed keyword dictionary; manual review is required. PDF and Word imports are not supported; users can paste excerpts instead. No personal resume or LinkedIn URL leaves the page or persists across refresh. Only saved fixture IDs are stored in localStorage.

This phase does not implement the real account-age/certification enforcement needed for live applications. Fictional training prerequisites remain visible even when experience matches. Live integration must enforce published age requirements, actual prerequisites, source freshness, capacity and event status server-side, and request clarification for missing requirements.

## Engine semantics

`dist/discover/engine.js` is shared browser/CommonJS-compatible pure ranking logic. `rank` performs hard filters before sorting; `evaluate` still exposes reasons for excluded roles in Browse all.

Known contribution = weight × rating / 5. Unreviewed experience is unknown, not zero. Unknown weighted criteria contribute [0, weight], resulting in a lower/upper bound. Zero-weight unknown criteria add no uncertainty. Sorting uses supported lower bound, then stable listing ID. The interval is not statistical confidence. A reviewed empty profile is an explicit zero experience match. There is no SycaMore history, prestige or profile-completeness bonus.

For this prototype, intent/learning ratings come from topic and task tags; direct experience is tag coverage; transferable experience uses the small explicit topic-adjacency map; support ratings are fixture values. Any day and any cause receive neutral 3/5 rather than fabricated specific alignment. Journey rating is based on fixture minutes relative to the chosen maximum, with travel cost as a hard budget gate; a real routing/transfer-quality submatrix is not implemented. Unknown travel/cost makes a listing conditional.

## Claude integration seam

Keep the numerical engine deterministic. Replace keyword extraction and fixture sourcing with server-side, structured, evidence-backed extraction and retrieval. The server should return student-reviewable task/skill claims and sourced listings, including URLs, checked_at, roles, prerequisites, support, capacity and logistics. An LLM must not invent dates, availability, travel times, training completion or attested skills. No API key belongs in these browser assets. A live server and credential configuration remain required.

## Research basis

The design adapts public principles, not proprietary formulas. Proposed weights have not been validated with students.

- LinkedIn: https://www.linkedin.com/help/linkedin/answer/a512279/jobs-recommended-for-you?lang=en
- Eightfold semantic and structured matching: https://eightfold.ai/engineering-blog/ai-powered-talent-matching-the-tech-behind-smarter-and-fairer-hiring/
- Workday Fit & Gap: https://doc.workday.com/hiredscore/en-us/workday-hiredscore/recruiter-productivity-/concept--fit---gap.html
- Gloat aspirations, projects and learning: https://gloat.com/platform/the-talent-marketplace/
- Google rubrics: https://rework.withgoogle.com/intl/en/guides/a-guide-to-structured-interviewing-for-better-hiring-practices
- JLL commuting: https://www.jll.com/en-uk/guides/is-your-office-location-costing-you-talent
- IRS volunteering information: https://www.irs.gov/individuals/irs-tax-volunteers

## Validation

`node --test tests/discover.test.cjs`: 11 tests covering mode normalization, uncertainty, resume independence in interest mode, preference-driven reranking, travel/day/commitment/budget exclusion, conditional unknown routes, preserved tax-training requirements, beginners, score bounds/reconciliation and closed listings.

Browser checked: desktop rendering, topic reranking, sample-profile extraction and explicit review, personalized role score detail, saving, phone detail stacking, mobile preference editing and interest mode. Physical iOS/Android testing and live integrations were not performed.

## Cause and role-skill update (current behavior)

This section supersedes the earlier topic-based description where it differs.

Discovery now separates cause, contribution area, selected skills to use, and selected skills to develop. Nine cause categories and nine skill groups are available. The catalog now has nine fictional opportunities; not every cause has a matching fixture. Cause is a ranking preference rather than an exclusion. In-person/remote/hybrid is an explicit filter. Fully remote roles bypass commute-time and travel-cost checks. Hybrid roles do not.

`taxonomy.js` enriches fixtures with required skills, practice skills, support, readiness labels, format and concrete deliverables. Food pantry budget helper and animal outreach fixtures demonstrate skill/cause combinations. No Taproot listings were imported or represented as SycaMore partners. Source URLs/last-check timestamps remain null for fictional fixtures and are labeled as such. External source freshness remains a live-integration requirement.

`extractRoles` separates user-pasted role descriptions into paragraphs, retains the role title and responsibility text, and proposes skill tags with supporting excerpts. Headings are excluded from extraction where responsibility text exists. A student can edit role titles, remove a skill, add a skill, remove a role or create a role manually. Every update invalidates the review confirmation. Profile application requires explicit review. User-confirmed statements are not independently verified or evidence of mastery. Recommendations retain the original role and excerpt for exact role-skill matches. Clicking a skill requests related contributions across causes and does not restrict the student to a major.

`match-v2.js` supplies current numerical scoring, keeping nine criteria and existing mode weights. Current direction uses selected contribution/learning skills plus an optional contribution area; interest mode uses current cause. Direct experience compares required skills with the union of skills in reviewed roles; no-required-skill roles receive neutral direct-experience ratings. Transferable experience uses the small adjacency map. Learning fit compares selected development skills with listed practice opportunities, not requirements. Missing required-skill tags trigger review, not a claim of ineligibility or automatic assignment. Training prerequisites remain visible. No language-model learning/prediction or proficiency inference is implemented.

The LinkedIn field remains a reference only. A URL alone is not imported or scraped. Students can paste LinkedIn experience descriptions instead. All role text, skills, preferences and profile URLs remain browser-memory-only and clear on refresh; saved fixture IDs alone persist on device.

Validation: 22 tests across the original engine and updated taxonomy engine passed. New tests cover role-skill provenance, unreviewed evidence exclusion, budgeting across causes, required versus practice skills, remote and hybrid travel checks, format/interest behavior, requirement review and unknown-route intervals. Browser verified: role extraction/review, reverse budgeting search, source-role excerpts on detail pages, presets and phone layout. No actual Claude, LinkedIn, routing or external listing connection is claimed.

## Compact fit presentation

Role detail now leads with a one-sentence task summary, format/time/commitment, and a compact fit-and-save card. The donut displays supported fit points out of 100; CSS maps each point to 3.6 degrees, so 100 fills the entire ring. Unknown criteria keep the label “Your fit so far” and a short uncertainty note. The interval and numerical contributions remain inside the initially collapsed “See why this fits” disclosure, together with role evidence. No scoring weights or matching rules changed.

The main card has at most two concise match reasons and a prominent Save for later toggle. Mandatory training, missing requirements, and constraint conflicts remain visible before saving. Saving still stores only a fixture ID on-device and does not submit an application. On phone layouts the fit-and-save card appears before the longer task details; on wide desktop it sits beside them. Listing cards use the same compact donut language.

Verification: JS syntax; browser desktop and phone rendering; save toggle; optional scoring disclosure; phone content widths. Existing numerical engine unchanged.

### Placement correction

The donut appears only inside an opened opportunity, in its original “Your fit, explained” section. Browsing cards retain their previous simple fit display. The original event detail layout, full task description, required/practice skills, deliverable, support and before-you-join text remain visible. Only the numerical fit section is simplified; its table/evidence are available in a collapsed disclosure. Save remains available beside the event description and within the fit section.

## Organization-first opportunity page

Updated the exact opened opportunity view shown in the user's Animal shelter outreach assistant screenshot. The organization now appears in a two-column sage banner: name and emblem on the left, concise organization description on the right. Descriptions are explicitly authored for fictional sample organizations and labeled as preview content.

Opportunity title, concise purpose, and cause/format/commitment/day/readiness tags follow the banner. The readable task description remains visible, followed by grouped required/practice skill tags, compact availability/commitment/journey facts, a short support description and visible mandatory training. The fit donut and save action remain inside this opened page, with detailed scoring collapsed. Browsing cards are unchanged. On phone the organization banner and detail columns stack; task descriptions stay visible before fit details. No jobs, applications, AI or live data sources were added or implied.

The phone view also exposes a Save for later action immediately below the opportunity tags, so users can save without scrolling past the readable description. The detailed fit-and-save section remains below. Checked desktop hierarchy, phone stacking, and save state. Numerical matching rules were unchanged.
