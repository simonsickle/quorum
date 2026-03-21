import { useState } from 'react';
import { CustomSubAgentConfig, AgentEnableCondition, ReviewCategory } from '../../types/review';

const ENABLE_CONDITIONS: { value: AgentEnableCondition; label: string }[] = [
  { value: 'always', label: 'Always' },
  { value: 'ui-files', label: 'When UI files changed' },
  { value: 'backend-files', label: 'When backend files changed' },
  { value: 'test-files', label: 'When test files changed' },
];

const AVAILABLE_CATEGORIES: ReviewCategory[] = [
  'architecture', 'bug', 'performance', 'security', 'style', 'naming',
  'error-handling', 'testing', 'documentation', 'other',
];

const PRESET_TEMPLATES: Omit<CustomSubAgentConfig, 'id'>[] = [
  {
    name: 'Testing Focus',
    prompt: `You are a Testing specialist reviewer. Focus on:
- **Test coverage**: Are new code paths covered by tests?
- **Test quality**: Are tests meaningful or just checking happy paths?
- **Missing edge cases**: What boundary conditions need test coverage?
- **Test patterns**: Do tests follow the project's established patterns?
- **Mocking**: Are mocks appropriate? Are they too broad or too narrow?
- **Flakiness**: Could any tests be non-deterministic?

Only report issues where tests are clearly missing, broken, or insufficient.`,
    categories: ['testing', 'bug', 'other'],
    enableCondition: 'always',
    enabled: true,
  },
  {
    name: 'Performance Deep-Dive',
    prompt: `You are a Performance specialist reviewer. Focus on:
- **Algorithmic complexity**: O(n²) or worse patterns that could be optimized
- **Memory usage**: Unbounded arrays, missing cleanup, large object retention
- **Database queries**: N+1 queries, missing indexes, excessive data fetching
- **Caching**: Missing memoization, unnecessary re-computation
- **Bundle size**: Large imports that could be tree-shaken or lazy-loaded
- **Rendering**: Unnecessary re-renders, missing virtualization for long lists
- **Network**: Redundant API calls, missing pagination, large payloads

Be specific about the performance impact and provide benchmarkable suggestions.`,
    categories: ['performance', 'architecture', 'other'],
    enableCondition: 'always',
    enabled: true,
  },
  {
    name: 'API Reviewer',
    prompt: `You are an API design specialist. Focus on:
- **RESTful conventions**: Proper HTTP methods, status codes, URL patterns
- **Input validation**: Missing or inadequate request validation
- **Error responses**: Consistent error format, helpful error messages
- **Authentication/Authorization**: Missing auth checks, improper scoping
- **Versioning**: Breaking changes that should be versioned
- **Rate limiting**: Endpoints that need rate limiting
- **Documentation**: Missing or outdated API documentation

Only review API-related files (routes, controllers, middleware, API types).`,
    categories: ['architecture', 'security', 'error-handling', 'documentation', 'other'],
    enableCondition: 'backend-files',
    enabled: true,
  },
];

interface CustomAgentsProps {
  agents: CustomSubAgentConfig[];
  onSave: (agents: CustomSubAgentConfig[]) => void;
}

