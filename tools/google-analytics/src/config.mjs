import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadDotEnv() {
  const envPath = path.join(toolRoot, ".env");
  if (!fs.existsSync(envPath)) return;

  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnv();

export const config = Object.freeze({
  toolRoot,
  oauthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
  oauthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
  oauthRedirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || "http://127.0.0.1:8787/oauth2callback",
  refreshToken: process.env.GOOGLE_REFRESH_TOKEN || "",
  accessToken: process.env.GOOGLE_ACCESS_TOKEN || "",
  gaPropertyId: process.env.GA_PROPERTY_ID || "",
  gaMeasurementId: process.env.GA_MEASUREMENT_ID || "",
  gtmAccountId: process.env.GTM_ACCOUNT_ID || "",
  gtmContainerId: process.env.GTM_CONTAINER_ID || "",
  gtmWorkspaceId: process.env.GTM_WORKSPACE_ID || "",
  gtmContainerPublicId: process.env.GTM_CONTAINER_PUBLIC_ID || "",
});

export function persistRefreshToken(refreshToken) {
  if (!refreshToken) throw new Error("缺少 refresh token，無法保存 OAuth 連線。");
  const envPath = path.join(toolRoot, ".env");
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const lines = existing.split(/\r?\n/).filter((line) => !/^GOOGLE_REFRESH_TOKEN\s*=/.test(line.trim()));
  while (lines.length && !lines.at(-1)) lines.pop();
  lines.push(`GOOGLE_REFRESH_TOKEN=${refreshToken}`);
  fs.writeFileSync(envPath, `${lines.join("\n")}\n`, "utf8");
}

export const scopes = Object.freeze({
  read: [
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/tagmanager.readonly",
  ],
  write: [
    "https://www.googleapis.com/auth/analytics.edit",
    "https://www.googleapis.com/auth/tagmanager.edit.containers",
    "https://www.googleapis.com/auth/tagmanager.edit.containerversions",
    "https://www.googleapis.com/auth/tagmanager.publish",
  ],
});

export function requireConfig(...keys) {
  const missing = keys.filter((key) => !config[key]);
  if (missing.length) {
    throw new Error(`缺少設定：${missing.join(", ")}。請填入 tools/google-analytics/.env；不要把 token 寫入原始碼。`);
  }
}

export function requirePropertyId() {
  requireConfig("gaPropertyId");
  return config.gaPropertyId.replace(/^properties\//, "");
}
