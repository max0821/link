import { config } from "./config.mjs";
import { API_ROOTS, googleApiRequest, listAll } from "./google-api.mjs";

function workspacePath() {
  return `accounts/${config.gtmAccountId}/containers/${config.gtmContainerId}/workspaces/${config.gtmWorkspaceId}`;
}

export async function listGtmAccounts(token) {
  return listAll(API_ROOTS.tagManager, "accounts", { token, collectionKey: "account" });
}

export async function listGtmContainers(token, accountId = config.gtmAccountId) {
  return listAll(API_ROOTS.tagManager, `accounts/${accountId}/containers`, { token, collectionKey: "container" });
}

export async function listGtmWorkspaces(token, accountId = config.gtmAccountId, containerId = config.gtmContainerId) {
  return listAll(API_ROOTS.tagManager, `accounts/${accountId}/containers/${containerId}/workspaces`, { token, collectionKey: "workspace" });
}

export async function getGtmWorkspaceStatus(token) {
  return googleApiRequest(API_ROOTS.tagManager, `${workspacePath()}/status`, { token });
}

export async function listGtmEntities(token) {
  const parent = workspacePath();
  const [tags, triggers, variables, builtInVariables] = await Promise.all([
    listAll(API_ROOTS.tagManager, `${parent}/tags`, { token, collectionKey: "tag" }),
    listAll(API_ROOTS.tagManager, `${parent}/triggers`, { token, collectionKey: "trigger" }),
    listAll(API_ROOTS.tagManager, `${parent}/variables`, { token, collectionKey: "variable" }),
    listAll(API_ROOTS.tagManager, `${parent}/built_in_variables`, { token, collectionKey: "builtInVariable" }),
  ]);
  return { tags, triggers, variables, builtInVariables };
}

function template(value) {
  return { type: "template", value };
}

function mapParameter(key, value) {
  return { type: "map", map: [{ key, ...template(value) }] };
}

function dataLayerVariable(name) {
  return {
    name: `DLV - ${name}`,
    type: "v",
    parameter: [{ key: "name", ...template(name) }],
  };
}

export function buildCtaGtmChangeSet() {
  const trigger = {
    name: "CE - link_click",
    type: "customEvent",
    customEventFilter: [{
      type: "equals",
      parameter: [
        { key: "arg0", ...template("{{_event}}") },
        { key: "arg1", ...template("equals") },
        { key: "arg2", ...template("link_click") },
      ],
    }],
  };

  const variables = ["link_id", "link_name", "link_url", "link_type", "link_position", "section_name"].map(dataLayerVariable);
  const eventSettings = [
    ["link_id", "{{DLV - link_id}}"],
    ["link_name", "{{DLV - link_name}}"],
    ["link_url", "{{DLV - link_url}}"],
    ["link_type", "{{DLV - link_type}}"],
    ["link_position", "{{DLV - link_position}}"],
    ["section_name", "{{DLV - section_name}}"],
  ].map(([key, value]) => ({ type: "map", map: [
    { key: "parameter", ...template(key) },
    { key: "parameterValue", ...template(value) },
  ] }));

  const tag = {
    name: "GA4 - Event - link_click",
    type: "gaawe",
    notes: "Generic CTA event. The Google tag in this workspace supplies the GA4 measurement ID.",
    parameter: [
      { key: "eventName", ...template("link_click") },
      { key: "eventSettingsTable", type: "list", list: eventSettings },
    ],
    // The API apply step replaces this placeholder with the triggerId returned by triggers.create.
    firingTriggerId: ["__TRIGGER_ID_FROM_CREATE__"],
  };

  return {
    trigger,
    variables,
    tag,
    builtInVariables: [],
    safety: {
      singleCustomEventTrigger: true,
      publishRequired: true,
      publishNeverAutomatic: true,
      urlParameterIsSentButNotRegisteredAsCustomDimension: true,
    },
  };
}

export async function createGtmEntity(token, resource, entity) {
  const parent = workspacePath();
  return googleApiRequest(API_ROOTS.tagManager, `${parent}/${resource}`, {
    token,
    method: "POST",
    body: entity,
  });
}

export async function applyCtaGtmChangeSet(token, { confirm = false } = {}) {
  if (!confirm) throw new Error("GTM 寫入需要明確 --confirm；預設只產生 plan，不會建立或發布。");
  const plan = buildCtaGtmChangeSet();
  const createdVariables = [];
  for (const variable of plan.variables) createdVariables.push(await createGtmEntity(token, "variables", variable));
  const trigger = await createGtmEntity(token, "triggers", plan.trigger);
  const tag = await createGtmEntity(token, "tags", {
    ...plan.tag,
    firingTriggerId: [trigger.triggerId],
  });
  return { createdVariables, trigger, tag, published: false };
}

export async function createGtmContainerVersion(token, { name = "link.9sweb.com CTA tracking", notes = "Publish link_click CTA tracking." } = {}) {
  return googleApiRequest(API_ROOTS.tagManager, `${workspacePath()}:create_version`, {
    token,
    method: "POST",
    body: { name, notes },
  });
}

export async function publishGtmContainerVersion(token, versionResponse, { confirm = false } = {}) {
  if (!confirm) throw new Error("GTM 發布需要明確 --confirm；預設只建立 Container Version，不會發布。");
  const version = versionResponse?.containerVersion;
  if (!version?.containerVersionId) throw new Error("GTM Container Version 建立失敗，沒有可發布的版本 ID。");
  if (versionResponse.compilerError) throw new Error("GTM Container Version 有 compiler error，停止發布。");
  return googleApiRequest(API_ROOTS.tagManager, `accounts/${config.gtmAccountId}/containers/${config.gtmContainerId}/versions/${version.containerVersionId}:publish`, {
    token,
    method: "POST",
    query: { fingerprint: version.fingerprint },
  });
}

export async function publishGtmWorkspace(token, { confirm = false } = {}) {
  if (!confirm) throw new Error("GTM 發布需要明確 --confirm；預設不會建立版本或發布。");
  const versionResponse = await createGtmContainerVersion(token);
  const published = await publishGtmContainerVersion(token, versionResponse, { confirm: true });
  return {
    versionId: versionResponse.containerVersion?.containerVersionId || null,
    versionName: versionResponse.containerVersion?.name || null,
    compilerError: Boolean(versionResponse.compilerError),
    published: true,
    publishedVersionId: published.containerVersion?.containerVersionId || versionResponse.containerVersion?.containerVersionId || null,
    tagManagerUrl: published.containerVersion?.tagManagerUrl || versionResponse.containerVersion?.tagManagerUrl || null,
  };
}

export async function auditGtm(token) {
  const [accounts, containers, workspaces, status, entities] = await Promise.all([
    listGtmAccounts(token),
    listGtmContainers(token),
    listGtmWorkspaces(token),
    getGtmWorkspaceStatus(token),
    listGtmEntities(token),
  ]);
  return { accounts, containers, workspaces, status, entities };
}
