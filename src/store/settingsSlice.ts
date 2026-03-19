import { StateCreator } from 'zustand';
import { AppSettings, DEFAULT_SETTINGS, ModelConfig } from '../types/settings';
import { ModelProvider } from '../types/review';

export interface SettingsSlice {
  settings: AppSettings;
  settingsLoaded: boolean;
  loadSettings: () => Promise<void>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<void>;
  saveApiKey: (provider: ModelProvider, key: string) => Promise<void>;
  toggleModel: (provider: ModelProvider) => Promise<void>;
  updateModelConfig: (provider: ModelProvider, config: Partial<ModelConfig>) => Promise<void>;
}

export const createSettingsSlice: StateCreator<SettingsSlice> = (set, get) => ({
  settings: DEFAULT_SETTINGS,
  settingsLoaded: false,

  loadSettings: async () => {
    const stored = await window.electronAPI.settings.get();
    const settings = { ...DEFAULT_SETTINGS, ...stored };

    // Load API key validity flags
    for (const provider of ['anthropic', 'openai', 'gemini'] as ModelProvider[]) {
      const key = await window.electronAPI.settings.getApiKey(provider);
      if (key) {
        settings.apiKeys[provider] = '••••••••'; // masked
        settings.enabledModels[provider] = stored.enabledModels?.[provider] ?? false;
      }
    }

    set({ settings, settingsLoaded: true });
  },

  saveSettings: async (partial) => {
    const current = get().settings;
    const updated = { ...current, ...partial };
    await window.electronAPI.settings.save(updated);
    set({ settings: updated });
  },

  saveApiKey: async (provider, key) => {
    await window.electronAPI.settings.saveApiKey(provider, key);
    const current = get().settings;
    set({
      settings: {
        ...current,
        apiKeys: { ...current.apiKeys, [provider]: key ? '••••••••' : '' },
        enabledModels: { ...current.enabledModels, [provider]: !!key },
      },
    });
  },

  toggleModel: async (provider) => {
    const current = get().settings;
    const updated = {
      ...current,
      enabledModels: {
        ...current.enabledModels,
        [provider]: !current.enabledModels[provider],
      },
    };
    await window.electronAPI.settings.save(updated);
    set({ settings: updated });
  },

  updateModelConfig: async (provider, config) => {
    const current = get().settings;
    const updated = {
      ...current,
      modelConfigs: {
        ...current.modelConfigs,
        [provider]: { ...current.modelConfigs[provider], ...config },
      },
    };
    await window.electronAPI.settings.save(updated);
    set({ settings: updated });
  },
});
