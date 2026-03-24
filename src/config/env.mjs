import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const raw = readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const cleaned = line.trim();
    if (!cleaned || cleaned.startsWith('#')) continue;

    const separator = cleaned.indexOf('=');
    if (separator <= 0) continue;

    const key = cleaned.slice(0, separator).trim();
    let value = cleaned.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] == null) {
      process.env[key] = value;
    }
  }
}

export function initializeEnv(baseDir) {
  const envFilePath = path.join(baseDir, '.env.local');
  loadEnvFile(envFilePath);
  return { envFilePath };
}
