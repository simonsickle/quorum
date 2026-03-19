import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { useReview } from '../../hooks/useReview';
import { DiffFile } from './DiffFile';
import { PRFile } from '../../types/github';

export function DiffView() {
  const { prId } = useParams<{ prId: string }>();
  const navigate = useNavigate();
  const decodedPrId = prId ? decodeURIComponent(prId) : '';

  const { selectedPR } = useStore();
  const {
    review,
    progress,
    running,
    error,
    startReview,
    cancelReview,
    handleAgree,
    handleDisagree,
  } = useReview(decodedPrId);

  const [files, setFiles] = useState<PRFile[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch diff data
  useEffect(() => {
    if (!selectedPR) return;

    const [owner, repo] = selectedPR.repository.nameWithOwner.split('/');

    async function fetchDiff() {
      setLoading(true);
      try {
        const diff = await window.electronAPI.github.fetchPRDiff(
          owner,
          repo,
          selectedPR!.number
        );
        setFiles(diff.files);
      } catch (err) {
        console.error('Failed to fetch diff:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDiff();
  }, [selectedPR]);

  // Group findings by file
  const findingsByFile = useMemo(() => {
    if (!review?.findings) return new Map();
    const map = new Map<string, typeof review.findings>();
    for (const finding of review.findings) {
      if (!map.has(finding.filePath)) map.set(finding.filePath, []);
      map.get(finding.filePath)!.push(finding);
    }
    return map;
  }, [review]);

  // Count agreed findings for submit button
  const agreedCount = review?.findings.filter((f) => f.userAction === 'agree').length || 0;

  const handleSubmitToGitHub = async () => {
    if (!selectedPR || agreedCount === 0) return;

    const [owner, repo] = selectedPR.repository.nameWithOwner.split('/');
    const agreedFindings = review!.findings.filter((f) => f.userAction === 'agree');

    const comments = agreedFindings.map((f) => ({
      path: f.filePath,
      line: f.lineEnd,
      side: 'RIGHT' as const,
      body: `**${f.severity.toUpperCase()}** (${f.category}) — ${f.confidence} confidence\n\n${f.description}\n\n**Suggested fix:**\n\`\`\`suggestion\n${f.suggestedFix}\n\`\`\`\n\n_AI Review | Sources: ${f.sourceModels.join(', ')}_`,
    }));

    try {
      await window.electronAPI.github.submitReview({
        owner,
        repo,
        prNumber: selectedPR.number,
        event: 'COMMENT',
        body: `AI Code Review: ${agreedFindings.length} item(s) flagged`,
        comments,
      });
      alert('Review submitted to GitHub!');
    } catch (err: any) {
      alert(`Failed to submit: ${err.message}`);
    }
  };

  if (!selectedPR) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        <div className="text-center">
          <p>No PR selected</p>
          <button
            onClick={() => navigate('/')}
            className="mt-2 text-accent-blue hover:underline text-sm"
          >
            Go back to PR list
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* PR Header */}
      <div className="px-6 py-4 border-b border-border-default bg-surface-1">
        <div className="flex items-start justify-between">
          <div>
            <button
              onClick={() => navigate('/')}
              className="text-xs text-text-muted hover:text-text-secondary mb-1"
            >
              ← Back to reviews
            </button>
            <h1 className="text-lg font-semibold text-text-primary">
              {selectedPR.title}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-text-secondary">
              <span>{selectedPR.repository.nameWithOwner}</span>
              <span>#{selectedPR.number}</span>
              <span>{selectedPR.author.login}</span>
              <span className="text-green-400">+{selectedPR.additions}</span>
              <span className="text-red-400">-{selectedPR.deletions}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Review controls */}
            {running ? (
              <button
                onClick={cancelReview}
                className="px-4 py-2 rounded-md bg-red-900/30 text-red-400 border border-red-700/50 hover:bg-red-800/40 text-sm"
              >
                Cancel Review
              </button>
            ) : (
              <button
                onClick={startReview}
                className="px-4 py-2 rounded-md bg-accent-blue text-white hover:bg-accent-blue/80 text-sm font-medium"
              >
                Run AI Review
              </button>
            )}

            {agreedCount > 0 && (
              <button
                onClick={handleSubmitToGitHub}
                className="px-4 py-2 rounded-md bg-green-700 text-white hover:bg-green-600 text-sm font-medium"
              >
                Submit {agreedCount} to GitHub
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {progress && running && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
              <span>{progress.message}</span>
              <span>{progress.percent}%</span>
            </div>
            <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-blue rounded-full transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Review summary */}
        {review && !running && (
          <div className="flex items-center gap-4 mt-3 text-xs text-text-secondary">
            <span>{review.totalFindings} finding(s)</span>
            {review.highConfidenceCount > 0 && (
              <span className="text-green-400">
                {review.highConfidenceCount} high confidence
              </span>
            )}
            {review.mediumConfidenceCount > 0 && (
              <span className="text-yellow-400">
                {review.mediumConfidenceCount} medium
              </span>
            )}
            {review.lowConfidenceCount > 0 && (
              <span className="text-gray-400">
                {review.lowConfidenceCount} low
              </span>
            )}
            <span>
              Models: {review.modelsUsed?.join(', ')}
            </span>
            <span>
              {((review.durationMs || 0) / 1000).toFixed(1)}s
            </span>
          </div>
        )}

        {error && (
          <div className="mt-3 p-2 rounded bg-red-900/20 border border-red-800/50 text-red-400 text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Diff files */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-text-muted text-sm text-center py-12">
            Loading diff...
          </div>
        ) : (
          files.map((file) => (
            <DiffFile
              key={file.filename}
              filename={file.filename}
              patch={file.patch}
              status={file.status}
              additions={file.additions}
              deletions={file.deletions}
              findings={findingsByFile.get(file.filename) || []}
              onAgree={handleAgree}
              onDisagree={handleDisagree}
            />
          ))
        )}
      </div>
    </div>
  );
}
