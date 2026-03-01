import fs from "node:fs/promises";
import path from "node:path";
import { appConfig } from "../../config.js";

export type PlatformSettings = {
  uploadsEnabled: boolean;
};

const DEFAULT_SETTINGS: PlatformSettings = {
  uploadsEnabled: true
};

const settingsFilePath = path.join(appConfig.uploadDir, "platform-settings.json");
let cachedSettings: PlatformSettings | null = null;

function normalizeSettings(input: unknown): PlatformSettings {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_SETTINGS };
  }

  const candidate = input as Record<string, unknown>;
  return {
    uploadsEnabled:
      typeof candidate.uploadsEnabled === "boolean" ? candidate.uploadsEnabled : DEFAULT_SETTINGS.uploadsEnabled
  };
}

async function loadSettings(): Promise<PlatformSettings> {
  if (cachedSettings) {
    return cachedSettings;
  }

  try {
    const raw = await fs.readFile(settingsFilePath, "utf8");
    cachedSettings = normalizeSettings(JSON.parse(raw));
    return cachedSettings;
  } catch {
    cachedSettings = { ...DEFAULT_SETTINGS };
    return cachedSettings;
  }
}

async function persistSettings(next: PlatformSettings): Promise<void> {
  await fs.mkdir(appConfig.uploadDir, { recursive: true });
  await fs.writeFile(settingsFilePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

export const platformSettingsStore = {
  async getSettings(): Promise<PlatformSettings> {
    return loadSettings();
  },

  async setUploadsEnabled(value: boolean): Promise<PlatformSettings> {
    const current = await loadSettings();
    const next: PlatformSettings = {
      ...current,
      uploadsEnabled: value
    };
    cachedSettings = next;
    await persistSettings(next);
    return next;
  }
};
