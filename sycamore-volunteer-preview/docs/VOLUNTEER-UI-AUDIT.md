# Volunteer UI audit

Reviewed all 31 documents under the SycaMore Team Hub, including the uploaded Volunteer brief, all subfolders, the 7 superseded kit copies, historical pitches, the shared contract and organization additions. Also inspected the supplied 56-second volunteer walkthrough video.

## Source precedence

The weekend shared contract governs integration. The organization additions introduce badge_award and four badge keys. Business Model V2 and the fact sheet govern factual claims; older pitches and the video supply visual references. The video contains older Outreach Strategist and Consultant concepts, which are not in the four-key signed-award contract.

## Interface coverage

| Feature | This structure | Live integration remaining |
|---|---|---|
| Join, age gate | Form; rejects under 13; minor profile | httpOnly vid, server validation, existing-email sign-in |
| Check-in/out | Code, active timer, pending transition | API responses, server timestamps, offline queue/retry |
| My hours | Attested and pending; no pending number; empty state | Contract records API, practice-event exclusion |
| Record | Exact wording; captured/adjusted split and reason | Server ownership and immutable records |
| Share and verification | Sample link; verified/revoked/unknown views | Random codes, public API, QR code, real HTTP 404 |
| Badges | Portfolio, 4 badge types, signed detail, issuer, evidence and signer | Signed badge_award rows only; badge API not yet in shared contract |
| Progress | Clearly illustrative Team Leadership and Event Coordination requirements | Compute from attested eligible roles; organization approval |
| Journey | Sample event and role timeline | Actual service history, without practice events |
| LinkedIn post | Editable post preview, copy, open LinkedIn | Add a real publicly accessible badge verification URL |
| LinkedIn profile | Credential fields and description to copy | Valid issued credential and public badge verification URL |
| Certificate | Print/save-as-PDF through browser | Live signed badge evidence |
| AI wording | Template preview | Server OpenAI structured output and number check |
| Guardian controls | UI share restrictions for minors | Server 403; guardian consent remains outside weekend scope |
| Desktop and phone | Responsive UI, sidebar / bottom navigation, explicit preview switch | Real iOS Safari and Android phone verification |

## Deliberately not represented as working

No production database or authentication is connected. Badge examples and the timeline are explicitly separate illustrative fixtures from the existing two sample hour records. There is no LinkedIn partnership, automatic posting, employer validation, Index score, rarity, leaderboard, GPS check-in, or event registration. User explicitly requested LinkedIn UI, so it is included even though older product scope deferred employer integrations.

Badge thresholds from current product brief: Team Leadership 3 events/9 hours; Event Coordination 2 events/6 hours; Resource Logistics 2 events/15 hours plus written evidence. Urban Canopy has no threshold supplied in the organization additions, so none was invented. Signed awards include organization evidence and signer. Broader-product 48-hour holds are described only on requirements screens; weekend additions govern actual signed-award integration.

## Phase 1 refresh — October 23

Re-read the Team Hub and all five subfolders, including current build briefs, shared contract, organization additions, the 11 Competition Kit documents, the 3 historical sources and superseded copies. Read the attached volunteer brief locally. Inspected the supplied walkthrough with sampled frames throughout its duration.

Video mapping: profile summary → overview/profile; upcoming events → sample event cards with save toggles; badge gallery → signed/in-progress/locked filters; progress → next badge requirements; evidence and journey → signed detail and service timeline; LinkedIn → editable post and certification-field previews. Historical Strategist and Consultant badge names are not current contract badge keys; current four signed badge types take precedence.

New polish: two-column dashboard, personal goal ring and editor, illustrated upcoming-event cards, searchable attested records, badge filters, clearer hierarchy, preserved green/cream tokens, reduced-motion support, and mobile detail stacking. QR code opens the sample public verification route.

Research (official sources checked):
- POINT https://pointapp.org/ — volunteer web/mobile home base, impact emphasis and check-in entry points. Adopted task-focused navigation and a prominent check-in action.
- Golden https://goldenvolunteer.com/ — volunteer service, credentials and activity tracking. Adopted compact upcoming-event cards and an easy-to-scan activity summary.
- GivePulse https://learn.givepulse.com/volunteers and https://support.givepulse.com/hc/en-us/articles/360025446014-Track-Manage-and-Update-your-Impacts-Timesheets-User-Volunteer-Guide — volunteer dashboard, impact detail, and search/filter patterns. Adopted record search and evidence detail.
- MobileServe https://mobileserve.com/ and https://mobileserve.com/k-12/ — simple volunteer tracking and service-goal presentation. Adopted a personal goal summary without adding editable hour claims.

Research observations are from public pages and documentation, not signed-in competitor dashboards. Layout choices are original adaptations, not reproduced proprietary screens.

Verification: JavaScript syntax, browser-rendered dashboard, signed badge filtering, badge evidence and LinkedIn preview dialog. Checked simulated phone layout and corrected certificate stacking. Physical iOS/Android testing has not been performed. Backend authentication, API integration, real public record issuance, offline synchronization and OpenAI remain next-phase work. Sample badge fixtures remain illustrative and separate from hour-record fixtures.
