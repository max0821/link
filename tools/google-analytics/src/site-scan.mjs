import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { link9swebProfile } from "./site-profile.mjs";

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(toolRoot, "../..");

function check(id, status, message, evidence = {}) {
  return { id, status, message, evidence };
}

function readRepoFile(fileName) {
  const filePath = path.join(repoRoot, fileName);
  return {
    fileName,
    filePath,
    exists: fs.existsSync(filePath),
    content: fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "",
  };
}

export function scanLocalSite() {
  const files = Object.fromEntries(link9swebProfile.files.map((fileName) => {
    const file = readRepoFile(fileName);
    return [fileName, {
      path: file.filePath,
      exists: file.exists,
      bytes: Buffer.byteLength(file.content),
    }];
  }));
  const index = readRepoFile("index.html");
  const app = readRepoFile("app.js");
  const gtmMarker = "https://www.googletagmanager.com/gtm.js";
  const gtmSnippetCount = (index.content.match(new RegExp(gtmMarker.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&"), "g")) || []).length;
  const gtmIds = [...new Set([...index.content.matchAll(/GTM-[A-Z0-9]+/g)].map((match) => match[0]))];
  const staticTrackedLinks = [...index.content.matchAll(/<a\b[^>]*data-track-id="([^"]+)"/g)].map((match) => match[1]);
  const runtimeAttributeMarkers = Object.fromEntries([
    ["data-track-id", "attributes.id"],
    ["data-track-name", "attributes.name"],
    ["data-track-type", "attributes.type"],
    ["data-track-position", "attributes.position"],
    ["data-track-section", "attributes.section"],
  ].map(([attribute, marker]) => [attribute, app.content.includes(marker)]));
  const eventParameters = link9swebProfile.expected.eventParameters.filter((parameter) => app.content.includes(parameter));

  const checks = [
    check(
      "site.files",
      Object.values(files).every((file) => file.exists) ? "PASS" : "FAIL",
      "主要網站檔案存在",
      { files },
    ),
    check(
      "site.gtm_snippet",
      gtmSnippetCount === 1 && gtmIds.includes(link9swebProfile.expected.gtmPublicId) ? "PASS" : "FAIL",
      gtmSnippetCount === 1 ? "找到唯一標準 GTM 安裝片段" : "GTM 安裝片段數量不符合預期",
      { gtmSnippetCount, gtmIds, expected: link9swebProfile.expected.gtmPublicId },
    ),
    check(
      "site.cta_dom",
      staticTrackedLinks.length > 0 && Object.values(runtimeAttributeMarkers).every(Boolean) ? "PASS" : "WARN",
      "CTA DOM 標記與 runtime tracking contract",
      { staticTrackedLinks, runtimeAttributeMarkers, required: link9swebProfile.dom.requiredAttributes },
    ),
    check(
      "site.event_contract",
      app.content.includes(link9swebProfile.dom.eventPushMarker) && eventParameters.length === link9swebProfile.expected.eventParameters.length ? "PASS" : "FAIL",
      "網站會推送 link_click 及完整事件參數",
      { eventMarker: link9swebProfile.dom.eventPushMarker, eventParameters, expected: link9swebProfile.expected.eventParameters },
    ),
  ];

  return {
    profile: link9swebProfile,
    scannedAt: new Date().toISOString(),
    repoRoot,
    files,
    observed: {
      gtmSnippetCount,
      gtmIds,
      staticTrackedLinks,
      runtimeAttributeMarkers,
      eventParameters,
    },
    checks,
  };
}
