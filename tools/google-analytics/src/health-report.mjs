import { config } from "./config.mjs";
import { auditAnalytics, CTA_CUSTOM_DIMENSIONS } from "./ga-admin.mjs";
import {
  DEFAULT_REPORT_WINDOW,
  runCtaPerformanceReport,
  runEventHealthReport,
  runRealtimeLinkClickReport,
  runTrafficSummaryReport,
  runTrafficTrendReport,
} from "./ga-data.mjs";
import { auditGtm } from "./gtm.mjs";
import { scanLocalSite } from "./site-scan.mjs";
import { link9swebProfile } from "./site-profile.mjs";

function check(id, status, message, evidence = {}) {
  return { id, status, message, evidence };
}

function valueOfParameter(entity, key) {
  return (entity?.parameter || []).find((item) => item.key === key)?.value || "";
}

function hasEventName(tag, eventName) {
  return valueOfParameter(tag, "eventName") === eventName;
}

function hasMeasurementId(tag, measurementId) {
  return (tag?.parameter || []).some((item) =>
    ["measurementId", "MEASUREMENT_ID", "tagId"].includes(item.key) && item.value === measurementId,
  );
}

function findTargetProperty(ga) {
  const configuredId = config.gaPropertyId.replace(/^properties\//, "");
  return ga.targetProperties.find((property) => property.name === `properties/${configuredId}`)
    || ga.targetProperties[0]
    || null;
}

function findTargetContainer(gtm) {
  return gtm.containers.find((container) =>
    String(container.containerId || "") === String(config.gtmContainerId)
    || container.publicId === config.gtmContainerPublicId
    || container.name === `accounts/${config.gtmAccountId}/containers/${config.gtmContainerId}`,
  ) || gtm.containers[0] || null;
}

function summarizeChecks(checks) {
  const counts = checks.reduce((result, item) => {
    result[item.status] = (result[item.status] || 0) + 1;
    return result;
  }, {});
  const score = Math.max(0, 100 - (counts.FAIL || 0) * 25 - (counts.WARN || 0) * 10);
  const overall = counts.FAIL ? "FAIL" : counts.WARN ? "WARN" : "PASS";
  return { overall, score, counts };
}

function buildGtmChecks(gtm) {
  const targetContainer = findTargetContainer(gtm);
  const entities = gtm.entities || {};
  const tags = entities.tags || [];
  const triggers = entities.triggers || [];
  const variables = entities.variables || [];
  const eventTags = tags.filter((tag) => tag.type === "gaawe" && hasEventName(tag, link9swebProfile.expected.eventName));
  const googleTags = tags.filter((tag) => tag.type === "googtag" || tag.type === "google_tag");
  const linkTrigger = triggers.filter((trigger) =>
    trigger.type === "customEvent"
    && (trigger.name === "CE - link_click" || JSON.stringify(trigger).includes(link9swebProfile.expected.eventName)),
  );
  const requiredVariables = link9swebProfile.expected.eventParameters.map((name) => `DLV - ${name}`);
  const missingVariables = requiredVariables.filter((name) => !variables.some((variable) => variable.name === name));
  const status = gtm.status || {};
  const hasWorkspaceChanges = Array.isArray(status.workspaceChange) && status.workspaceChange.length > 0;
  const workspaceSynced = status.syncStatus === "同步完成"
    || status.status === "SYNCED"
    || (!hasWorkspaceChanges && Object.keys(status).length === 0);

  return [
    check(
      "gtm.container",
      targetContainer ? "PASS" : "FAIL",
      targetContainer ? "GTM Container 存在" : "找不到目標 GTM Container",
      { targetContainer: targetContainer?.name || null, expected: config.gtmContainerId },
    ),
    check(
      "gtm.workspace",
      gtm.workspaces?.some((workspace) => String(workspace.workspaceId || "") === String(config.gtmWorkspaceId)) ? "PASS" : "FAIL",
      "目標 Workspace 存在",
      { workspaceId: config.gtmWorkspaceId },
    ),
    check(
      "gtm.google_tag",
      googleTags.length === 1 && hasMeasurementId(googleTags[0], link9swebProfile.expected.measurementId) ? "PASS" : googleTags.length > 1 ? "WARN" : "FAIL",
      googleTags.length === 1 ? "Google tag 數量與 Measurement ID 正確" : "Google tag 可能不存在或重複",
      { count: googleTags.length, measurementId: link9swebProfile.expected.measurementId },
    ),
    check(
      "gtm.link_click_trigger",
      linkTrigger.length === 1 ? "PASS" : linkTrigger.length > 1 ? "WARN" : "FAIL",
      linkTrigger.length === 1 ? "link_click trigger 存在且唯一" : "link_click trigger 不存在或重複",
      { count: linkTrigger.length },
    ),
    check(
      "gtm.link_click_tag",
      eventTags.length === 1 ? "PASS" : eventTags.length > 1 ? "WARN" : "FAIL",
      eventTags.length === 1 ? "GA4 link_click Event tag 存在且唯一" : "GA4 link_click Event tag 不存在或重複",
      { count: eventTags.length },
    ),
    check(
      "gtm.data_layer_variables",
      missingVariables.length === 0 ? "PASS" : "FAIL",
      missingVariables.length === 0 ? "CTA Data Layer Variables 完整" : "CTA Data Layer Variables 不完整",
      { requiredVariables, missingVariables },
    ),
    check(
      "gtm.workspace_status",
      workspaceSynced ? "PASS" : "WARN",
      workspaceSynced ? "Workspace 已同步，沒有未提交變更" : "Workspace sync status 需要持續觀察",
      { status },
    ),
  ];
}

function buildGaChecks(ga) {
  const property = findTargetProperty(ga);
  const streams = property ? ga.streams.filter((stream) => stream.parent === property.name || stream.name?.startsWith(`${property.name}/`)) : [];
  const webStreams = streams.filter((stream) => stream.webStreamData);
  const measurementMatches = webStreams.filter((stream) => stream.webStreamData.measurementId === link9swebProfile.expected.measurementId);
  const existingDimensions = new Set(ga.dimensions.map((dimension) => dimension.parameterName));
  const missingDimensions = CTA_CUSTOM_DIMENSIONS.map((dimension) => dimension.parameterName).filter((name) => !existingDimensions.has(name));

  return [
    check(
      "ga.property",
      property ? "PASS" : "FAIL",
      property ? "GA4 Property 存在" : "找不到目標 GA4 Property",
      { property: property?.name || null, expected: config.gaPropertyId },
    ),
    check(
      "ga.web_stream",
      measurementMatches.length === 1 ? "PASS" : measurementMatches.length > 1 ? "WARN" : "FAIL",
      measurementMatches.length === 1 ? "Web Data Stream 與 Measurement ID 相符" : "Web Data Stream 不存在或 Measurement ID 不相符",
      { webStreamCount: webStreams.length, matchingMeasurementIds: measurementMatches.map((stream) => stream.webStreamData.measurementId) },
    ),
    check(
      "ga.custom_dimensions",
      missingDimensions.length === 0 ? "PASS" : "WARN",
      missingDimensions.length === 0 ? "CTA 參數已註冊成自訂維度" : "仍缺少 CTA 自訂維度",
      { missingDimensions },
    ),
    check(
      "ga.key_events",
      "INFO",
      "link_click 不預設標記為 Key Event，避免把一般 CTA 點擊當作轉換",
      { keyEventCount: ga.keyEvents.length },
    ),
  ];
}

function buildObservationCheck(id, result, label) {
  if (result?.error) return check(id, "WARN", `${label} API 暫時無法查詢`, { error: result.error });
  const rows = result?.rows || [];
  return check(
    id,
    rows.length > 0 ? "PASS" : "WARN",
    rows.length > 0 ? `${label} 已觀察到資料` : `${label} 查無近期資料；可能尚未有流量`,
    { rowCount: rows.length, rows },
  );
}

export async function buildHealthReport(token, { includeObservations = true, reportWindow = DEFAULT_REPORT_WINDOW } = {}) {
  const local = scanLocalSite();
  const [ga, gtm] = await Promise.all([auditAnalytics(token), auditGtm(token)]);
  const checks = [
    ...local.checks,
    ...buildGaChecks(ga),
    ...buildGtmChecks(gtm),
  ];
  const observations = {};
  const metrics = {};

  if (includeObservations) {
    const [realtimeResult, recentResult, traffic, previousTraffic, trend, ctaPerformance] = await Promise.all([
      runRealtimeLinkClickReport(token).catch((error) => ({ error: error.message })),
      runEventHealthReport(token).catch((error) => ({ error: error.message })),
      runTrafficSummaryReport(token, reportWindow).catch((error) => ({ error: error.message })),
      runTrafficSummaryReport(token, { startDate: reportWindow.previousStartDate, endDate: reportWindow.previousEndDate }).catch((error) => ({ error: error.message })),
      runTrafficTrendReport(token, reportWindow).catch((error) => ({ error: error.message })),
      runCtaPerformanceReport(token, reportWindow).catch((error) => ({ error: error.message })),
    ]);
    observations.realtime = realtimeResult;
    observations.recent = recentResult;
    metrics.window = reportWindow;
    metrics.traffic = { current: traffic, previous: previousTraffic };
    metrics.dailyTrend = trend;
    metrics.ctaPerformance = ctaPerformance;
    checks.push(buildObservationCheck("ga.realtime", realtimeResult, "GA4 Realtime link_click"));
    checks.push(buildObservationCheck("ga.recent_events", recentResult, "GA4 最近事件"));
  }

  return {
    reportType: "link-page-analytics-health",
    reportVersion: "1.1.0",
    generatedAt: new Date().toISOString(),
    target: {
      site: link9swebProfile.id,
      profileVersion: link9swebProfile.version,
      gaPropertyId: config.gaPropertyId,
      gaMeasurementId: config.gaMeasurementId,
      gtmContainerId: config.gtmContainerId,
      gtmContainerPublicId: config.gtmContainerPublicId,
      gtmWorkspaceId: config.gtmWorkspaceId,
    },
    summary: summarizeChecks(checks),
    checks,
    observations,
    metrics,
    evidence: { local, ga, gtm },
  };
}
