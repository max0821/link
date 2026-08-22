import fs from "node:fs";
import path from "node:path";
import { config } from "./config.mjs";
import { redactForOutput } from "./google-api.mjs";

const STATUS_LABELS = Object.freeze({
  PASS: "正常",
  WARN: "注意",
  FAIL: "失敗",
  INFO: "資訊",
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeMarkdown(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll(/\r?\n/g, " ");
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status || "未知";
}

function formatDate(value) {
  if (!value) return "未提供";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Taipei",
  }).format(date);
}

function jsonForDisplay(value) {
  return JSON.stringify(redactForOutput(value), null, 2);
}

function timestampSlug(value) {
  return new Date(value || Date.now()).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function observationRows(result) {
  if (!result || result.error || !Array.isArray(result.rows)) return [];
  const dimensionHeaders = (result.dimensionHeaders || []).map((item) => item.name || "dimension");
  const metricHeaders = (result.metricHeaders || []).map((item) => item.name || "metric");
  const headers = [...dimensionHeaders, ...metricHeaders];
  return result.rows.map((row) => [
    ...(row.dimensionValues || []).map((item) => item.value ?? ""),
    ...(row.metricValues || []).map((item) => item.value ?? ""),
  ]).map((values) => headers.reduce((record, header, index) => {
    record[header] = values[index] ?? "";
    return record;
  }, {}));
}

function observationTitle(key) {
  return key === "realtime" ? "GA4 Realtime" : key === "recent" ? "GA4 最近 7 天" : key;
}

function renderObservationMarkdown(key, result) {
  const rows = observationRows(result);
  const title = observationTitle(key);
  if (result?.error) return `### ${title}\n\n查詢失敗：${escapeMarkdown(result.error)}\n`;
  if (!rows.length) return `### ${title}\n\n目前沒有可顯示的資料。這不代表 GA4 故障，可能只是尚未有流量或資料仍在處理。\n`;
  const headers = Object.keys(rows[0]);
  const table = [
    `### ${title}`,
    "",
    `| ${headers.map(escapeMarkdown).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${headers.map((header) => escapeMarkdown(row[header])).join(" | ")} |`),
    "",
  ];
  return table.join("\n");
}

function renderEvidenceDetailsHtml(evidence) {
  return `<details><summary>查看證據</summary><pre>${escapeHtml(jsonForDisplay(evidence))}</pre></details>`;
}

function renderObservationHtml(key, result) {
  const title = observationTitle(key);
  if (result?.error) {
    return `<section class="observation"><h3>${escapeHtml(title)}</h3><p class="muted">查詢失敗：${escapeHtml(result.error)}</p></section>`;
  }
  const rows = observationRows(result);
  if (!rows.length) {
    return `<section class="observation"><h3>${escapeHtml(title)}</h3><p class="muted">目前沒有可顯示的資料。這不代表 GA4 故障，可能只是尚未有流量或資料仍在處理。</p></section>`;
  }
  const headers = Object.keys(rows[0]);
  return `<section class="observation"><h3>${escapeHtml(title)}</h3><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join("")}</tr>`).join("")}</tbody></table></section>`;
}

function reportSummary(report) {
  const summary = report.summary || {};
  return {
    overall: summary.overall || "UNKNOWN",
    score: Number.isFinite(summary.score) ? summary.score : 0,
    counts: summary.counts || {},
  };
}

function reportMetadata(report) {
  const target = report.target || {};
  return [
    ["網站", target.site],
    ["Profile 版本", target.profileVersion],
    ["產生時間", formatDate(report.generatedAt)],
    ["GA4 Measurement ID", target.gaMeasurementId],
    ["GTM Container ID", target.gtmContainerPublicId || target.gtmContainerId],
  ].filter(([, value]) => value);
}

export function renderHealthReportMarkdown(report) {
  const summary = reportSummary(report);
  const metadata = reportMetadata(report);
  const lines = [
    `# ${report.target?.site || "Link Page"} Analytics Health Report`,
    "",
    `**整體狀態：${statusLabel(summary.overall)}（${summary.score}/100）**`,
    "",
    ...metadata.map(([label, value]) => `- ${label}：${escapeMarkdown(value)}`),
    "",
    "## 摘要",
    "",
    `PASS ${summary.counts.PASS || 0} · WARN ${summary.counts.WARN || 0} · FAIL ${summary.counts.FAIL || 0} · INFO ${summary.counts.INFO || 0}`,
    "",
    "## 檢查結果",
    "",
    "| 狀態 | 檢查 | 說明 |",
    "| --- | --- | --- |",
    ...(report.checks || []).map((item) => `| ${escapeMarkdown(statusLabel(item.status))} | ${escapeMarkdown(item.id)} | ${escapeMarkdown(item.message)} |`),
    "",
    "## 資料觀測",
    "",
    ...Object.entries(report.observations || {}).map(([key, result]) => renderObservationMarkdown(key, result)),
    "## 判讀原則",
    "",
    "- WARN 代表需要留意或等待資料，不等同於設定失敗。",
    "- GA4 Realtime 可先確認事件有沒有進站；一般報表可能需要較長處理時間。",
    "- 這份報表是本機產生的閱讀版，不應直接放到公開 Link Page。",
    "",
  ];
  return lines.join("\n");
}

