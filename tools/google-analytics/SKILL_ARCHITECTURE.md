# Analytics Health Skill 架構

本專案的核心不是「把 GA4 裝上去」，而是持續產生可信的 Link Page Analytics Health Report。設定與修復只是健康報告發現問題後的選擇性 action。

## 兩種 Skill

### 1. Analytics API Core Skill

這一層是相對穩定的基礎能力，不應混入特定網站假設：

- Google OAuth、refresh token、scope 與安全儲存
- GA Admin API：Property、Stream、Custom Dimension、Key Event
- GA Data API：歷史報表、Realtime、事件觀測
- GTM API：Account、Container、Workspace、Tag、Trigger、Variable、Version
- Measurement Protocol debug validation
- normalized evidence、status、quota、API error 與 retry
- read-only audit 優先，任何 write/publish 都需要 approval gate

Core Skill 的輸出不是「已安裝」，而是可被比較的 evidence：

```json
{
  "checkId": "ga.web_stream",
  "status": "PASS|WARN|FAIL|INFO",
  "expected": {},
  "observed": {},
  "checkedAt": "...",
  "source": "analytics_admin_api"
}
```

### 2. Site-specific Analysis Skill

這一層會隨網站變化，必須版本化、可重寫，不能硬編碼在 API client 裡：

- 分析網站 DOM、JavaScript、SPA/一般導覽、部署方式
- 找出 CTA、Link taxonomy、data attributes、事件命名
- 定義網站自己的 expected tracking contract
- 決定哪些參數需要註冊成 Custom Dimension
- 判斷 duplicate event、遺漏 CTA、錯誤 URL、區段與位置
- 產生 site profile 與健康檢查規則

目前 `src/site-profile.mjs` 是 `link.9sweb.com` 的第一版 profile。網站 DOM 或需求改變時，應增加 profile version，而不是修改 API Core 的通用邏輯。

## 持續重寫循環

```text
掃描網站與 Google evidence
→ 比較 site profile 與實際狀態
→ 產生 Health Report
→ 分析失敗/警告的根因
→ 更新 site-specific profile 或 tracking plan
→ 必要時提出 GTM/網站修復 plan
→ 使用者核准後才寫入
→ 再次驗證並保存報告
```

## 健康狀態語意

- `PASS`：設定符合預期，或已觀察到資料
- `WARN`：設定尚可，但近期沒有流量、尚未發布、或 API 暫時無法觀測
- `FAIL`：設定缺失、ID 不一致、重複、或事件契約明確破壞
- `INFO`：背景資訊，不應阻斷健康判定

「Realtime 沒資料」不能直接等於 GA 壞掉；必須和發布狀態、最近流量、DebugView 與歷史事件一起判讀。

## 本機指令

```powershell
cd tools/google-analytics

# 不需 OAuth：掃描 repo 與 site-specific tracking contract
npm run health:local

# 需要唯讀 OAuth：合併本機、GA Admin、GA Data、GTM evidence
npm run health
```
