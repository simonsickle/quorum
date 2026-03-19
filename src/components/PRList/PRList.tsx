import { useNavigate } from 'react-router-dom';
import { useGitHub } from '../../hooks/useGitHub';
import { PRCard } from './PRCard';
import { PRFilters } from './PRFilters';

export function PRList() {
  const navigate = useNavigate();
  const {
    pullRequests,
    selectedPR,
    loading,
    error,
    filterText,
    sortBy,
    selectPR,
    setFilter,
    setSortBy,
    refresh,
  } = useGitHub();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-default">
        <h1 className="text-lg font-semibold text-text-primary">
          Pending Reviews
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {pullRequests.length} PR{pullRequests.length !== 1 ? 's' : ''} awaiting your review
        </p>
      </div>

      {/* Filters */}
      <PRFilters
        filterText={filterText}
        sortBy={sortBy}
        onFilterChange={setFilter}
        onSortChange={setSortBy}
        onRefresh={refresh}
        loading={loading}
      />

      {/* Error state */}
      {error && (
        <div className="m-4 p-3 rounded-md bg-red-900/20 border border-red-800/50 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* PR List */}
      <div className="flex-1 overflow-y-auto">
        {loading && pullRequests.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-text-muted text-sm">
            Loading pull requests...
          </div>
        ) : pullRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-text-muted">
            <p className="text-lg mb-2">No pending reviews</p>
            <p className="text-sm">
              {filterText
                ? 'Try adjusting your filters'
                : 'You\'re all caught up! Check back later.'}
            </p>
          </div>
        ) : (
          pullRequests.map((pr) => (
            <PRCard
              key={pr.id}
              pr={pr}
              isSelected={selectedPR?.id === pr.id}
              onClick={() => {
                selectPR(pr);
                navigate(`/review/${encodeURIComponent(pr.id)}`);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
