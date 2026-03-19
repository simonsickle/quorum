import { GitHubClient } from './client';
import { ConsensusFinding } from '../../services/types';

export interface ReviewSubmission {
  owner: string;
  repo: string;
  prNumber: number;
  findings: ConsensusFinding[];
  summaryBody: string;
}

export async function submitAIReview(
  client: GitHubClient,
  submission: ReviewSubmission
): Promise<void> {
  const comments = submission.findings
    .filter((f) => f.userAction === 'agree')
    .map((finding) => {
      const severityEmoji = {
        critical: '🔴',
        warning: '🟡',
        suggestion: '🔵',
        nitpick: '⚪',
      }[finding.severity];

      const confidenceLabel =
        finding.confidence === 'high'
          ? '**High Confidence** (flagged by multiple models)'
          : finding.confidence === 'medium'
            ? 'Medium Confidence'
            : 'Low Confidence';

      const body = [
        `${severityEmoji} **${finding.category}** — ${confidenceLabel}`,
        '',
        finding.description,
        '',
        '**Suggested fix:**',
        '```suggestion',
        finding.suggestedFix,
        '```',
        '',
        `_AI Review • Sources: ${finding.sourceModels.join(', ')} • Agents: ${finding.sourceAgents.join(', ')}_`,
      ].join('\n');

      return {
        path: finding.filePath,
        line: finding.lineEnd,
        side: 'RIGHT' as const,
        body,
        ...(finding.lineStart !== finding.lineEnd
          ? { start_line: finding.lineStart, start_side: 'RIGHT' as const }
          : {}),
      };
    });

  if (comments.length === 0) return;

  await client.submitReview({
    owner: submission.owner,
    repo: submission.repo,
    prNumber: submission.prNumber,
    event: 'COMMENT',
    body: submission.summaryBody,
    comments,
  });
}
