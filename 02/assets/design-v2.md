# 9sweb V2 — Editorial Paper Index

## Scope contract

- 公開頁面工作：作為 9sweb 的專案入口，讓訪客快速理解作者正在做的 AI 實作心得、公開評測與手機網頁遊戲。
- 主要受眾動作：先閱讀 AI 心得索引，再點進 05 公開評測、GA4/GTM Skill、Threads、Web Design Skill 或遊戲專案。
- 內容模型：首頁保留 01 AI 心得、02 擲筊爐主、03 MaxAbounce；AI 心得固定主視覺不隨文章切換，文章以編輯型清單呈現。
- 公開範圍：只呈現公開文章、遊戲與社群連結；GA4 OAuth、報表資料與內部工具不進入公開 UI。
- 技術／部署：保留純 HTML、CSS、JavaScript，GitHub Pages 只發布 `02/`。

## Approved visual target

- Target ID：`v2-editorial-paper-20260826`
- 來源：使用者明確指定「簡約、有設計感、米白色系」；以現有內容與品牌資產為語意約束。
- 視覺主張：像一張可以閱讀的獨立雜誌目錄，把小型網頁實驗整理成清楚、有節奏的公開索引。
- 情緒：安靜、溫暖、精準、帶一點工作室感；拒絕 HUD、霓虹、遊戲儀表板與大量裝飾。
- 構圖：桌面採不對稱編輯欄，左側是品牌／主標，右側是索引說明；AI 心得是第一個大段落，文章使用垂直清單而非等寬卡片；遊戲以兩列專案索引收尾。
- 移動策略：手機重新編排為單一閱讀軸，保留「品牌 → 主標 → AI 心得 → 文章 → 遊戲」順序，縮小裝飾但不把內容變成密集卡片牆。

## Typography feasibility lock

- Display：`Noto Serif TC` 500/600/700，Google Fonts，SIL Open Font License；繁中標題與英文品牌共用，保留書刊式筆畫與穩定的中文覆蓋。
- Body：`Noto Sans TC` 400/500/600，Google Fonts，SIL Open Font License；用於描述、連結與可讀性文字。
- Label／數字：`IBM Plex Mono` 400/500，Google Fonts，SIL Open Font License；用於日期、編號、眉標與小型導覽。
- Loading：`https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Noto+Sans+TC:wght@400;500;600&family=Noto+Serif+TC:wght@500;600;700&display=swap`，並保留系統 fallback。
- Exact strings to QA：`9sweb Projects`、`AI心得`、`ChatGPT Sites 效能實測報告`、`2026.08.25`、`A–Z a–z 0–9 /`。

## Token Map

```text
--canvas: #f1ede3        warm paper canvas
--surface: #fbf9f3       quiet content surface
--ink: #20241d           primary text
--muted: #77786d         secondary text
--rule: #d7d2c5         borders and dividers
--accent: #b6d33e       one restrained brand accent
--accent-dark: #6f861c  accent hover / marker
--serif: Noto Serif TC   display and editorial titles
--sans: Noto Sans TC     body and interface text
--mono: IBM Plex Mono    labels and dates
--radius-small: 2px      controls and thumbnail corners
--radius-large: 18px    only for the featured image frame
--shadow-soft: 0 18px 48px rgba(49, 48, 38, .08)
--content-max: 1180px
--gutter: clamp(20px, 5vw, 72px)
```

## Block Map

| Block | Role | Desktop | Mobile |
|---|---|---|---|
| Header | brand, short nav, social links | one horizontal editorial bar | two-line header with nav under brand |
| Intro | explain what this index contains | unequal two-column title / note | title then note in one column |
| AI Notes | primary content journey | left label + right fixed cover/list composition | fixed cover first, then readable article rows |
| Games | secondary project discovery | two editorial rows with image crop and arrow | stacked rows with compact image strip |
| Footer | attribution and utility links | thin rule and aligned metadata | wrapped two-line footer |

## Layer Map

| ID | Layer | Medium | Role |
|---|---|---|---|
| BG-01 | paper canvas | CSS | full-page warm off-white base |
| BG-02 | fine paper grain | CSS SVG data texture | barely visible surface character |
| BRAND-01 | 9sweb logo | existing SVG | stable identity mark |
| ACCENT-01 | lime marker / dot / underline | CSS | sole active accent |
| COVER-01 | fixed AI NOTES cover | existing SVG | supporting image, never driven by article order |
| IMAGE-01..03 | project thumbnails | existing PNG | restrained proof image inside project rows |
| UI-01 | dividers and hairlines | CSS | editorial rhythm, no card shells |

## Text Map

- `header .brand-wordmark` — live text `9sweb.` / brand, serif display.
- `.intro h1` — live text `A small index of things I’m building.` / primary page statement.
- `.intro .lede` — live Traditional Chinese explanation / body.
- `.section-heading` — live section labels and titles.
- `.insight-row` — live date, category, title, description and arrow; each row is a semantic link.
- `.project-row` — live project number, title, description, CTA and image alt text.
- `.social-link` — live accessible label; decorative mark is CSS text only.

## Geometry Map

- Canvas: full viewport, max content width 1180px, desktop side gutter 72px.
- Header: 88px minimum; shared left alignment with all page content.
- Intro: top padding 104px desktop / 64px mobile; title width 55%, note width 30% desktop.
- AI section: top rule at 100%; two-column label rail 24% and content 76%; cover sits above article list on the right.
- Insight rows: one horizontal rule per row, 92px minimum height desktop / auto-height mobile; thumbnail 76px desktop / 64px mobile.
- Games: section top margin 150px desktop / 96px mobile; each row uses number 10%, copy 52%, image 28%, arrow 10% desktop.
- Footer: 80px top margin, one rule, 32px bottom padding.

## Assembly Contract

- `BRAND-01` appears once in the header; the logo is not repeated in content.
- `ACCENT-01` has three deterministic uses only: active nav marker, section index marker, link hover line.
- `COVER-01` is one fixed AI section image. It does not change with the first, second, or any later article.
- `UI-01` uses one-pixel `--rule` lines, continuous across each article row; no nested card borders.
- `IMAGE-01..03` remain role-specific project evidence, with same crop treatment and derived mobile height.
- All arrows are live text `↗`, aligned to the row's end anchor and never used as floating decoration.
- Mobile preserves the same anchors as a single vertical reading axis; image and text never collide or overflow.

## Asset Resolution / lock

- Existing SVG/PNG assets are reused and treated as locked source inputs.
- All new visual language is CSS / live HTML; no new generated raster asset is required.
- Omit the former orbs, grid horizon, scanline, glow and tilt effects because they contradict the V2 art direction.
