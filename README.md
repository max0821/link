# 9sweb Projects

手機優先的 9sweb 專案與 AI 實作心得入口：<https://link.9sweb.com/>

目前以「AI 心得」作為進站預設內容，並收錄兩個免費手機網頁遊戲。前端只使用 HTML、CSS、JavaScript 與本地圖片資產，不需要前端框架或執行期套件。

## 目前內容

### 01 · AI 心得

- [Web Design Skill](https://github.com/max0821/web-design-skill) — 說明及安裝方式，發布於 2026-08-22。
- [免費客製自己的 Social Linktree](https://www.threads.com/share/FalBiuCAX/) — 使用 ChatGPT 連動 GitHub，建立免費、免主機且具自主權的 Social Link 引導頁，發布於 2026-08-22。
- [用 AI 做 GA4 / GTM 成長報告](https://github.com/max0821/link/tree/main/tools/google-analytics) — 把唯讀 GA4/GTM 健康檢查、CTA 成效與每日快照整理成可驗證的成長任務，發布於 2026-08-23。

心得清單位於固定高度的專案卡片內；內容增加後會獨立上下捲動，不會持續拉長整頁。

### 02 · 擲筊 × 爐主

- 網址：<https://lootsu.9sweb.com/>
- 擲出聖筊、累積香火，替縣市與神明衝上全台排行。
- 免下載、全台排行、手機直玩。

### 03 · MaxAbounce

- 網址：<https://maxabounce.9sweb.com/>
- 擊碎磚陣、測繪星球、解鎖曲速，把未知星域變成你的疆界。
- 免下載、星圖征服、手機直玩。

## 介面與技術

- Mobile-first，桌面版維持 430px 手機畫布置中顯示。
- 三個內容狀態支援點擊、鍵盤方向鍵與手機左右滑動切換。
- 專案圖片先載入並完成解碼後才切換，避免標題與圖片短暫不一致。
- 專案卡片一般最高 496px；AI 心得最高 520px，文章清單可獨立捲動。
- `MAX PROJECT INDEX` 使用 `clamp(rem, vw, rem)` 流動字級與依序字母跳動，並支援 `prefers-reduced-motion`。
- 靜態資源使用 query version 避免 GitHub Pages／Cloudflare／瀏覽器混用舊版快取。

## 流量分析

- Google Tag Manager 容器：由網站的 site profile 與部署設定提供；公共文件不固定記錄實例 ID。
- GTM `<script>` 位於 `<head>` 開頭，`<noscript>` iframe 位於 `<body>` 開頭。
- GA4 的 Google Tag、評估 ID 與後續事件規則將統一由 GTM 管理。
- CTA 使用通用 `link_click` dataLayer event；追蹤欄位為 `link_id`、`link_name`、`link_url`、`link_type`、`link_position`、`section_name`。
- 具體 CTA 以 `data-track-*` 屬性標記，GTM 只需要一個 Custom Event trigger 與一個 GA4 Event tag。
- 目前核心目標是持續產生 Analytics Health Report；GA/GTM 設定只是健康檢查發現問題後的選擇性修復。
- 工具分成穩定的 Analytics API Core，以及會隨網站 DOM、CTA 與部署方式變化而版本化重寫的 Site-specific Analysis Skill。
- API-first 工具、健康報告與兩層 Skill 架構位於 [`tools/google-analytics/`](tools/google-analytics/)，預設唯讀，GTM 建立與發布不會自動執行。
- 本機網站檢查：`npm run health:local`；合併 Google evidence 的完整報告：`npm run health`。
- 可載入 Codex Desktop 的 Skill source 位於 [`skills/setup-link-page-analytics/`](skills/setup-link-page-analytics/)，包含 OAuth onboarding、health report contract 與 site-specific profile 演進規則。

## SEO 與 AI 索引

- `index.html`：Canonical、hreflang、robots、Open Graph、Twitter metadata 與 JSON-LD，並同步列出 GA4/GTM 成長分析心得。
- `robots.txt`：允許一般搜尋引擎，以及 OAI-SearchBot、GPTBot、ChatGPT-User、Claude-SearchBot、Claude-User、ClaudeBot。
- `sitemap.xml`：Canonical 首頁與主要分享圖片。
- `llms.txt`：提供 LLM／Agent 使用的精簡內容索引。
- `index.md`：與首頁內容對應的乾淨 Markdown 版本。
- 無 JavaScript 環境仍提供完整專案連結。

## 主要檔案

| 路徑 | 用途 |
| --- | --- |
| `index.html` | 初始內容、SEO metadata、JSON-LD 與無 JS fallback |
| `app.js` | 專案資料、切換行為、圖片同步與心得卡片生成 |
| `styles.css` | 手機版面、動態、固定高度與捲動行為 |
| `assets/` | Logo、OG 圖、專案圖與心得截圖 |
| `robots.txt` | 搜尋引擎與 AI crawler 規則 |
| `sitemap.xml` | 搜尋引擎 Sitemap |
| `llms.txt` | LLM 內容入口 |
| `index.md` | LLM-friendly 完整文字內容 |

## 內容更新規則

新增或修改心得時，同步處理：

1. 更新 `app.js` 的 `projects`／`insights`、`date` 與 `dateISO`。
2. 更新 `index.html` 的初始 AI 心得內容、metadata 與 JSON-LD。
3. 圖片下載至 `assets/`，避免依賴外站圖片造成破圖。
4. 更新 `index.md`、`llms.txt` 與本 README。
5. 更新 `sitemap.xml` 的 `lastmod`。
6. 調整 `app.js`、`styles.css` 後，提高 `index.html` 內的 query version。

## 部署

- Repository：<https://github.com/max0821/link>
- Production：<https://link.9sweb.com/>
- GitHub Pages 從 `main` 發布；Cloudflare DNS／CNAME 與快取規則由外部設定管理。
