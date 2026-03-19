import { ModelProvider } from '../../types/review';
import { ModelConfig } from '../../types/settings';

interface ModelSelectorProps {
  provider: ModelProvider;
  config: ModelConfig;
  enabled: boolean;
  hasKey: boolean;
  onToggle: () => void;
  onUpdateConfig: (config: Partial<ModelConfig>) => void;
}

const MODEL_OPTIONS: Record<ModelProvider, { value: string; label: string }[]> = {
  anthropic: [
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'o3-mini', label: 'o3-mini' },
  ],
  gemini: [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
  ],
};

export function ModelSelector({
  provider,
  config,
  enabled,
  hasKey,
  onToggle,
  onUpdateConfig,
}: ModelSelectorProps) {
  const options = MODEL_OPTIONS[provider] || [];

  return (
    <div className="flex items-center justify-between p-3 rounded-md bg-surface-1 border border-border-default">
      <div className="flex items-center gap-3">
        {/* Toggle */}
        <button
          onClick={onToggle}
          disabled={!hasKey}
          className={`w-10 h-5 rounded-full transition-colors relative ${
            enabled ? 'bg-accent-blue' : 'bg-surface-3'
          } ${!hasKey ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
        <span className="text-sm text-text-primary capitalize">{provider}</span>
      </div>

      {/* Model dropdown */}
      <select
        value={config.model}
        onChange={(e) => onUpdateConfig({ model: e.target.value })}
        disabled={!enabled}
        className="bg-surface-0 border border-border-default rounded px-2 py-1 text-xs text-text-secondary focus:outline-none disabled:opacity-50"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
