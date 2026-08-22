---
name: setup-link-page-analytics
description: Generate AI-assisted GA4/GTM health reports for Link Pages, including safe Google OAuth onboarding, site-specific tracking analysis, and approval-gated repair plans.
---

# Setup Link Page Analytics

Use this skill when a user asks to connect, audit, monitor, diagnose, or improve GA4/GTM tracking for a Link Page or similar CTA-driven website.

## Product goal

The primary deliverable is a trustworthy, repeatable Analytics Health Report. GA/GTM setup is only an optional repair action after the report identifies a problem.

Keep two layers separate:

1. **Analytics API Core** — stable Google OAuth, Admin API, Data API, GTM API, Measurement Protocol validation, normalized evidence, status semantics, and safe API errors.
2. **Site-specific Analysis** — evolving AI analysis of the repository, DOM, JavaScript, CTA taxonomy, SPA/navigation behavior, deployment, expected event contract, and custom-dimension needs. Version this profile when the site changes.

## Default Codex Desktop workflow

1. Ask one short consent question before any OAuth or Google account action: **「是否同意我現在啟動 GA4/GTM 唯讀 API 授權流程？」** If the answer is not an explicit yes, stop.
2. After consent, run a local-only preflight. Inspect the repository, existing GTM/GA installation, CTA structure, and current site profile without requesting Google access.
3. Explain only the minimum read-only scopes. Do not request edit or publish scopes for a health report.
4. Start the local loopback OAuth flow. In Codex Desktop, open the generated Google OAuth URL in the user's Chrome session. The user performs Google login, 2FA, and consent; never ask for or type their password/OTP and never request a token in chat.
5. Receive the loopback callback and run the API health report in the same protected local process, or use the user's protected secret manager for later runs. Never print or commit tokens.
6. Combine local evidence with GA Admin, GA Data/Realtime, and GTM evidence. Classify each check as `PASS`, `WARN`, `FAIL`, or `INFO`; absence of recent traffic is normally `WARN`, not automatic failure.
7. Have the AI explain root causes, confidence, and the smallest repair plan. Do not mutate GA/GTM until the user explicitly approves the proposed change.
8. For approved repairs, use idempotent workspace changes, inspect existing objects, detect conflicts/fingerprints, validate in Preview/DebugView, then request separate approval before version creation or production publish.
9. After a DOM, CTA, event, deployment, or reporting requirement changes, update the site-specific profile version and rerun the report. Do not weaken a failing check just to make the score pass.
10. For user delivery, render the report into local `latest.html`, `latest.md`, and `latest.json` plus timestamped history. Keep the report outside the public Link Page; only deliver it through a private, access-controlled channel.

## Required output

Return a concise report with:

- authorization state and scopes, without secrets;
- target site/profile version;
- checks with expected vs observed evidence;
- recent/realtime observation windows and limitations;
- duplicate or drift findings;
- recommended repair plan and required approval boundary;
- verification evidence and next check.

For report rendering and delivery, read [references/report-delivery.md](references/report-delivery.md).

Read [references/oauth-onboarding.md](references/oauth-onboarding.md) for the Codex Desktop authorization contract and [references/health-report-contract.md](references/health-report-contract.md) for report semantics and routing.
