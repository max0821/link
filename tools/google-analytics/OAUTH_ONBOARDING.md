# Codex Desktop OAuth onboarding

GA4 健康報告的第一步不是建立 Tag，而是讓使用者安全地授權 Google API。這個流程預設給 Codex Desktop 使用，Chrome 只負責 Google 登入與同意畫面。

## 使用者與 Codex Desktop 的分工

在任何 OAuth、Google 帳號檢查或瀏覽器操作前，Skill 必須先只問一個問題：

> 是否同意我現在啟動 GA4/GTM 唯讀 API 授權流程？

只有明確回答同意後，才可以執行 `auth:connect --confirm-read` 或 `health:connect --confirm-read`。未同意時，不開啟 Chrome、不產生 OAuth URL，也不要求 Client Secret、refresh token 或其他憑證。

| 階段 | Codex Desktop | 使用者 |
| --- | --- | --- |
| 1. Preflight | 掃描 repo、網站與現有 tracking，不要求 Google 權限 | 確認網站與 workspace |
| 2. Scope explanation | 顯示本次只需要 `analytics.readonly`、`tagmanager.readonly` | 確認授權範圍 |
| 3. OAuth | 啟動 `127.0.0.1` loopback callback，開啟 Chrome OAuth URL | 自己登入 Google、完成 2FA、按允許 |
| 4. Callback | 只接收成功/失敗與 token 到本機記憶體；CLI 只保存 refresh token 到被忽略的 `.env` | 不把 token 貼進聊天 |
| 5. Health report | 呼叫 API、分析 evidence、產生 PASS/WARN/FAIL | 查看報告與建議 |
| 6. Repair | 顯示 diff，另行要求 edit scope | 明確核准修復或發布 |

Codex Desktop 可以協調 local shell 與瀏覽器工作，但不應讀取使用者的 Google 密碼、OTP 或把 refresh token 傳給模型。官方 OpenAI 文件將 Skills 定義為可保存、重複使用的工作流程，並將 Computer Use 與 local shell 列為可用的工具類型：[Build skills](https://learn.chatgpt.com/docs/build-skills)。

## 第一次連接前的必要準備

使用者需要先準備：

1. Google Cloud Project。
2. 啟用 Google Analytics Admin API、Google Analytics Data API、Google Tag Manager API。
3. 建立 OAuth Client ID/Secret，redirect URI 使用：

   `http://127.0.0.1:8787/oauth2callback`

4. 確認授權的 Google 帳號對目標 GA4 Property 與 GTM Container 有權限。

OAuth Client ID/Secret 應放在 `tools/google-analytics/.env` 或外部 secret manager，不要貼到 Codex 對話，也不要提交 repo。

## Codex Desktop read-only flow

```powershell
cd tools/google-analytics
npm run auth:status
npm run health:local
npm run health:connect -- --confirm-read
```

執行 `health:connect` 後，Codex Desktop 會看到安全的 OAuth URL；它可以在 Chrome 開啟該 URL。使用者完成登入與授權後，loopback callback 會自動交換 authorization code，並在同一個程序內執行完整 health report。

這個流程不會把 refresh token 印出或提交 repo；本機健康報告流程會把 refresh token 寫入被 `.gitignore` 排除的 `tools/google-analytics/.env`，供後續本機報告使用。若要支援多人或正式部署，應改放 OS credential store 或 server-side secret manager。

## 寫入與發布是第二階段

健康報告只需要唯讀 scope。只有當報告指出需要修復，而且使用者明確核准時，才使用 incremental consent：

```text
read-only health report
→ show evidence and diff
→ user approval
→ request analytics.edit / GTM edit scopes
→ create draft
→ validate
→ user approval again
→ create version / publish
```

`--write` 不應在第一次健康檢查時使用。
