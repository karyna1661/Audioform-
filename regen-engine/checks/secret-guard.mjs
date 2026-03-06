import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const trackedFiles = execSync("git ls-files", { cwd: root, encoding: "utf8" })
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean)
  .filter((f) => !f.startsWith(".agents/") && !f.startsWith("node_modules/"));

const secretPatterns = [
  { name: "OpenAI key", regex: /\bsk-[A-Za-z0-9]{20,}\b/g },
  { name: "GitHub token", regex: /\bghp_[A-Za-z0-9]{20,}\b/g },
  { name: "AWS access key", regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "Google API key", regex: /\bAIza[0-9A-Za-z\-_]{20,}\b/g },
  { name: "Slack token", regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { name: "Private key block", regex: /-----BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY-----/g },
  { name: "Supabase service key assignment", regex: /\bSUPABASE_SERVICE_ROLE_KEY\s*=\s*['"`]?[A-Za-z0-9._-]{20,}/g },
  { name: "SMTP password assignment", regex: /\bSMTP_PASSWORD\s*=\s*['"`]?.{8,}/g },
];

const findings = [];

for (const file of trackedFiles) {
  const fullPath = path.join(root, file);
  let text = "";
  try {
    text = fs.readFileSync(fullPath, "utf8");
  } catch {
    continue;
  }

  for (const pattern of secretPatterns) {
    if (pattern.regex.test(text)) {
      findings.push({ file, pattern: pattern.name });
      break;
    }
  }
}

if (findings.length) {
  console.error("secret-guard: potential secrets detected in tracked files:");
  for (const finding of findings) {
    console.error(`- ${finding.file} (${finding.pattern})`);
  }
  process.exit(1);
}

console.log("secret-guard: PASS");
