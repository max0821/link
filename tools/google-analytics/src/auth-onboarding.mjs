import http from "node:http";
import crypto from "node:crypto";
import { config, requireConfig } from "./config.mjs";
import { buildAuthorizationUrl, exchangeAuthorizationCode } from "./auth.mjs";

function html(title, message) {
  return `<!doctype html><meta charset="utf-8"><title>${title}</title><p>${message}</p>`;
}

function closeServer(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

/**
 * Start a loopback OAuth flow for Codex Desktop.
 * The returned token is kept in memory by this module; callers may persist only
 * the refresh token in the local ignored .env file without printing it.
 */
export async function authenticateInBrowser({ write = false, timeoutMs = 300000, onUrl } = {}) {
  requireConfig("oauthClientId", "oauthClientSecret");
  const redirect = new URL(config.oauthRedirectUri);
  const expectedState = crypto.randomUUID();
  const authorizationUrl = buildAuthorizationUrl({ write, state: expectedState });

  let finish;
  const result = new Promise((resolve, reject) => {
    finish = (error, value) => error ? reject(error) : resolve(value);
  });

  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url || "/", config.oauthRedirectUri);
    if (requestUrl.pathname !== redirect.pathname) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const returnedState = requestUrl.searchParams.get("state");
    if (returnedState !== expectedState) {
      response.writeHead(400, { "content-type": "text/html; charset=utf-8" });
      response.end(html("Authorization failed", "OAuth state 驗證失敗，請回 Codex Desktop 重新開始。"));
      await closeServer(server);
      finish(new Error("Google OAuth state 驗證失敗。"));
      return;
    }

    const oauthError = requestUrl.searchParams.get("error");
    if (oauthError) {
      response.writeHead(400, { "content-type": "text/html; charset=utf-8" });
      response.end(html("Authorization cancelled", "Google 授權未完成，可以關閉這個頁面。"));
      await closeServer(server);
      finish(new Error(`Google OAuth 未完成：${oauthError}`));
      return;
    }

    try {
      const token = await exchangeAuthorizationCode(requestUrl.searchParams.get("code"));
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(html("Authorization complete", "Google API 授權完成，可以回到 Codex Desktop。"));
      await closeServer(server);
      finish(null, token);
    } catch (error) {
      response.writeHead(500, { "content-type": "text/html; charset=utf-8" });
      response.end(html("Authorization failed", "Google API 授權交換失敗，可以回到 Codex Desktop 查看錯誤。"));
      await closeServer(server);
      finish(error);
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(Number(redirect.port || 80), redirect.hostname, () => resolve());
  });

  const timeout = setTimeout(async () => {
    await closeServer(server);
    finish(new Error("OAuth 等候逾時，請重新執行授權流程。"));
  }, timeoutMs);
  timeout.unref?.();

  onUrl?.({ authorizationUrl, write, redirectUri: config.oauthRedirectUri });
  try {
    return await result;
  } finally {
    clearTimeout(timeout);
  }
}
