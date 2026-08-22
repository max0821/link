# GA4 / GTM × Codex Desktop 工作流程

這份文件定義 `link.9sweb.com` 在 Codex Desktop 中使用 GA4、GTM、Chrome 與 Google API 的標準流程。

核心原則是：

- Codex Desktop 開啟 Chrome，最適合處理 Google 登入、OAuth 同意、GTM Preview、GA4 DebugView 與視覺確認。
- Google API 最適合做可重複的 audit、健康檢查、營運指標、CTA 成效與歷史報表。
- HTML 報表是 API 產生的靜態快照，不把 OAuth 權杖交給瀏覽器。
- 公開 Link Page 與私人 Analytics 報表分開，不把 GA/GTM 帳號資料放到公開網站。

## 目前專案資料

- Repository root：clone 後的專案根目錄
- Google 工具目錄：`tools/google-analytics`
- 網站：`https://link.9sweb.com/`
- GTM：`GTM-W9BNQSDC`
- GA4 Measurement ID：`G-4N0V6SDWH1`
- 網站事件：`link_click`

## 整體流程

```text
Codex Desktop
    │
    ├─ 本機掃描 repo / DOM / CTA / GTM 安裝片段
    │
    ├─ 開啟 Chrome
    │    ├─ Google OAuth 登入與同意
    │    ├─ GTM Preview / Tag Assistant
    │    ├─ GA4 DebugView / Realtime
    │    └─ 開啟渲染後的 HTML 報表
    │
    ├─ Google API
    │    ├─ GA Admin：Property、Stream、自訂維度、Key Event
    │    ├─ GA Data：流量、CTA 點擊、每日趨勢、Realtime
    │    └─ GTM API：Container、Workspace、Tag、Trigger、Variable、發布狀態
    │
    └─ 產生私有 Analytics Health Report
         ├─ latest.html：用戶閱讀版
         ├─ latest.md：訊息／工單版
         ├─ latest.json：AI／自動化 evidence
         └─ history.json：歷次摘要與分數
```

## 第一次接入：Codex Desktop + Chrome OAuth

### 1. 先做本機檢查

```powershell
cd tools/google-analytics
npm run health:local
```

這一步不需要 Google 權杖，先確認：

- `index.html` 只有一組標準 GTM 安裝片段；
- GTM ID 是 `GTM-W9BNQSDC`；
- CTA 有完整 `data-track-*` 標記；
- `app.js` 會推送 `link_click` 與 CTA 參數；
- site-specific profile 與目前 repo 相符。

### 2. 從 Codex Desktop 開 Chrome 授權

若本機尚未有可用 refresh token：

```powershell
cd tools/google-analytics
npm run report:connect
```

Codex Desktop 應該把 OAuth 頁面開到使用者目前的 Chrome session。使用者只需要在 Chrome 完成：

1. Google 登入；
2. 2FA 或其他 Google 安全檢查；
3. 確認 GA4 / GTM 唯讀權限。

完成 callback 後，程式會把 refresh token 寫入本機被 `.gitignore` 保護的 `.env`。不應把 token、client secret 或 OTP 貼到聊天，也不應提交到 GitHub。

### 3. 確認授權狀態

```powershell
npm run auth:status
```

輸出只應顯示是否已設定 OAuth client、refresh token 與 access token，不顯示任何秘密值。

## 日常健康報告

已有 refresh token 後，直接執行：

```powershell
cd tools/google-analytics
npm run report
```

報表會從 GA4/GTM API 取得資料，並寫入被忽略的 `reports/` 目錄：

| 檔案 | 用途 |
| --- | --- |
| `reports/latest.html` | 給使用者閱讀的完整報表 |
| `reports/latest.md` | 貼到訊息、工單或週報 |
| `reports/latest.json` | 給 AI、排程器或其他程式分析 |
| `reports/health-<timestamp>.*` | 帶時間戳的歷史快照 |
| `reports/history.json` | 最近 90 次摘要、分數與 check 狀態 |

## 報表內容

報表應分成兩層，不要只輸出設定檢查結果。

### A. 營運指標

