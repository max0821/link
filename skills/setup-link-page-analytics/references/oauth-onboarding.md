# OAuth onboarding contract

## Scope stages

| Stage | Scopes | Purpose |
| --- | --- | --- |
| Health | `analytics.readonly`, `tagmanager.readonly` | Inspect configuration and query reports |
| Repair | `analytics.edit`, `tagmanager.edit.containers`, `tagmanager.edit.containerversions` | Create or modify drafts after approval |
| Publish | `tagmanager.publish` | Publish a version only after a second explicit approval |

Use the smallest stage that satisfies the current request. Do not request publish permission while producing a read-only health report.

## Codex Desktop interaction

Codex Desktop is the coordinator, not the identity provider:

1. Run local preflight and show why access is needed.
2. Start a loopback callback on `127.0.0.1`.
3. Open the OAuth URL in the user's existing Chrome session.
4. Let the user handle account selection, password, 2FA, and consent.
5. Receive only the callback result in the local process.
6. Run the report without displaying the access or refresh token.

If the local tool exposes `health:connect`, prefer it because it keeps the exchanged token in memory for the current report. For recurring runs, use an OS credential store or server-side secret manager selected by the user; never create a plaintext token file in the repository.

## Failure routing

- Missing OAuth client: explain Google Cloud Project/API enablement and ask the user to configure protected local credentials.
- `access_denied`: report that the user cancelled; do not retry repeatedly.
- `redirect_uri_mismatch`: show the exact loopback URI required by the OAuth client.
- `403`: distinguish missing Google API enablement from missing GA/GTM resource role and explain which account must be granted access.
- Expired/revoked refresh token: ask the user to reauthorize in Chrome; never ask them to paste the token.
