import { useState, useEffect } from 'react';
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

const PROVIDER_LABELS: Record<ModelProvider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  gemini: 'Gemini',
};

export function ModelSelector({
  provider,
  config,
  enabled,
  hasKey,
  onToggle,
  onUpdateConfig,
}: ModelSelectorProps) {
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hasKey) {
      setModels([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    window.electronAPI.settings
      .listModels(provider)
      .then((result) => {
        if (!cancelled) setModels(result);
      })
      .catch((err) => {
        if (!cancelled) setError('Failed to load models');
        console.error(`Failed to list ${provider} models:`, err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [provider, hasKey]);

  return (
    <div className="flex items-center justify-between p-3 rounded-md bg-surface-1 border border-border-default">
      <div className="flex items-center gap-3">
        {/* Toggle */}
        <button
          onClick={onToggle}
          disabled={!hasKey}
          className={`shrink-0 w-10 h-5 rounded-full transition-colors relative overflow-hidden ${
            enabled ? 'bg-accent-blue' : 'bg-surface-3'
          } ${!hasKey ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        <span className="text-sm text-text-primary">{PROVIDER_LABELS[provider]}</span>
      </div>

      {/* Model dropdown */}
      {loading ? (
        <span className="text-xs text-text-muted">Loading models...</span>
      ) : error ? (
        <span className="text-xs text-red-400">{error}</span>
      ) : (
        <select
          value={config.model}
          onChange={(e) => onUpdateConfig({ model: e.target.value })}
          disabled={!enabled || models.length === 0}
          className="bg-surface-0 border border-border-default rounded px-2 py-1 text-xs text-text-secondary focus:outline-none disabled:opacity-50"
        >
          {models.length === 0 && (
            <option value={config.model}>{config.model}</option>
          )}
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
