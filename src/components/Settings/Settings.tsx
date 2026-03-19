import { useState } from 'react';
import { useStore } from '../../store';
import { APIKeyInput } from './APIKeyInput';
import { ModelSelector } from './ModelSelector';
import { ModelProvider } from '../../types/review';

export function Settings() {
  const { settings, saveSettings, saveApiKey, toggleModel, updateModelConfig } =
    useStore();
  const [githubToken, setGithubToken] = useState('');
  const [tokenSaving, setTokenSaving] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

  const handleSaveGitHubToken = async () => {
    if (!githubToken.trim()) return;
    setTokenSaving(true);

    try {
      const result = await window.electronAPI.github.validateToken(githubToken.trim());
      if (result.valid) {
        await saveSettings({ githubToken: githubToken.trim() });
        setTokenStatus('valid');
        setGithubToken('');
      } else {
        setTokenStatus('invalid');
      }
    } catch {
      setTokenStatus('invalid');
    } finally {
      setTokenSaving(false);
    }
  };

  const providers: ModelProvider[] = ['anthropic', 'openai', 'gemini'];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Settings</h1>
          <p className="text-sm text-text-secondary mt-1">
            Configure your API keys and model preferences
          </p>
        </div>

        {/* GitHub Token */}
        <section>
          <h2 className="text-sm font-medium text-text-primary mb-3">
            GitHub Access Token
          </h2>
          <p className="text-xs text-text-secondary mb-3">
            Required for fetching PRs and posting reviews. Needs <code>repo</code> scope.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={githubToken}
              onChange={(e) => {
                setGithubToken(e.target.value);
                setTokenStatus('idle');
              }}
              placeholder={settings.githubToken ? '••••••••' : 'ghp_...'}
              className="flex-1 bg-surface-0 border border-border-default rounded-md px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue"
            />
            <button
              onClick={handleSaveGitHubToken}
              disabled={tokenSaving || !githubToken.trim()}
              className="px-4 py-2 rounded-md bg-accent-blue text-white text-sm hover:bg-accent-blue/80 disabled:opacity-50"
            >
              {tokenSaving ? 'Validating...' : 'Save'}
            </button>
          </div>
          {tokenStatus === 'valid' && (
            <p className="text-xs text-green-400 mt-1">Token validated and saved.</p>
          )}
          {tokenStatus === 'invalid' && (
            <p className="text-xs text-red-400 mt-1">
              Invalid token. Make sure it has the repo scope.
            </p>
          )}
          {settings.githubToken && tokenStatus === 'idle' && (
            <p className="text-xs text-text-muted mt-1">Token is configured.</p>
          )}
        </section>

        {/* API Keys */}
        <section>
          <h2 className="text-sm font-medium text-text-primary mb-3">API Keys</h2>
          <p className="text-xs text-text-secondary mb-3">
            Add keys for the AI models you want to use for reviews. You need at least one.
          </p>
          <div className="space-y-2">
            {providers.map((provider) => (
              <APIKeyInput
                key={provider}
                provider={provider}
                hasKey={!!settings.apiKeys[provider]}
                onSave={async (key) => {
                  await saveApiKey(provider, key);
                }}
                onDelete={async () => {
                  await window.electronAPI.settings.deleteApiKey(provider);
                  await saveApiKey(provider, '');
                }}
              />
            ))}
          </div>
        </section>

        {/* Model Selection */}
        <section>
          <h2 className="text-sm font-medium text-text-primary mb-3">
            Model Configuration
          </h2>
          <p className="text-xs text-text-secondary mb-3">
            Choose which models to use and which specific model version for each provider.
          </p>
          <div className="space-y-2">
            {providers.map((provider) => (
              <ModelSelector
                key={provider}
                provider={provider}
                config={settings.modelConfigs[provider]}
                enabled={settings.enabledModels[provider]}
                hasKey={!!settings.apiKeys[provider]}
                onToggle={() => toggleModel(provider)}
                onUpdateConfig={(config) => updateModelConfig(provider, config)}
              />
            ))}
          </div>
        </section>

        {/* Preferences */}
        <section>
          <h2 className="text-sm font-medium text-text-primary mb-3">Preferences</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-md bg-surface-1 border border-border-default">
              <div>
                <span className="text-sm text-text-primary">Auto-review new PRs</span>
                <p className="text-xs text-text-muted mt-0.5">
                  Automatically run AI review when new PRs appear
                </p>
              </div>
              <button
                onClick={() => saveSettings({ autoReview: !settings.autoReview })}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                  settings.autoReview ? 'bg-accent-blue' : 'bg-surface-3'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.autoReview ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>

            <label className="flex items-center justify-between p-3 rounded-md bg-surface-1 border border-border-default">
              <div>
                <span className="text-sm text-text-primary">Enable design review</span>
                <p className="text-xs text-text-muted mt-0.5">
                  Run design agent when snapshot tests are detected
                </p>
              </div>
              <button
                onClick={() =>
                  saveSettings({ enableDesignReview: !settings.enableDesignReview })
                }
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                  settings.enableDesignReview ? 'bg-accent-blue' : 'bg-surface-3'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.enableDesignReview ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>

            <label className="flex items-center justify-between p-3 rounded-md bg-surface-1 border border-border-default">
              <div>
                <span className="text-sm text-text-primary">
                  Detect stacked PRs
                </span>
                <p className="text-xs text-text-muted mt-0.5">
                  Parse git topology and use Graphite if available
                </p>
              </div>
              <button
                onClick={() =>
                  saveSettings({
                    enableStackDetection: !settings.enableStackDetection,
                  })
                }
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                  settings.enableStackDetection ? 'bg-accent-blue' : 'bg-surface-3'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.enableStackDetection
                      ? 'translate-x-5'
                      : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>

            <div className="flex items-center justify-between p-3 rounded-md bg-surface-1 border border-border-default">
              <div>
                <span className="text-sm text-text-primary">Poll interval</span>
                <p className="text-xs text-text-muted mt-0.5">
                  How often to check for new PRs (minutes)
                </p>
              </div>
              <select
                value={settings.pollIntervalMinutes}
                onChange={(e) =>
                  saveSettings({ pollIntervalMinutes: parseInt(e.target.value) })
                }
                className="bg-surface-0 border border-border-default rounded px-2 py-1 text-xs text-text-secondary"
              >
                <option value={1}>1 min</option>
                <option value={5}>5 min</option>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
              </select>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
