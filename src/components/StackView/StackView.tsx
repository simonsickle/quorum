interface StackNode {
  branch: string;
  prNumber?: number;
  isCurrent: boolean;
}

interface StackViewProps {
  branches: StackNode[];
  isGraphite: boolean;
}

export function StackView({ branches, isGraphite }: StackViewProps) {
  if (branches.length <= 1) return null;

  return (
    <div className="p-3 rounded-md bg-surface-1 border border-border-default">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-text-secondary">
          Stacked PRs {isGraphite && '(Graphite)'}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {branches.map((node, index) => (
          <div key={node.branch} className="flex items-center">
            <div
              className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                node.isCurrent
                  ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/50 font-medium'
                  : 'bg-surface-2 text-text-secondary border border-border-default'
              }`}
              title={`${node.branch}${node.prNumber ? ` (#${node.prNumber})` : ''}`}
            >
              {node.prNumber ? `#${node.prNumber}` : node.branch.slice(0, 20)}
            </div>
            {index < branches.length - 1 && (
              <span className="text-text-muted mx-1">→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