目前預設報告窗口是最近 7 天，並嘗試比較前 7 天：

- 使用者（`totalUsers`）；
- 工作階段（`sessions`）；
- 頁面瀏覽（`screenPageViews`）；
- 所有事件（`eventCount`）；
- 互動率（`engagementRate`）；
- 每日流量趨勢；
- CTA 點擊總數；
- CTA 點擊人數；
- 依 CTA ID、名稱、類型、區塊的點擊排行與占比。

如果前期沒有資料，顯示 `—`，不能把缺資料誤算成 0，也不能誤判成負成長。

### B. 資料品質與設定健康度

- repo 主要檔案與 GTM 安裝片段；
- GA4 Property、Web Stream、Measurement ID；
- CTA 自訂維度；
- GTM Google tag、Event tag、Custom Event trigger、Data Layer Variables；
- Workspace 是否有未提交變更；
- GA4 Realtime 與最近事件觀測；
- PASS / WARN / FAIL / INFO 與下一步建議。

健康度分數只代表設定與資料品質，不代表網站商業成效。商業成效要看上面的營運指標。

## 在 Chrome 驗證事件

API 報表不能完全取代瀏覽器事件驗證。需要確認實際頁面行為時，在 Codex Desktop 的 Chrome 中：

1. 開啟 GTM Preview / Tag Assistant；
2. 開啟本機或已部署的網站；
3. 點擊一個 CTA；
4. 確認 Data Layer 出現 `link_click`；
5. 確認 GTM 的 GA4 Event tag 被觸發；
6. 在 GA4 DebugView 或 Realtime 確認 `link_click`；
7. 重新執行 `npm run report`，確認 CTA 成效表有資料。

Chrome 的角色是確認「瀏覽器真的執行了事件」。API 的角色是確認「帳號設定正確、資料可持續查詢、報表可重複產生」。

## 正確開啟 HTML 報表

`latest.html` 是 HTML 文件。若用 Codex 的檔案檢視器開啟，可能會看到 HTML 原始碼；這不是報表解析失敗，而是檔案檢視器沒有渲染 HTML。

請從報表目錄啟動本機 HTTP 服務：

```powershell
cd tools/google-analytics/reports
python -m http.server 8766
```

再讓 Codex Desktop 的 Chrome 開啟：

```text
http://127.0.0.1:8766/latest.html
```

這樣 Chrome 才會以網頁方式解析 HTML，顯示卡片、表格與健康檢查區塊。

## GA/GTM 寫入與發布

健康報告本身只需要唯讀權限。只有在報告確認需要修復時，才進入寫入流程：

1. 先輸出 plan，不呼叫寫入 API；
2. 使用者確認實際修改內容；
3. 取得包含 edit / version / publish 的額外 OAuth scope；
4. 建立或更新 GTM Workspace draft；
5. 用 Chrome Preview / DebugView 驗證；
6. 使用者明確同意後才建立版本與發布；
7. 發布後重新產生健康報告。

設定完成不等於正式網站已部署。若 repo 的新版 CTA code 尚未部署到公開網域，Chrome 驗證與 GA4 報表要分別標記為「本機已驗證」與「正式站待部署」。

## 安全與交付邊界

- `.env` 只存在本機受保護環境，不能提交到 GitHub；
- `reports/` 只保存本機快照，不能部署到公開 Link Page；
- HTML 報表是靜態快照，不是即時 Dashboard；要更新必須重新執行 `npm run report`；
- 給客戶看的正式版本應放在登入保護的私人 Dashboard，或透過受保護的 email／訊息管道傳送；
- 不要在前端 JavaScript、公開 GitHub、公開 HTML 或聊天內容放 OAuth token、client secret、API secret。

## 後續產品化方向

目前流程是 Codex Desktop + Chrome + 本機 API report。正式產品化時，應增加：

- 後端定時執行 `report`；
- 受保護的資料庫或物件儲存保存歷史 JSON；
- 私人登入 Dashboard；
- 期間、網站、CTA 類型與客戶篩選；
- 分數變化、CTA 趨勢、異常通知；
- 只在新出現 FAIL/WARN 或指標明顯異常時通知用戶。
