import { config, requirePropertyId } from "./config.mjs";
import { API_ROOTS, googleApiRequest, listAll } from "./google-api.mjs";

export async function listAnalyticsAccounts(token) {
  return listAll(API_ROOTS.analyticsAdmin, "accounts", {
    token,
    collectionKey: "accounts",
  });
}

export async function listAnalyticsProperties(token, accountId) {
  return listAll(API_ROOTS.analyticsAdmin, "properties", {
    token,
    query: { filter: `parent:accounts/${accountId}` },
    collectionKey: "properties",
  });
}

export async function listDataStreams(token, propertyId) {
  return listAll(API_ROOTS.analyticsAdmin, `properties/${propertyId}/dataStreams`, {
    token,
    collectionKey: "dataStreams",
  });
}

export async function listCustomDimensions(token, propertyId) {
  return listAll(API_ROOTS.analyticsAdmin, `properties/${propertyId}/customDimensions`, {
    token,
    collectionKey: "customDimensions",
  });
}

export async function listKeyEvents(token, propertyId) {
  return listAll(API_ROOTS.analyticsAdmin, `properties/${propertyId}/keyEvents`, {
    token,
    collectionKey: "keyEvents",
  });
}

export async function createCustomDimension(token, propertyId, dimension) {
  return googleApiRequest(API_ROOTS.analyticsAdmin, `properties/${propertyId}/customDimensions`, {
    token,
    method: "POST",
    body: dimension,
  });
}

export const CTA_CUSTOM_DIMENSIONS = Object.freeze([
  { parameterName: "link_id", displayName: "Link ID", description: "Stable CTA identifier from data-track-id.", scope: "EVENT" },
  { parameterName: "link_name", displayName: "Link name", description: "Human-readable CTA name.", scope: "EVENT" },
  { parameterName: "link_type", displayName: "Link type", description: "CTA category such as article, social, or project.", scope: "EVENT" },
  { parameterName: "link_position", displayName: "Link position", description: "Position within the section.", scope: "EVENT" },
  { parameterName: "section_name", displayName: "Section name", description: "Source section of the CTA.", scope: "EVENT" },
]);

export async function ensureCtaCustomDimensions(token, propertyId, { apply = false } = {}) {
  const existing = await listCustomDimensions(token, propertyId);
  const existingNames = new Set(existing.map((item) => item.parameterName));
  const missing = CTA_CUSTOM_DIMENSIONS.filter((item) => !existingNames.has(item.parameterName));
  if (!apply) return { existing, missing, applied: [] };

  const applied = [];
  for (const dimension of missing) {
    applied.push(await createCustomDimension(token, propertyId, dimension));
  }
  return { existing, missing, applied };
}

export async function auditAnalytics(token) {
  const accounts = await listAnalyticsAccounts(token);
  const properties = [];
  for (const account of accounts) {
    const accountId = account.name?.split("/").pop();
    if (accountId) properties.push(...await listAnalyticsProperties(token, accountId));
  }

  const targetPropertyId = config.gaPropertyId.replace(/^properties\//, "");
  const targetProperties = targetPropertyId
    ? properties.filter((property) => property.name === `properties/${targetPropertyId}`)
    : properties.filter((property) => /link\.9sweb\.com/i.test(property.displayName || property.name || ""));
  const streams = [];
  const dimensions = [];
  const keyEvents = [];
  for (const property of targetProperties) {
    const propertyId = property.name.split("/").pop();
    streams.push(...await listDataStreams(token, propertyId));
    dimensions.push(...await listCustomDimensions(token, propertyId));
    keyEvents.push(...await listKeyEvents(token, propertyId));
  }

  return { accounts, properties, targetProperties, streams, dimensions, keyEvents };
}
