import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(toolRoot, "..", "..");
const checkerPath = "tools/google-analytics/src/public-safety-check.mjs";

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot, encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
}

function isPublicDocumentation(relativePath) {
  return /(?:\.md|\.txt|\.ya?ml)$/i.test(relativePath) || relativePath.endsWith(".env.example");
}

function addIssue(issues, rule, relativePath) {
  issues.push({ rule, file: relativePath });
}

const issues = [];
const files = trackedFiles();
const fileNamePattern = /(^|[\\/])(?:\.env|.*\.(?:pem|key|p12|pfx))$/i;
const absoluteWindowsPathPattern = /[A-Z]:[\\/]/;
const privateKeyPattern = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
const credentialValuePattern = /(?:GOOGLE_OAUTH_CLIENT_SECRET|GOOGLE_REFRESH_TOKEN|GA_MEASUREMENT_PROTOCOL_API_SECRET)[ \t]*=[ \t]*(?!#|$|\$\{)[^\r\n#]+/;
const publicConfigIdPattern = /GTM-[A-Z0-9]{6,}|G-[A-Z0-9]{6,}|(?:GA_PROPERTY_ID|GTM_ACCOUNT_ID|GTM_CONTAINER_ID|GTM_WORKSPACE_ID)\s*=\s*\d+/;

for (const relativePath of files) {
  if (fileNamePattern.test(relativePath)) addIssue(issues, "tracked-sensitive-file", relativePath);
  if (relativePath === checkerPath) continue;

  const absolutePath = path.join(repoRoot, relativePath);
  const buffer = fs.readFileSync(absolutePath);
  if (buffer.includes(0)) continue;
  const content = buffer.toString("utf8");

  if (absoluteWindowsPathPattern.test(content)) addIssue(issues, "absolute-windows-path", relativePath);
  if (privateKeyPattern.test(content)) addIssue(issues, "private-key-material", relativePath);
  if (credentialValuePattern.test(content)) addIssue(issues, "credential-value", relativePath);
  if (isPublicDocumentation(relativePath) && publicConfigIdPattern.test(content)) {
    addIssue(issues, "concrete-analytics-id-in-public-doc", relativePath);
  }
}

if (issues.length) {
  console.error("Public safety audit failed:");
  for (const issue of issues) console.error(`- ${issue.rule}: ${issue.file}`);
  process.exitCode = 1;
} else {
  console.log(`Public safety audit passed (${files.length} tracked files checked).`);
}
