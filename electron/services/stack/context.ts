import { execSync } from 'child_process';
import { StackDetector, StackInfo } from './detector';

export class StackContextBuilder {
  private detector = new StackDetector();

  async buildContext(
    repoPath: string,
    stackId: string
  ): Promise<{ context: string; currentPosition: number; totalInStack: number } | null> {
    // Re-detect the stack to get fresh info
    // stackId format: "graphite-branchName-timestamp" or "git-branchName-timestamp"
    const parts = stackId.split('-');
    const branch = parts.slice(1, -1).join('-');

    const stack = await this.detector.detectStack(repoPath, branch);
    if (!stack) return null;

    return this.buildStackContext(repoPath, stack, branch);
  }

  buildStackContext(
    repoPath: string,
    stack: StackInfo,
    currentBranch: string
  ): { context: string; currentPosition: number; totalInStack: number } {
    const currentIndex = stack.branches.findIndex(
      (b) => b.branch === currentBranch
    );

    const contextParts: string[] = [];
    contextParts.push(
      `This PR is part of a stack of ${stack.branches.length} PRs${stack.isGraphite ? ' (managed by Graphite)' : ''}.`
    );
    contextParts.push(`Current PR position: ${currentIndex + 1} of ${stack.branches.length}`);
    contextParts.push('');

    // Add context from parent PRs (above in the stack)
    for (let i = 0; i < stack.branches.length; i++) {
      const node = stack.branches[i];
      const isCurrent = node.branch === currentBranch;
      const marker = isCurrent ? ' ← CURRENT PR (review this one)' : '';

      contextParts.push(`### ${i + 1}. ${node.branch}${marker}`);

      if (!isCurrent) {
        // Get a summary of changes in this branch
        try {
          const diffStat = execSync(
            `git diff --stat ${node.commitRange.from}..${node.commitRange.to}`,
            { cwd: repoPath, encoding: 'utf-8' }
          ).trim();

          contextParts.push('```');
          contextParts.push(diffStat);
          contextParts.push('```');

          // Get commit messages for context
          const commits = execSync(
            `git log --oneline ${node.commitRange.from}..${node.commitRange.to}`,
            { cwd: repoPath, encoding: 'utf-8' }
          ).trim();

          if (commits) {
            contextParts.push('Commits:');
            contextParts.push(commits);
          }
        } catch {
          contextParts.push('(unable to get diff for this branch)');
        }
      }

      contextParts.push('');
    }

    contextParts.push(
      'IMPORTANT: Only comment on changes in the CURRENT PR. Use the stack context for understanding only.'
    );

    return {
      context: contextParts.join('\n'),
      currentPosition: currentIndex + 1,
      totalInStack: stack.branches.length,
    };
  }
}
