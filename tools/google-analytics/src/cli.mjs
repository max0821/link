import { config, requireConfig, requirePropertyId } from "./config.mjs";
import { buildAuthorizationUrl, getAccessToken } from "./auth.mjs";
import { redactForOutput } from "./google-api.mjs";
import { auditAnalytics, ensureCtaCustomDimensions } from "./ga-admin.mjs";
import { getDataMetadata, runRealtimeLinkClickReport } from "./ga-data.mjs";
import { validateMeasurementProtocolEvent } from "./measurement-protocol.mjs";
import { applyCtaGtmChangeSet, auditGtm, buildCtaGtmChangeSet, publishGtmWorkspace } from "./gtm.mjs";
import { buildHealthReport } from "./health-report.mjs";
import { writeHealthReportArtifacts } from "./report-renderer.mjs";
import { scanLocalSite } from "./site-scan.mjs";
import { authenticateInBrowser } from "./auth-onboarding.mjs";
import { persistRefreshToken } from "./config.mjs";

function print(value) {
  console.log(JSON.stringify(redactForOutput(value), null, 2));
}

async function main() {
  const command = process.argv[2] || "help";
  if (command === "auth:url") {
    const write = process.argv.includes("--write");
    console.log(buildAuthorizationUrl({ write }));
    console.log(write ? "\n此 URL 會要求 GA/GTM 寫入及發布權限；只有在準備套用設定時才使用 --write。" : "\n這是唯讀 audit scope。OAuth 完成後請把 refresh token 放在受保護的執行環境，不要回傳給我或提交到 repo。");
    return;
  }

  if (command === "auth:status") {
    console.log(JSON.stringify({
      oauthClientConfigured: Boolean(config.oauthClientId && config.oauthClientSecret),
      refreshTokenConfigured: Boolean(config.refreshToken),
      accessTokenConfigured: Boolean(config.accessToken),
      mode: "Codex Desktop loopback OAuth; token never printed",
    }, null, 2));
    return;
  }

  if (command === "plan:gtm") {
    print(buildCtaGtmChangeSet());
    return;
  }

  if (command === "health:local") {
    print(scanLocalSite());
    return;
  }

  if (command === "help") {
    console.log("用法：npm run auth:status | npm run auth:connect | npm run health:connect | npm run auth:url | npm run health:local | npm run health | npm run report | npm run report:connect | npm run audit | npm run validate | npm run realtime | npm run plan:gtm | npm run apply:gtm -- --confirm");
    return;
  }

  if (command === "auth:connect" || command === "health:connect" || command === "report:connect") {
    if (!process.argv.includes("--confirm-read")) {
      throw new Error("需要先取得使用者明確同意唯讀 Google API 授權；同意後再加上 --confirm-read。未取得同意時不會開啟 OAuth。");
    }
    const oauth = await authenticateInBrowser({
      write: process.argv.includes("--write"),
      onUrl: ({ authorizationUrl, write }) => {
        console.log(write ? "這次授權包含寫入/發布權限，請確認你已核准修復動作。" : "這次授權只要求 GA/GTM 唯讀權限。\n");
        console.log(`請在 Codex Desktop 的 Chrome 開啟 OAuth URL：\n${authorizationUrl}\n`);
        console.log("請由使用者自己完成 Google 登入、2FA 與同意；不要把 token 貼回聊天。\n");
      },
    });
    if (oauth.refresh_token) persistRefreshToken(oauth.refresh_token);
    if (command === "auth:connect") {
      console.log(JSON.stringify({ authorized: true, scope: oauth.scope || "", hasRefreshToken: Boolean(oauth.refresh_token), tokenStored: Boolean(oauth.refresh_token) }, null, 2));
      return;
    }
    if (command === "report:connect") {
      const report = await buildHealthReport(oauth.access_token);
      print(writeHealthReportArtifacts(report));
      return;
    }
    print(await buildHealthReport(oauth.access_token));
    return;
  }

  const token = await getAccessToken();
  if (command === "audit") {
    const [ga, gtm] = await Promise.all([auditAnalytics(token), auditGtm(token)]);
    print({ target: config, ga, gtm });
    return;
  }

  if (command === "health") {
    print(await buildHealthReport(token));
    return;
  }

  if (command === "report") {
    const report = await buildHealthReport(token);
    print(writeHealthReportArtifacts(report));
    return;
  }

  if (command === "validate") {
    if (!process.env.GA_MEASUREMENT_PROTOCOL_API_SECRET) {
      print({ status: "SKIP", message: "未設定 GA_MEASUREMENT_PROTOCOL_API_SECRET；略過 Measurement Protocol debug validation。" });
      return;
    }
    print(await validateMeasurementProtocolEvent({ debug: true }));
    return;
  }

  if (command === "realtime") {
    requirePropertyId();
    const [report, metadata] = await Promise.all([
      runRealtimeLinkClickReport(token),
      getDataMetadata(token),
    ]);
    print({ report, metadata });
    return;
  }

  if (command === "apply:gtm") {
    requireConfig("gtmAccountId", "gtmContainerId", "gtmWorkspaceId");
    print(await applyCtaGtmChangeSet(token, { confirm: process.argv.includes("--confirm") }));
    return;
  }

  if (command === "publish:gtm") {
    requireConfig("gtmAccountId", "gtmContainerId", "gtmWorkspaceId");
    print(await publishGtmWorkspace(token, { confirm: process.argv.includes("--confirm") }));
    return;
  }

  throw new Error(`未知指令：${command}`);
}

main().catch((error) => {
  if (error.code === "AUTH_REQUIRED") {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }
  console.error(error.message);
  process.exitCode = 1;
});