export function renderHealthReportHtml(report) {
  const summary = reportSummary(report);
  const metadata = reportMetadata(report);
  const checkCards = (report.checks || []).map((item) => `<article class="check ${escapeHtml(item.status)}"><div class="check-head"><span class="status">${escapeHtml(statusLabel(item.status))}</span><code>${escapeHtml(item.id)}</code></div><p>${escapeHtml(item.message)}</p>${renderEvidenceDetailsHtml(item.evidence || {})}</article>`).join("");
  const observations = Object.entries(report.observations || {}).map(([key, result]) => renderObservationHtml(key, result)).join("");
  const metadataRows = metadata.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
  const counts = ["PASS", "WARN", "FAIL", "INFO"].map((status) => `<span class="count ${status}">${escapeHtml(statusLabel(status))} ${summary.counts[status] || 0}</span>`).join("");

  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(report.target?.site || "Link Page")} Analytics Health Report</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f4f7fb; color: #172033; }
    body { margin: 0; padding: 32px 18px 56px; }
    main { max-width: 1080px; margin: 0 auto; }
    header, section, .check { background: #fff; border: 1px solid #dfe6f0; border-radius: 16px; box-shadow: 0 8px 24px #1720330d; }
    header { padding: 26px; display: grid; gap: 20px; grid-template-columns: 1fr auto; align-items: center; }
    h1, h2, h3 { margin: 0; } h1 { font-size: clamp(24px, 4vw, 38px); letter-spacing: -.03em; } h2 { font-size: 20px; margin-bottom: 16px; } h3 { font-size: 16px; margin-bottom: 12px; }
    .eyebrow { color: #5c6d86; font-size: 13px; letter-spacing: .08em; text-transform: uppercase; margin: 0 0 8px; }
    .score { min-width: 150px; text-align: center; border-radius: 16px; padding: 18px 20px; background: #eef5ff; } .score strong { display: block; font-size: 40px; line-height: 1; } .score span { color: #40638e; font-size: 14px; }
    .counts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; } .count, .status { border-radius: 999px; padding: 5px 10px; font-size: 12px; font-weight: 700; } .count.PASS, .status { background: #e6f7ee; color: #137443; } .count.WARN { background: #fff5d9; color: #8d6500; } .count.FAIL { background: #ffe7e7; color: #a32c2c; } .count.INFO { background: #edf0f5; color: #59687d; }
    section { margin-top: 18px; padding: 22px; } dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin: 0; } dt { color: #687890; font-size: 12px; margin-bottom: 4px; } dd { margin: 0; font-weight: 650; overflow-wrap: anywhere; }
    .checks { display: grid; gap: 10px; } .check { padding: 15px 17px; box-shadow: none; border-left: 4px solid #2da46b; } .check.WARN { border-left-color: #d39b00; } .check.FAIL { border-left-color: #d84a4a; } .check.INFO { border-left-color: #8491a5; } .check-head { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; } code { color: #52647e; font-size: 12px; } .check p { margin: 10px 0; } details { color: #64738a; font-size: 12px; } summary { cursor: pointer; } pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #f6f8fb; border-radius: 10px; padding: 12px; margin: 10px 0 0; }
    .observation { margin-top: 18px; } table { width: 100%; border-collapse: collapse; font-size: 13px; } th, td { padding: 10px 8px; border-bottom: 1px solid #e7ebf2; text-align: left; } th { color: #63738a; font-weight: 650; } .muted { color: #687890; }
    footer { color: #728097; font-size: 12px; margin-top: 18px; text-align: center; }
    @media (max-width: 640px) { body { padding: 16px 10px 34px; } header { grid-template-columns: 1fr; padding: 20px; } .score { text-align: left; } .score strong { display: inline; margin-right: 6px; } section { padding: 17px; } table { display: block; overflow-x: auto; white-space: nowrap; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div><p class="eyebrow">Analytics Health Report</p><h1>${escapeHtml(report.target?.site || "Link Page")}</h1><div class="counts">${counts}</div></div>
      <div class="score"><strong>${summary.score}</strong><span>整體分數 · ${escapeHtml(statusLabel(summary.overall))}</span></div>
    </header>
    <section><h2>報表資訊</h2><dl>${metadataRows}</dl></section>
    <section><h2>檢查結果</h2><div class="checks">${checkCards || '<p class="muted">沒有檢查結果。</p>'}</div></section>
    <section><h2>資料觀測</h2>${observations || '<p class="muted">本次沒有觀測資料。</p>'}</section>
    <footer>此報表由本機 Analytics Health 工具產生；不應直接公開到 Link Page。</footer>
  </main>
</body>
</html>`;
}

function historyEntry(report) {
  const summary = reportSummary(report);
  return {
    generatedAt: report.generatedAt,
    overall: summary.overall,
    score: summary.score,
    counts: summary.counts,
    checks: (report.checks || []).map((item) => ({ id: item.id, status: item.status })),
  };
}

export function writeHealthReportArtifacts(report, { outputDir = path.join(config.toolRoot, "reports") } = {}) {
  fs.mkdirSync(outputDir, { recursive: true });
  const stamp = timestampSlug(report.generatedAt);
  const baseName = `health-${stamp}`;
  const json = `${JSON.stringify(redactForOutput(report), null, 2)}\n`;
  const markdown = renderHealthReportMarkdown(report);
  const html = renderHealthReportHtml(report);
  const files = {
    json: path.join(outputDir, `${baseName}.json`),
    markdown: path.join(outputDir, `${baseName}.md`),
    html: path.join(outputDir, `${baseName}.html`),
    latestJson: path.join(outputDir, "latest.json"),
    latestMarkdown: path.join(outputDir, "latest.md"),
    latestHtml: path.join(outputDir, "latest.html"),
    history: path.join(outputDir, "history.json"),
  };
  fs.writeFileSync(files.json, json, "utf8");
  fs.writeFileSync(files.markdown, markdown, "utf8");
  fs.writeFileSync(files.html, html, "utf8");
  fs.writeFileSync(files.latestJson, json, "utf8");
  fs.writeFileSync(files.latestMarkdown, markdown, "utf8");
  fs.writeFileSync(files.latestHtml, html, "utf8");

  let history = [];
  if (fs.existsSync(files.history)) {
    try {
      const previous = JSON.parse(fs.readFileSync(files.history, "utf8"));
      if (Array.isArray(previous)) history = previous;
    } catch {
      history = [];
    }
  }
  history.push(historyEntry(report));
  fs.writeFileSync(files.history, `${JSON.stringify(history.slice(-90), null, 2)}\n`, "utf8");

  return { files, summary: reportSummary(report), generatedAt: report.generatedAt };
}
