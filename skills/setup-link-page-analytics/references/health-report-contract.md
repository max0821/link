# Health report contract

## Evidence sources

- **Local site scan:** GTM snippet, measurement IDs, dataLayer/event code, CTA selectors/attributes, duplicate instrumentation, deployment hints.
- **GA Admin API:** Property, Web Data Stream, Measurement ID, Custom Dimensions, Key Events.
- **GA Data API:** Realtime and historical event observations, source/landing-page/CTA reports where dimensions exist.
- **GTM API:** Container, Workspace, tags, triggers, variables, workspace status, versions and fingerprints.
- **Browser verification:** GTM Preview, Tag Assistant, GA4 DebugView, and production network checks when API evidence cannot prove client execution.

## Check shape

```json
{
  "id": "ga.web_stream",
  "status": "PASS|WARN|FAIL|INFO",
  "message": "human-readable result",
  "evidence": {
    "expected": {},
    "observed": {},
    "source": "analytics_admin_api",
    "checkedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

## Interpretation

- `PASS`: expected configuration or observation is present and consistent.
- `WARN`: inconclusive or time-dependent, such as no recent traffic, unpublished draft, or temporarily unavailable observation API.
- `FAIL`: concrete broken state, mismatch, missing object, duplicate object, or violated site event contract.
- `INFO`: context that should not lower the health score.

Do not treat an empty Realtime response as proof that GA is broken. Compare it with publish state, DebugView, historical data, event freshness, and local/browser evidence.

## Profile evolution

When the site changes, update the site-specific profile rather than the API Core. Record:

- profile version and reason for change;
- new/removed CTA selectors and taxonomy;
- event and parameter contract changes;
- new expected GA/GTM objects;
- migration or backward-compatibility notes;
- the health checks that should change and why.
