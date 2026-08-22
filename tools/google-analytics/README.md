# link.9sweb.com Analytics Health / GA4 / GTM API-first 工具

這個目錄的核心是「持續產生健康報告」，不是一次性的 GA 安裝器。設定與修復只是報告發現問題後的選擇性 action。整體兩層設計請看 [SKILL_ARCHITECTURE.md](./SKILL_ARCHITECTURE.md)：穩定的 Analytics API Core，加上會隨網站需求與 DOM 改變而持續重寫的 Site-specific Analysis Skill。

Codex Desktop 的 Google 授權流程請看 [OAUTH_ONBOARDING.md](./OAUTH_ONBOARDING.md)。預設先做本機掃描，再用 loopback OAuth 取得唯讀 API 權限；使用者自己完成 Google 登入與同意，Skill 不接觸密碼、OTP 或 token。

若要了解完整的 Codex Desktop + Chrome + Google API + 報表操作流程，請看 [CODEX_DESKTOP_WORKFLOW.md](./CODEX_DESKTOP_WORKFLOW.md)。

工具先產生 evidence 與 `PASS/WARN/FAIL/INFO`，再由上層 Skill 判斷是否需要建立修復 plan。它不依賴 Google SDK，使用 Node 內建 `fetch`，方便在本機或後端服務上執行。

## 目前已接上的事件契約

網站在所有帶有 `data-track-id` 的 CTA 上使用事件委派，推送一個通用 dataLayer event：

```js
{
  event: "link_click",
  link_id,
  link_name,
  link_url,
  link_type,
  link_position,
  section_name
}
```

目前 CTA：

| link_id | link_type | section_name |
| --- | --- | --- |
| `ai-web-design-skill` | `article` | `ai-notes` |
| `ai-social-linktree` | `social` | `ai-notes` |
| `project-lootsu` | `project` | `lootsu` |
| `project-maxabounce` | `project` | `maxabounce` |

GTM 只需要一個 Custom Event trigger `link_click`、六個 Data Layer Variables，以及一個 GA4 Event tag `link_click`。`link_url` 會送出以便 DebugView 檢查，但預設不建立成 GA4 custom dimension，以免 URL 造成不必要的高基數報表欄位。

## 安全 OAuth 架構

1. `npm run auth:url` 預設只要求 GA/GTM read-only scope。
2. 完成 Google OAuth 後，refresh token 必須交給受保護的環境變數或 secret manager；程式不會把 token 寫入 repo，也不會在輸出中顯示 token。
3. `--write` 只在準備修改 GA/GTM 時使用，會增加 edit / version / publish scopes。
4. `npm run apply:gtm -- --confirm` 才會建立 GTM draft objects；它仍然不會 publish。發布必須另做人工批准與 API 呼叫。

## 指令

```powershell
cd tools/google-analytics
Copy-Item .env.example .env

# 產生唯讀 OAuth URL
npm run auth:url

# 查看目前 OAuth 設定狀態，不會顯示任何 token
npm run auth:status

# Codex Desktop：使用者明確同意後，互動式唯讀 OAuth
npm run health:connect -- --confirm-read

# 不需 OAuth：掃描本機網站與目前 site profile
npm run health:local

# 需要唯讀 OAuth：產生完整健康報告
npm run health

# 需要唯讀 OAuth：產生用戶閱讀版與 AI evidence 檔案
npm run report

# 取得 plan，不呼叫 Google 寫入 API
npm run plan:gtm

# OAuth 後只做 GA Admin + GTM workspace audit
npm run audit

# GA4 Debug Measurement Protocol validation，需要受保護的 api_secret
npm run validate

# GA4 Realtime link_click report，需要 GA_PROPERTY_ID，且 custom dimensions 已存在
npm run realtime

# 只有明確核准才建立 draft objects；不會發布
npm run apply:gtm -- --confirm
```

## 套用前檢查

- 先以唯讀 scope 執行 `audit`，確認 account、property、stream、GTM container 與 workspace。
- 確認 GTM workspace 沒有未預期的變更與衝突。
- 先在 GTM Preview / GA4 DebugView 驗證 `link_click` 和六個參數，再決定是否發布。
- GA4 custom dimension 建立可用 Admin API 的 `ensureCtaCustomDimensions`，但目前 CLI 未自動執行，以避免在 property 尚未核對時誤寫入。
- 本工具沒有任何自動發布路徑；正式發布要由使用者在確認差異後另行批准。
- `health` 會合併本機 site scan、GA Admin、GA Data Realtime/最近事件與 GTM workspace evidence。
- `report` 會在 `tools/google-analytics/reports/` 產生 `latest.html`、`latest.md`、`latest.json` 與帶時間戳的歷史檔案；HTML 適合開啟給用戶看，Markdown 適合貼到訊息或工單，JSON 適合後續 AI 分析。
- 閱讀版報表分成兩層：先顯示使用者、工作階段、頁面瀏覽、互動率、前期比較、CTA 點擊排行與每日趨勢，再顯示 GA/GTM 健康檢查與 Realtime/歷史事件證據。
- `reports/` 僅供本機或受保護的報表服務使用，不應部署到公開 Link Page 或公開 GitHub Pages。
- 觀測不到 Realtime 事件只會先標記 `WARN`，會和發布狀態及歷史事件一起判讀，不會直接當成 GA 故障。
