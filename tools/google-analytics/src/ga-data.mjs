import { requirePropertyId } from "./config.mjs";
import { API_ROOTS, googleApiRequest } from "./google-api.mjs";

export const DEFAULT_REPORT_WINDOW = Object.freeze({
  startDate: "7daysAgo",
  endDate: "today",
  previousStartDate: "14daysAgo",
  previousEndDate: "8daysAgo",
});

const TRAFFIC_METRICS = Object.freeze([
  { name: "totalUsers" },
  { name: "sessions" },
  { name: "screenPageViews" },
  { name: "eventCount" },
  { name: "engagementRate" },
]);

function runStandardReport(token, body) {
  const propertyId = requirePropertyId();
  return googleApiRequest(API_ROOTS.analyticsData, `properties/${propertyId}:runReport`, {
    token,
    method: "POST",
    body,
  });
}

export async function runRealtimeLinkClickReport(token) {
  const propertyId = requirePropertyId();
  return googleApiRequest(API_ROOTS.analyticsData, `properties/${propertyId}:runRealtimeReport`, {
    token,
    method: "POST",
    body: {
      dimensions: [
        { name: "eventName" },
      ],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          stringFilter: { matchType: "EXACT", value: "link_click" },
        },
      },
      limit: "100",
    },
  });
}

export async function runEventHealthReport(token, { startDate = "7daysAgo", endDate = "today" } = {}) {
  const propertyId = requirePropertyId();
  return googleApiRequest(API_ROOTS.analyticsData, `properties/${propertyId}:runReport`, {
    token,
    method: "POST",
    body: {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          stringFilter: { matchType: "EXACT", value: "link_click" },
        },
      },
      limit: "100",
    },
  });
}

export async function runTrafficSummaryReport(token, { startDate = "7daysAgo", endDate = "today" } = {}) {
  return runStandardReport(token, {
    dateRanges: [{ startDate, endDate }],
    metrics: TRAFFIC_METRICS,
  });
}

export async function runTrafficTrendReport(token, { startDate = "7daysAgo", endDate = "today" } = {}) {
  return runStandardReport(token, {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "date" }],
    metrics: TRAFFIC_METRICS,
    limit: "1000",
  });
}

export async function runCtaPerformanceReport(token, { startDate = "7daysAgo", endDate = "today" } = {}) {
  return runStandardReport(token, {
    dateRanges: [{ startDate, endDate }],
    dimensions: [
      { name: "customEvent:link_id" },
      { name: "customEvent:link_name" },
      { name: "customEvent:link_type" },
      { name: "customEvent:link_position" },
      { name: "customEvent:section_name" },
    ],
    metrics: [
      { name: "eventCount" },
      { name: "totalUsers" },
    ],
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        stringFilter: { matchType: "EXACT", value: "link_click" },
      },
    },
    limit: "100",
  });
}

export async function getDataMetadata(token) {
  const propertyId = requirePropertyId();
  return googleApiRequest(API_ROOTS.analyticsData, `properties/${propertyId}/metadata`, { token });
}
