import { config, requirePropertyId } from "./config.mjs";
import { API_ROOTS } from "./google-api.mjs";

export async function validateMeasurementProtocolEvent({ clientId = "link-api-test", debug = true } = {}) {
  const propertyId = requirePropertyId();
  const apiSecret = process.env.GA_MEASUREMENT_PROTOCOL_API_SECRET || "";
  if (!apiSecret) throw new Error("缺少 GA_MEASUREMENT_PROTOCOL_API_SECRET；它只應存在於受保護的執行環境，不要提交到 repo。");

  const endpoint = debug ? "/debug/mp/collect" : "/mp/collect";
  const response = await fetch(`${API_ROOTS.measurementProtocol}${endpoint}?measurement_id=${encodeURIComponent(config.gaMeasurementId)}&api_secret=${encodeURIComponent(apiSecret)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      events: [{
        name: "link_click",
        params: {
          link_id: "api_validation",
          link_name: "API validation",
          link_url: "https://link.9sweb.com/",
          link_type: "test",
          link_position: "0",
          section_name: "api",
          debug_mode: debug ? 1 : undefined,
        },
      }],
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Measurement Protocol HTTP ${response.status}`);
  return { propertyId, debug, validationMessages: payload.validationMessages || [], ok: true };
}