export function CustomAgents({ agents, onSave }: CustomAgentsProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Omit<CustomSubAgentConfig, 'id'>>({
    name: '',
    prompt: '',
    categories: ['other'],
    enableCondition: 'always',
    enabled: true,
  });

  const handleAdd = () => {
    const newAgent: CustomSubAgentConfig = {
      id: `custom-${Date.now()}`,
      ...formData,
    };
    onSave([...agents, newAgent]);
    setShowForm(false);
    resetForm();
  };

  const handleUpdate = (id: string) => {
    onSave(agents.map((a) => (a.id === id ? { ...a, ...formData } : a)));
    setEditing(null);
    resetForm();
  };

  const handleDelete = (id: string) => {
    onSave(agents.filter((a) => a.id !== id));
  };

  const handleToggle = (id: string) => {
    onSave(agents.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
  };

  const handleLoadPreset = (preset: Omit<CustomSubAgentConfig, 'id'>) => {
    setFormData({ ...preset });
    setShowForm(true);
  };

  const startEdit = (agent: CustomSubAgentConfig) => {
    setFormData({
      name: agent.name,
      prompt: agent.prompt,
      categories: agent.categories,
      enableCondition: agent.enableCondition,
      enabled: agent.enabled,
    });
    setEditing(agent.id);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      prompt: '',
      categories: ['other'],
      enableCondition: 'always',
      enabled: true,
    });
  };

  const toggleCategory = (cat: ReviewCategory) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const renderForm = (onSubmit: () => void, submitLabel: string) => (
    <div className="space-y-3 p-3 rounded-md bg-surface-0 border border-border-default">
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
        placeholder="Agent name (e.g., Testing Focus)"
        className="w-full bg-surface-1 border border-border-default rounded-md px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue"
      />
      <textarea
        value={formData.prompt}
        onChange={(e) => setFormData((prev) => ({ ...prev, prompt: e.target.value }))}
        placeholder="Agent prompt — describe the reviewer's focus areas and instructions..."
        rows={6}
        className="w-full bg-surface-1 border border-border-default rounded-md px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue resize-y font-mono"
      />
      <div>
        <span className="text-xs text-text-secondary block mb-1">Categories:</span>
        <div className="flex flex-wrap gap-1">
          {AVAILABLE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                formData.categories.includes(cat)
                  ? 'bg-accent-blue text-white'
                  : 'bg-surface-2 text-text-muted hover:text-text-secondary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="text-xs text-text-secondary block mb-1">Enable when:</span>
        <select
          value={formData.enableCondition}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              enableCondition: e.target.value as AgentEnableCondition,
            }))
          }
          className="bg-surface-1 border border-border-default rounded px-2 py-1 text-xs text-text-secondary"
        >
          {ENABLE_CONDITIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSubmit}
          disabled={!formData.name.trim() || !formData.prompt.trim()}
          className="px-3 py-1.5 rounded-md bg-accent-blue text-white text-xs hover:bg-accent-blue/80 disabled:opacity-50"
        >
          {submitLabel}
        </button>
        <button
          onClick={() => {
            setShowForm(false);
            setEditing(null);
            resetForm();
          }}
          className="px-3 py-1.5 rounded-md bg-surface-2 text-text-secondary text-xs hover:bg-surface-3"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <section>
      <h2 className="text-sm font-medium text-text-primary mb-1">Custom Review Agents</h2>
      <p className="text-xs text-text-secondary mb-3">
        Define specialized reviewers with custom focus areas. They run alongside the built-in agents and can use skills to fetch file contents, search the codebase, and more.
      </p>

      {/* Existing agents */}
      {agents.length > 0 && (
        <div className="space-y-2 mb-3">
          {agents.map((agent) => (
            <div key={agent.id}>
              {editing === agent.id ? (
                renderForm(() => handleUpdate(agent.id), 'Save')
              ) : (
                <div className="flex items-center justify-between p-3 rounded-md bg-surface-1 border border-border-default">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-primary font-medium">{agent.name}</span>
                      <span className="text-xs text-text-muted bg-surface-2 px-1.5 py-0.5 rounded">
                        {ENABLE_CONDITIONS.find((c) => c.value === agent.enableCondition)?.label}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5 truncate">
                      {agent.prompt.slice(0, 100)}...
                    </p>
                    <div className="flex gap-1 mt-1">
                      {agent.categories.map((cat) => (
                        <span
                          key={cat}
                          className="text-[10px] text-text-muted bg-surface-2 px-1 py-0.5 rounded"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={() => startEdit(agent)}
                      className="text-xs text-text-muted hover:text-text-secondary"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(agent.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => handleToggle(agent.id)}
                      className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                        agent.enabled ? 'bg-accent-blue' : 'bg-surface-3'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          agent.enabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm && !editing && renderForm(handleAdd, 'Add Agent')}

      {/* Actions */}
      {!showForm && !editing && (
        <div className="space-y-2">
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="w-full py-2 rounded-md border border-dashed border-border-default text-xs text-text-muted hover:text-text-secondary hover:border-border-hover transition-colors"
          >
            + Add custom agent
          </button>

          {/* Preset templates */}
          <div>
            <span className="text-xs text-text-muted block mb-1">Or start from a template:</span>
            <div className="flex flex-wrap gap-1">
              {PRESET_TEMPLATES.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handleLoadPreset(preset)}
                  className="px-2 py-1 rounded text-xs bg-surface-1 border border-border-default text-text-secondary hover:bg-surface-2 transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
