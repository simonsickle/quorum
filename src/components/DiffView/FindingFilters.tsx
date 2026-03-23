import { Severity, ReviewCategory, ConfidenceTier } from '../../types/review';

export interface FindingFilterState {
  severities: Set<Severity>;
  categories: Set<ReviewCategory>;
  confidences: Set<ConfidenceTier>;
  searchQuery: string;
  hideActioned: boolean;
}

export const DEFAULT_FILTERS: FindingFilterState = {
  severities: new Set(['critical', 'warning', 'suggestion', 'nitpick']),
  categories: new Set(),
  confidences: new Set(['high', 'medium', 'low']),
  searchQuery: '',
  hideActioned: false,
};

interface FindingFiltersProps {
  filters: FindingFilterState;
  onChange: (filters: FindingFilterState) => void;
  totalCount: number;
  visibleCount: number;
  availableCategories: ReviewCategory[];
}

const SEVERITY_OPTIONS: { value: Severity; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
  { value: 'warning', label: 'Warning', color: 'bg-yellow-500' },
  { value: 'suggestion', label: 'Suggestion', color: 'bg-blue-500' },
  { value: 'nitpick', label: 'Nitpick', color: 'bg-gray-500' },
];

const CONFIDENCE_OPTIONS: { value: ConfidenceTier; label: string; color: string }[] = [
  { value: 'high', label: 'High', color: 'text-green-400' },
  { value: 'medium', label: 'Med', color: 'text-yellow-400' },
  { value: 'low', label: 'Low', color: 'text-gray-400' },
];

export function FindingFilters({
  filters,
  onChange,
  totalCount,
  visibleCount,
  availableCategories,
}: FindingFiltersProps) {
  const toggleSeverity = (s: Severity) => {
    const next = new Set(filters.severities);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    onChange({ ...filters, severities: next });
  };

  const toggleConfidence = (c: ConfidenceTier) => {
    const next = new Set(filters.confidences);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    onChange({ ...filters, confidences: next });
  };

  const toggleCategory = (c: ReviewCategory) => {
    const next = new Set(filters.categories);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    onChange({ ...filters, categories: next });
  };

  const hasActiveFilters =
    filters.severities.size < 4 ||
    filters.categories.size > 0 ||
    filters.confidences.size < 3 ||
    filters.searchQuery.length > 0 ||
    filters.hideActioned;

  const clearFilters = () => onChange({ ...DEFAULT_FILTERS });

  return (
    <div className="flex flex-wrap items-center gap-3 px-6 py-2 border-b border-border-default bg-surface-1/50">
      {/* Search */}
      <input
        type="text"
        value={filters.searchQuery}
        onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
        placeholder="Search findings..."
        className="bg-surface-0 border border-border-default rounded px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue w-40"
      />

      {/* Severity toggles */}
      <div className="flex items-center gap-1">
        {SEVERITY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => toggleSeverity(opt.value)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs border transition-colors ${
              filters.severities.has(opt.value)
                ? 'border-border-default bg-surface-2 text-text-primary'
                : 'border-transparent bg-surface-0 text-text-muted opacity-50'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${opt.color}`} />
            {opt.label}
          </button>
        ))}
      </div>

      {/* Confidence toggles */}
      <div className="flex items-center gap-1">
        {CONFIDENCE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => toggleConfidence(opt.value)}
            className={`px-2 py-0.5 rounded text-xs border transition-colors ${
              filters.confidences.has(opt.value)
                ? `border-border-default bg-surface-2 ${opt.color}`
                : 'border-transparent bg-surface-0 text-text-muted opacity-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Category dropdown */}
      {availableCategories.length > 0 && (
        <div className="relative group">
          <button className="px-2 py-0.5 rounded text-xs border border-border-default bg-surface-2 text-text-secondary hover:bg-surface-3">
            Categories{filters.categories.size > 0 ? ` (${filters.categories.size})` : ''}
          </button>
          <div className="hidden group-hover:block absolute z-10 top-full left-0 mt-1 bg-surface-2 border border-border-default rounded-md shadow-lg p-2 min-w-[160px] max-h-48 overflow-y-auto">
            {availableCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`block w-full text-left px-2 py-1 rounded text-xs hover:bg-surface-3 ${
                  filters.categories.size === 0 || filters.categories.has(cat)
                    ? 'text-text-primary'
                    : 'text-text-muted'
                }`}
              >
                {filters.categories.has(cat) ? '* ' : '  '}
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hide actioned toggle */}
      <button
        onClick={() => onChange({ ...filters, hideActioned: !filters.hideActioned })}
        className={`px-2 py-0.5 rounded text-xs border transition-colors ${
          filters.hideActioned
            ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
            : 'border-border-default bg-surface-2 text-text-muted'
        }`}
      >
        Hide reviewed
      </button>

      {/* Count and clear */}
      <div className="flex items-center gap-2 ml-auto text-xs text-text-muted">
        <span>
          {visibleCount === totalCount
            ? `${totalCount} findings`
            : `${visibleCount} / ${totalCount} findings`}
        </span>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-accent-blue hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
