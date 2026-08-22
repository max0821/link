// Site-specific analysis is deliberately kept outside the Google API layer.
// This profile is expected to change as the site's DOM, CTA taxonomy, or
// deployment model changes.
export const link9swebProfile = Object.freeze({
  id: "link.9sweb.com",
  version: "2026-08-22.1",
  repoRoot: "workspace",
  files: ["index.html", "app.js"],
  expected: {
    gtmPublicId: "GTM-W9BNQSDC",
    measurementId: "G-4N0V6SDWH1",
    eventName: "link_click",
    eventParameters: [
      "link_id",
      "link_name",
      "link_url",
      "link_type",
      "link_position",
      "section_name",
    ],
    registeredCustomDimensions: [
      "link_id",
      "link_name",
      "link_type",
      "link_position",
      "section_name",
    ],
  },
  dom: {
    trackedLinkSelector: "a[data-track-id]",
    requiredAttributes: [
      "data-track-id",
      "data-track-name",
      "data-track-type",
      "data-track-position",
      "data-track-section",
    ],
    eventPushMarker: 'event: "link_click"',
  },
});
