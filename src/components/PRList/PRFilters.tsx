interface PRFiltersProps {
  filterText: string;
  sortBy: 'updated' | 'created' | 'title';
  onFilterChange: (text: string) => void;
  onSortChange: (sort: 'updated' | 'created' | 'title') => void;
  onRefresh: () => void;
  loading: boolean;
}

export function PRFilters({
  filterText,
  sortBy,
  onFilterChange,
  onSortChange,
  onRefresh,
  loading,
}: PRFiltersProps) {
  return (
    <div className="flex items-center gap-3 p-4 border-b border-border-default bg-surface-1">
      {/* Search */}
      <div className="flex-1 relative">
        <input
          type="text"
          value={filterText}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="Filter PRs by title, repo, or author..."
          className="w-full bg-surface-0 border border-border-default rounded-md px-3 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue"
        />
      </div>

      {/* Sort */}
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value as any)}
        className="bg-surface-0 border border-border-default rounded-md px-2 py-1.5 text-sm text-text-secondary focus:outline-none focus:border-accent-blue"
      >
        <option value="updated">Recently updated</option>
        <option value="created">Newest first</option>
        <option value="title">Title A-Z</option>
      </select>

      {/* Refresh */}
      <button
        onClick={onRefresh}
        disabled={loading}
        className="px-3 py-1.5 rounded-md bg-surface-2 text-text-secondary hover:bg-surface-3 hover:text-text-primary transition-colors text-sm disabled:opacity-50"
      >
        {loading ? '...' : 'Refresh'}
      </button>
    </div>
  );
}
