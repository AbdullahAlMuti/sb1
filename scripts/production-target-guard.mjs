import fs from 'fs';

export const PRODUCTION_TARGET_ERROR =
  'This script appears to target production. Refusing to run without ALLOW_PRODUCTION=true.';

const PRODUCTION_SUPABASE_HOSTS = new Set([
  'ojxzssooylmydystjvdo.supabase.co',
]);

function loadDotEnvLocal() {
  const envPath = new URL('../.env.local', import.meta.url);
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key] !== undefined) continue;

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadDotEnvLocal();

export function isProductionAllowed() {
  return process.env.ALLOW_PRODUCTION === 'true';
}

export function appearsToTargetProduction(target) {
  if (!target) return false;

  const value = String(target);
  for (const host of PRODUCTION_SUPABASE_HOSTS) {
    if (value.includes(host)) return true;
  }

  try {
    const url = new URL(value);
    return PRODUCTION_SUPABASE_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function assertNotProductionTarget(targets) {
  const targetList = Array.isArray(targets) ? targets : [targets];
  if (!isProductionAllowed() && targetList.some(appearsToTargetProduction)) {
    console.error(PRODUCTION_TARGET_ERROR);
    process.exit(1);
  }
}

export function assertFileDoesNotTargetProduction(filePath) {
  if (!fs.existsSync(filePath)) return;
  assertNotProductionTarget(fs.readFileSync(filePath, 'utf8'));
}

export function getRequiredEnv(name, aliases = []) {
  const names = [name, ...aliases];
  const found = names.find((candidate) => process.env[candidate]);
  if (!found) {
    console.error(`Missing required environment variable: ${names.join(' or ')}`);
    process.exit(1);
  }
  return process.env[found];
}
