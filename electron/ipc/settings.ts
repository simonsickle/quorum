import { ipcMain, safeStorage } from 'electron';
import { getDatabase } from '../services/db';
import {
  listAnthropicModels,
  listOpenAIModels,
  listGeminiModels,
} from '../services/ai/model-list';

const ENCRYPTED_PREFIX = 'encrypted:';

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', async () => {
    const db = getDatabase();
    const rows = db.prepare('SELECT key, value FROM settings').all() as {
      key: string;
      value: string;
    }[];

    const settings: Record<string, any> = {};
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }
    return settings;
  });

  ipcMain.handle('settings:save', async (_event, settings: Record<string, any>) => {
    const db = getDatabase();
    const upsert = db.prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    );

    const saveTransaction = db.transaction((entries: [string, any][]) => {
      for (const [key, value] of entries) {
        // Don't save API keys in plain text settings
        if (key === 'apiKeys') continue;
        upsert.run(key, JSON.stringify(value));
      }
    });

    saveTransaction(Object.entries(settings));
  });

  ipcMain.handle('settings:save-api-key', async (_event, provider: string, key: string) => {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption not available on this platform');
    }

    const encrypted = safeStorage.encryptString(key);
    const db = getDatabase();
    db.prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).run(`apiKey:${provider}`, ENCRYPTED_PREFIX + encrypted.toString('base64'));
  });

  ipcMain.handle('settings:get-api-key', async (_event, provider: string) => {
    const db = getDatabase();
    const row = db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get(`apiKey:${provider}`) as { value: string } | undefined;

    if (!row?.value) return '';

    if (row.value.startsWith(ENCRYPTED_PREFIX)) {
      const encrypted = Buffer.from(
        row.value.slice(ENCRYPTED_PREFIX.length),
        'base64'
      );
      return safeStorage.decryptString(encrypted);
    }

    return row.value;
  });

  ipcMain.handle('settings:delete-api-key', async (_event, provider: string) => {
    const db = getDatabase();
    db.prepare('DELETE FROM settings WHERE key = ?').run(`apiKey:${provider}`);
  });

  ipcMain.handle('settings:list-models', async (_event, provider: string) => {
    // Retrieve the API key for the provider
    const db = getDatabase();
    const row = db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get(`apiKey:${provider}`) as { value: string } | undefined;

    if (!row?.value) return [];

    let apiKey = row.value;
    if (apiKey.startsWith(ENCRYPTED_PREFIX)) {
      const encrypted = Buffer.from(apiKey.slice(ENCRYPTED_PREFIX.length), 'base64');
      apiKey = safeStorage.decryptString(encrypted);
    }

    switch (provider) {
      case 'anthropic':
        return listAnthropicModels(apiKey);
      case 'openai':
        return listOpenAIModels(apiKey);
      case 'gemini':
        return listGeminiModels(apiKey);
      default:
        return [];
    }
  });
}
