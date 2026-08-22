# Report delivery

## Output contract

Run `npm run report` from `tools/google-analytics/` after the local OAuth refresh token is configured. The tool writes:

- `reports/latest.html`: user-readable report with score, status counts, checks, observations, and expandable evidence.
- `reports/latest.md`: compact version for a message, ticket, or review note.
- `reports/latest.json`: normalized evidence for a later AI run or trend processor.
- `reports/health-<timestamp>.*`: timestamped snapshot for history.
- `reports/history.json`: up to 90 summary snapshots for score and check drift.

The report writer must never print or persist access tokens, refresh tokens, OAuth client secrets, or Measurement Protocol API secrets. The output directory is local and ignored by Git.

## User-facing delivery choices

Prefer these in order:

1. Open `latest.html` locally during a Codex Desktop session.
2. Send the Markdown report through an authenticated support or project channel.
3. Serve the HTML from a private authenticated dashboard backed by a server-side scheduled runner.

Do not place the report under the public Link Page, publish it as an unprotected static page, or commit it to the repository. Google identifiers and aggregate counts are not credentials, but the report still represents private account telemetry.

## Recurring operation

The scheduled runner should call `npm run report`, retain the timestamped snapshot, compare the current summary with `history.json`, and notify only when the overall state changes or a new `FAIL`/`WARN` appears. A report with no recent events is normally a `WARN` and should include the observation window and the fact that Realtime may be fresher than the historical report.

For the Codex Desktop and Chrome-specific onboarding, preview, DebugView, and local HTML rendering flow, read [../../../tools/google-analytics/CODEX_DESKTOP_WORKFLOW.md](../../../tools/google-analytics/CODEX_DESKTOP_WORKFLOW.md) from the project root.
