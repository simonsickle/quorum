import { useState, useMemo } from 'react';
import { ConsensusFinding } from '../../types/review';
import { ReviewItem } from './ReviewItem';

interface DiffFileProps {
  filename: string;
  patch: string;
  status: string;
  additions: number;
  deletions: number;
  findings: ConsensusFinding[];
  onAgree: (findingId: string) => void;
  onDisagree: (findingId: string) => void;
}

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export function DiffFile({
  filename,
  patch,
  status,
  additions,
  deletions,
  findings,
  onAgree,
  onDisagree,
}: DiffFileProps) {
  const [collapsed, setCollapsed] = useState(false);

  const lines = useMemo(() => parsePatch(patch), [patch]);

  // Group findings by line number for inline display
  const findingsByLine = useMemo(() => {
    const map = new Map<number, ConsensusFinding[]>();
    for (const finding of findings) {
      for (let line = finding.lineStart; line <= finding.lineEnd; line++) {
        if (!map.has(line)) map.set(line, []);
      }
      // Show finding after its end line
      const key = finding.lineEnd;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(finding);
    }
    return map;
  }, [findings]);

  const statusIcon =
    status === 'added' ? 'A' : status === 'removed' ? 'D' : status === 'renamed' ? 'R' : 'M';
  const statusColor =
    status === 'added'
      ? 'text-green-400'
      : status === 'removed'
        ? 'text-red-400'
        : 'text-yellow-400';

  return (
    <div className="border border-border-default rounded-md overflow-hidden mb-4">
      {/* File header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-2 bg-surface-2 hover:bg-surface-3 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`text-xs font-mono font-bold ${statusColor}`}>
            {statusIcon}
          </span>
          <span className="text-sm font-mono text-text-primary">{filename}</span>
          {findings.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-accent-orange/20 text-accent-orange">
              {findings.length} finding{findings.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-green-400">+{additions}</span>
          <span className="text-red-400">-{deletions}</span>
          <span className="text-text-muted">{collapsed ? '+' : '-'}</span>
        </div>
      </button>

      {/* Diff content */}
      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <tbody>
              {lines.map((line, index) => {
                const lineNumber = line.newLineNumber || line.oldLineNumber;
                const lineFindingsToShow =
                  lineNumber && line.type !== 'header'
                    ? findingsByLine.get(lineNumber) || []
                    : [];

                return (
                  <tr key={index}>
                    {line.type === 'header' ? (
                      <td
                        colSpan={3}
                        className="px-4 py-1 bg-blue-900/10 text-blue-400 text-xs"
                      >
                        {line.content}
                      </td>
                    ) : (
                      <>
                        <td className="w-12 text-right px-2 py-0.5 select-none text-text-muted border-r border-border-muted bg-surface-1">
                          {line.oldLineNumber || ''}
                        </td>
                        <td className="w-12 text-right px-2 py-0.5 select-none text-text-muted border-r border-border-muted bg-surface-1">
                          {line.newLineNumber || ''}
                        </td>
                        <td
                          className={`px-4 py-0.5 whitespace-pre ${
                            line.type === 'add'
                              ? 'diff-add'
                              : line.type === 'remove'
                                ? 'diff-remove'
                                : ''
                          }`}
                        >
                          <span className={
                            line.type === 'add'
                              ? 'text-green-300'
                              : line.type === 'remove'
                                ? 'text-red-300'
                                : 'text-text-secondary'
                          }>
                            {line.content}
                          </span>

                          {/* Inline findings */}
                          {lineFindingsToShow.length > 0 && (
                            <div className="my-1">
                              {lineFindingsToShow.map((finding) => (
                                <ReviewItem
                                  key={finding.id}
                                  finding={finding}
                                  onAgree={onAgree}
                                  onDisagree={onDisagree}
                                />
                              ))}
                            </div>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function parsePatch(patch: string): DiffLine[] {
  if (!patch) return [];

  const lines: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const rawLine of patch.split('\n')) {
    if (rawLine.startsWith('@@')) {
      const match = rawLine.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1]) - 1;
        newLine = parseInt(match[2]) - 1;
      }
      lines.push({ type: 'header', content: rawLine });
    } else if (rawLine.startsWith('+')) {
      newLine++;
      lines.push({
        type: 'add',
        content: rawLine,
        newLineNumber: newLine,
      });
    } else if (rawLine.startsWith('-')) {
      oldLine++;
      lines.push({
        type: 'remove',
        content: rawLine,
        oldLineNumber: oldLine,
      });
    } else {
      oldLine++;
      newLine++;
      lines.push({
        type: 'context',
        content: rawLine || ' ',
        oldLineNumber: oldLine,
        newLineNumber: newLine,
      });
    }
  }

  return lines;
}
