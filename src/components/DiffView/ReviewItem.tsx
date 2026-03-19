import { useState } from 'react';
import { ConsensusFinding } from '../../types/review';
import { ReviewActions } from './ReviewActions';
import { ChatThread } from './ChatThread';

interface ReviewItemProps {
  finding: ConsensusFinding;
  onAgree: (findingId: string) => void;
  onDisagree: (findingId: string) => void;
}

const SEVERITY_COLORS = {
  critical: { bg: 'bg-red-900/20', border: 'border-red-700/50', text: 'text-red-400', dot: 'bg-red-500' },
  warning: { bg: 'bg-yellow-900/20', border: 'border-yellow-700/50', text: 'text-yellow-400', dot: 'bg-yellow-500' },
  suggestion: { bg: 'bg-blue-900/20', border: 'border-blue-700/50', text: 'text-blue-400', dot: 'bg-blue-500' },
  nitpick: { bg: 'bg-gray-800/40', border: 'border-gray-600/50', text: 'text-gray-400', dot: 'bg-gray-500' },
};

const CONFIDENCE_BADGES = {
  high: { label: 'High Confidence', style: 'bg-green-900/30 text-green-400 border-green-700/50' },
  medium: { label: 'Medium', style: 'bg-yellow-900/30 text-yellow-400 border-yellow-700/50' },
  low: { label: 'Low', style: 'bg-gray-800/40 text-gray-400 border-gray-600/50' },
};

export function ReviewItem({ finding, onAgree, onDisagree }: ReviewItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const colors = SEVERITY_COLORS[finding.severity];
  const confidence = CONFIDENCE_BADGES[finding.confidence];

  const isDismissed = finding.userAction === 'disagree';

  return (
    <div
      className={`${colors.bg} border ${colors.border} rounded-md p-3 my-2 transition-opacity ${
        isDismissed ? 'opacity-40' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
          <span className={`text-xs font-medium ${colors.text} uppercase`}>
            {finding.severity}
          </span>
          <span className="text-xs text-text-muted">{finding.category}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded border ${confidence.style}`}>
            {confidence.label}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-text-muted shrink-0">
          {finding.sourceModels.map((m) => (
            <span
              key={m}
              className="px-1.5 py-0.5 rounded bg-surface-3 text-text-secondary"
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-text-primary mt-2">{finding.description}</p>

      {/* Suggested fix (collapsible) */}
      {finding.suggestedFix && (
        <div className="mt-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-accent-blue hover:text-accent-blue/80 transition-colors"
          >
            {expanded ? 'Hide' : 'Show'} suggested fix
          </button>
          {expanded && (
            <pre className="mt-1 p-2 rounded bg-surface-0 border border-border-default text-xs font-mono text-text-secondary overflow-x-auto">
              {finding.suggestedFix}
            </pre>
          )}
        </div>
      )}

      {/* Actions */}
      <ReviewActions
        findingId={finding.id}
        userAction={finding.userAction}
        onAgree={onAgree}
        onDisagree={onDisagree}
        onChat={() => setChatOpen(!chatOpen)}
      />

      {/* Chat thread */}
      {chatOpen && (
        <ChatThread findingId={finding.id} onClose={() => setChatOpen(false)} />
      )}
    </div>
  );
}
