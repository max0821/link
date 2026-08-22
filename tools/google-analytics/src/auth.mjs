import { config, scopes, requireConfig } from "./config.mjs";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

export function buildAuthorizationUrl({ write = false, state = "link-9sweb" } = {}) {
  requireConfig("oauthClientId");
  const query = new URLSearchParams({
    client_id: config.oauthClientId,
    redirect_uri: config.oauthRedirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: [...scopes.read, ...(write ? scopes.write : [])].join(" "),
    state,
  });
  return `${AUTH_ENDPOINT}?${query}`;
}

async function tokenRequest(body) {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error_description || payload.error || `HTTP ${response.status}`;
    throw new Error(`Google OAuth 交換失敗：${message}`);
  }
  return payload;
}

export async function exchangeAuthorizationCode(code) {
  requireConfig("oauthClientId", "oauthClientSecret");
  if (!code) throw new Error("缺少 authorization code。");
  return tokenRequest({
    code,
    client_id: config.oauthClientId,
    client_secret: config.oauthClientSecret,
    redirect_uri: config.oauthRedirectUri,
    grant_type: "authorization_code",
  });
}

export async function refreshAccessToken() {
  requireConfig("oauthClientId", "oauthClientSecret", "refreshToken");
  return tokenRequest({
    client_id: config.oauthClientId,
    client_secret: config.oauthClientSecret,
    refresh_token: config.refreshToken,
    grant_type: "refresh_token",
  });
}

export async function getAccessToken() {
  if (config.accessToken) return config.accessToken;
  if (config.refreshToken) {
    const token = await refreshAccessToken();
    return token.access_token;
  }
  const error = new Error("尚未連接 Google OAuth。先執行 npm run auth:url，或在受保護的環境設定 GOOGLE_REFRESH_TOKEN。");
  error.code = "AUTH_REQUIRED";
  throw error;
}
