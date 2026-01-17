import fs from "fs";
import path from "path";
import { getEnv } from "@/lib/config";

type EnvMap = Record<string, string>;

let cachedEnv: EnvMap | null = null;

const parseEnvContent = (content: string): EnvMap => {
  const env: EnvMap = {};
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) continue;
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
};

const readEnvFile = (filePath: string): EnvMap => {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return parseEnvContent(content);
  } catch {
    return {};
  }
};

const loadLocalEnv = (): EnvMap => {
  if (cachedEnv) return cachedEnv;
  const root = process.cwd();
  const envFiles = [
    path.join(root, ".env"),
    path.join(root, "apps", ".env"),
  ];
  cachedEnv = envFiles.reduce<EnvMap>((acc, file) => {
    const parsed = readEnvFile(file);
    return { ...acc, ...parsed };
  }, {});
  return cachedEnv;
};

export const resolveUazapiEnv = () => {
  const localEnv = loadLocalEnv();
  const root = process.cwd();
  const rootEnv = readEnvFile(path.join(root, ".env"));
  const appsEnv = readEnvFile(path.join(root, "apps", ".env"));
  const listCandidates = [
    getEnv("UAZAPI_BASE_URLS"),
    rootEnv.UAZAPI_BASE_URLS,
    appsEnv.UAZAPI_BASE_URLS,
    localEnv.UAZAPI_BASE_URLS,
  ].filter((value): value is string => Boolean(value?.trim()));
  const baseCandidates = listCandidates.length
    ? listCandidates
    : [
        getEnv("UAZAPI_BASE_URL"),
        rootEnv.UAZAPI_BASE_URL,
        appsEnv.UAZAPI_BASE_URL,
        localEnv.UAZAPI_BASE_URL,
      ].filter((value): value is string => Boolean(value?.trim()));
  return {
    baseUrl: baseCandidates.join(","),
    adminToken: (
      getEnv("UAZAPI_ADMIN_TOKEN") ||
      rootEnv.UAZAPI_ADMIN_TOKEN ??
      appsEnv.UAZAPI_ADMIN_TOKEN ??
      localEnv.UAZAPI_ADMIN_TOKEN ??
      ""
    ).trim(),
  };
};

export const buildUazapiBaseUrls = (rawValue: string) => {
  const unique = new Set<string>();
  const values = rawValue
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  const isExplicitList = /[,\\s]/.test(rawValue.trim());

  for (const value of values) {
    const trimmed = value.replace(/\/+$/, "");
    if (!trimmed) continue;
    try {
      const url = new URL(trimmed);
      const pathName = url.pathname.replace(/\/+$/, "");
      if (pathName && pathName !== "/") {
        unique.add(`${url.origin}${pathName}`);
      } else {
        unique.add(url.origin);
      }
      if (!isExplicitList) {
        unique.add(url.origin);
        unique.add(`${url.origin}/api/v2`);
        unique.add(`${url.origin}/api/v2.0`);
        unique.add(`${url.origin}/api/v1`);
        unique.add(`${url.origin}/api`);
        unique.add(`${url.origin}/v2`);
        unique.add(`${url.origin}/v2.0`);
        unique.add(`${url.origin}/v1`);
      }
    } catch {
      unique.add(trimmed);
    }
  }

  return Array.from(unique);
};
