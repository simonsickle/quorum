import { useState, useEffect } from 'react';
import { useStore } from '../../store';

interface ReviewSummary {
  id: string;
  pr_id: string;
  total_findings: number;
  high_confidence_count: number;
  medium_confidence_count: number;
  low_confidence_count: number;
  models_used: string;
  agents_used: string;
  duration_ms: number;
  started_at: string;
  completed_at: string;
  created_at: string;
}

interface ReviewHistoryProps {
  prId: string;
  onClose: () => void;
}

export function ReviewHistory({ prId, onClose }: ReviewHistoryProps) {
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { loadSpecificReview } = useStore();

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        const history = await window.electronAPI.reviews.getReviewHistory(prId);
        setReviews(history);
      } catch (err) {
        console.error('Failed to fetch review history:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [prId]);

  const handleLoadReview = async (reviewId: string) => {
    await loadSpecificReview(reviewId);
    onClose();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="border-b border-border-default bg-surface-1/80">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-text-primary">Review History</h3>
          <button
            onClick={onClose}
            className="text-xs text-text-muted hover:text-text-secondary"
          >
            Close
          </button>
        </div>

        {loading ? (
          <div className="text-xs text-text-muted py-2">Loading history...</div>
        ) : reviews.length === 0 ? (
          <div className="text-xs text-text-muted py-2">No previous reviews found.</div>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {reviews.map((rev, index) => {
              const models = JSON.parse(rev.models_used);
              return (
                <button
                  key={rev.id}
                  onClick={() => handleLoadReview(rev.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs hover:bg-surface-3 transition-colors ${
                    index === 0 ? 'bg-surface-2 border border-border-default' : 'bg-surface-1'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-text-secondary font-medium">
                      {formatDate(rev.started_at)}
                    </span>
                    <span className="text-text-muted">
                      {rev.total_findings} findings
                    </span>
                    {rev.high_confidence_count > 0 && (
                      <span className="text-green-400">
                        {rev.high_confidence_count} high
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {models.map((m: string) => (
                      <span
                        key={m}
                        className="px-1.5 py-0.5 rounded bg-surface-3 text-text-muted"
                      >
                        {m}
                      </span>
                    ))}
                    <span className="text-text-muted">
                      {(rev.duration_ms / 1000).toFixed(1)}s
                    </span>
                    {index === 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-accent-blue/20 text-accent-blue">
                        latest
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
