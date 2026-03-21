import { ModelProvider, CustomSubAgentConfig } from './review';

export interface APIKeyConfig {
  provider: ModelProvider;
  key: string;
  isValid: boolean;
  lastValidated?: string;
}

export interface ModelConfig {
  provider: ModelProvider;
  enabled: boolean;
  model: string;
  maxTokens: number;
}

export interface AppSettings {
  githubToken: string;
  apiKeys: Record<ModelProvider, string>;
  enabledModels: Record<ModelProvider, boolean>;
  modelConfigs: Record<ModelProvider, ModelConfig>;
  consensusModel: string;
  theme: 'dark' | 'light';
  diffViewMode: 'unified' | 'split';
  autoReview: boolean;
  pollIntervalMinutes: number;
  enableDesignReview: boolean;
  enableStackDetection: boolean;
  customAgents: CustomSubAgentConfig[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  githubToken: '',
  apiKeys: {
    anthropic: '',
    openai: '',
    gemini: '',
  },
  enabledModels: {
    anthropic: false,
    openai: false,
    gemini: false,
  },
  modelConfigs: {
    anthropic: {
      provider: 'anthropic',
      enabled: false,
      model: 'claude-sonnet-4-20250514',
      maxTokens: 8192,
    },
    openai: {
      provider: 'openai',
      enabled: false,
      model: 'gpt-4o',
      maxTokens: 8192,
    },
    gemini: {
      provider: 'gemini',
      enabled: false,
      model: 'gemini-2.0-flash',
      maxTokens: 8192,
    },
  },
  consensusModel: 'claude-haiku-4-5-20251001',
  theme: 'dark',
  diffViewMode: 'unified',
  autoReview: false,
  pollIntervalMinutes: 5,
  enableDesignReview: true,
  enableStackDetection: true,
  customAgents: [],
};
