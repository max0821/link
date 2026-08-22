const API_ROOTS = Object.freeze({
  analyticsAdmin: "https://analyticsadmin.googleapis.com/v1beta",
  analyticsData: "https://analyticsdata.googleapis.com/v1beta",
  tagManager: "https://tagmanager.googleapis.com/tagmanager/v2",
  measurementProtocol: "https://www.google-analytics.com",
});

export { API_ROOTS };

export async function googleApiRequest(root, path, { token, method = "GET", body, query } = {}) {
  const url = new URL(`${root}/${path.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  }

  const headers = { accept: "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || payload?.error_description || `HTTP ${response.status}`;
    const error = new Error(`${method} ${url.pathname}：${message}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export async function listAll(root, path, { token, query = {}, collectionKey } = {}) {
  const values = [];
  let pageToken = "";
  do {
    const payload = await googleApiRequest(root, path, {
      token,
      query: { ...query, pageSize: query.pageSize || "200", pageToken },
    });
    const key = collectionKey || Object.keys(payload || {}).find((name) => Array.isArray(payload[name]));
    if (key) values.push(...(payload[key] || []));
    pageToken = payload?.nextPageToken || "";
  } while (pageToken);
  return values;
}

export function redactForOutput(value) {
  if (Array.isArray(value)) return value.map(redactForOutput);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    if (/token|secret|client_secret|authorization/i.test(key)) return [key, "[REDACTED]"];
    return [key, redactForOutput(item)];
  }));
}
