import { useState } from 'react';
import { ModelProvider } from '../../types/review';

interface APIKeyInputProps {
  provider: ModelProvider;
  hasKey: boolean;
  onSave: (key: string) => Promise<void>;
  onDelete: () => Promise<void>;
}

const PROVIDER_INFO: Record<ModelProvider, { name: string; placeholder: string; url: string }> = {
  anthropic: {
    name: 'Anthropic',
    placeholder: 'sk-ant-...',
    url: 'https://console.anthropic.com/settings/keys',
  },
  openai: {
    name: 'OpenAI',
    placeholder: 'sk-...',
    url: 'https://platform.openai.com/api-keys',
  },
  gemini: {
    name: 'Google Gemini',
    placeholder: 'AI...',
    url: 'https://aistudio.google.com/apikey',
  },
};

export function APIKeyInput({ provider, hasKey, onSave, onDelete }: APIKeyInputProps) {
  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState('');
  const [saving, setSaving] = useState(false);
  const info = PROVIDER_INFO[provider];

  const handleSave = async () => {
    if (!key.trim()) return;
    setSaving(true);
    try {
      await onSave(key.trim());
      setEditing(false);
      setKey('');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await onDelete();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-md bg-surface-1 border border-border-default">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-text-primary">{info.name}</span>
        {hasKey ? (
          <span className="text-xs px-1.5 py-0.5 rounded bg-green-900/30 text-green-400">
            Configured
          </span>
        ) : (
          <span className="text-xs px-1.5 py-0.5 rounded bg-surface-3 text-text-muted">
            Not set
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={info.placeholder}
              className="bg-surface-0 border border-border-default rounded px-2 py-1 text-xs text-text-primary w-64 focus:outline-none focus:border-accent-blue"
              autoFocus
            />
            <button
              onClick={handleSave}
              disabled={saving || !key.trim()}
              className="px-2 py-1 rounded text-xs bg-accent-blue text-white hover:bg-accent-blue/80 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setKey('');
              }}
              className="px-2 py-1 rounded text-xs text-text-muted hover:text-text-secondary"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <a
              href={info.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent-blue hover:underline"
            >
              Get key
            </a>
            <button
              onClick={() => setEditing(true)}
              className="px-2 py-1 rounded text-xs bg-surface-2 text-text-secondary hover:bg-surface-3"
            >
              {hasKey ? 'Update' : 'Add key'}
            </button>
            {hasKey && (
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-2 py-1 rounded text-xs text-red-400 hover:bg-red-900/20"
              >
                Remove
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
