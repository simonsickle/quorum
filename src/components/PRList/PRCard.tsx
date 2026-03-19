import { PullRequest } from '../../types/github';

interface PRCardProps {
  pr: PullRequest;
  onClick: () => void;
  isSelected: boolean;
}

export function PRCard({ pr, onClick, isSelected }: PRCardProps) {
  const timeSince = getTimeSince(pr.updatedAt);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 border-b border-border-muted transition-colors
        ${isSelected ? 'bg-surface-2 border-l-2 border-l-accent-blue' : 'hover:bg-surface-1'}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Repo name */}
          <div className="text-xs text-text-muted mb-1 truncate">
            {pr.repository.nameWithOwner}
          </div>

          {/* PR title */}
          <div className="text-sm font-medium text-text-primary truncate">
            {pr.title}
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
            <span>#{pr.number}</span>
            <span className="flex items-center gap-1">
              <img
                src={pr.author.avatarUrl}
                alt={pr.author.login}
                className="w-4 h-4 rounded-full"
              />
              {pr.author.login}
            </span>
            <span>{timeSince}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-400">+{pr.additions}</span>
            <span className="text-red-400">-{pr.deletions}</span>
          </div>
          <div className="text-xs text-text-muted">
            {pr.changedFiles} file{pr.changedFiles !== 1 ? 's' : ''}
          </div>
          {pr.isDraft && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-surface-3 text-text-muted">
              Draft
            </span>
          )}
          {pr.reviewDecision && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${
                pr.reviewDecision === 'APPROVED'
                  ? 'bg-green-900/30 text-green-400'
                  : pr.reviewDecision === 'CHANGES_REQUESTED'
                    ? 'bg-red-900/30 text-red-400'
                    : 'bg-yellow-900/30 text-yellow-400'
              }`}
            >
              {pr.reviewDecision === 'APPROVED'
                ? 'Approved'
                : pr.reviewDecision === 'CHANGES_REQUESTED'
                  ? 'Changes'
                  : 'Pending'}
            </span>
          )}
        </div>
      </div>

      {/* Labels */}
      {pr.labels.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {pr.labels.map((label) => (
            <span
              key={label.name}
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `#${label.color}20`,
                color: `#${label.color}`,
                border: `1px solid #${label.color}40`,
              }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

function getTimeSince(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}
