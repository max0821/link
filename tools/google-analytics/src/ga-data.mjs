import { requirePropertyId } from "./config.mjs";
import { API_ROOTS, googleApiRequest } from "./google-api.mjs";

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

export async function getDataMetadata(token) {
  const propertyId = requirePropertyId();
  return googleApiRequest(API_ROOTS.analyticsData, `properties/${propertyId}/metadata`, { token });
}
