import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const loadDotEnv = () => {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) return;
    const key = match[1];
    const rawValue = match[2];
    const value = rawValue.replace(/^"|"$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
};

loadDotEnv();

const baseUrlRaw = process.env.BAILEYS_API_URL ?? "";
const baseUrl = baseUrlRaw.trim().replace(/\/$/, "");
const apiKey = process.env.BAILEYS_API_KEY ?? "";

const withTimeout = async (promise, ms) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await promise(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
};

test("BAILEYS_API_URL is configured and valid", () => {
  assert.ok(baseUrl, "BAILEYS_API_URL is missing");
  assert.ok(
    /^https?:\/\//i.test(baseUrl),
    `BAILEYS_API_URL must start with http/https, got: ${baseUrl}`
  );
});

test("Baileys /health responds", async () => {
  const url = `${baseUrl}/health`;
  const headers = {};
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }
  const response = await withTimeout(
    (signal) => fetch(url, { signal, headers }),
    3000
  );
  assert.ok(
    response.ok,
    `Expected 200 OK from ${url}, got ${response.status}`
  );
  const payload = await response.json().catch(() => null);
  assert.ok(payload?.ok === true, `Unexpected payload: ${JSON.stringify(payload)}`);
});
