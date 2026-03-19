import { execSync } from 'child_process';

export interface StackNode {
  branch: string;
  prNumber?: number;
  parent?: string;
  children: string[];
  commitRange: { from: string; to: string };
}

export interface StackInfo {
  id: string;
  branches: StackNode[];
  rootBranch: string;
  isGraphite: boolean;
}

export class StackDetector {
  private hasGraphite: boolean | null = null;

  private checkGraphite(): boolean {
    if (this.hasGraphite !== null) return this.hasGraphite;

    try {
      execSync('gt --version', { stdio: 'pipe' });
      this.hasGraphite = true;
    } catch {
      this.hasGraphite = false;
    }
    return this.hasGraphite;
  }

  async detectStack(repoPath: string, branch: string): Promise<StackInfo | null> {
    // Try Graphite first
    if (this.checkGraphite()) {
      const graphiteStack = this.detectGraphiteStack(repoPath, branch);
      if (graphiteStack) return graphiteStack;
    }

    // Fall back to git topology analysis
    return this.detectGitStack(repoPath, branch);
  }

  private detectGraphiteStack(repoPath: string, branch: string): StackInfo | null {
    try {
      const output = execSync('gt stack --json', {
        cwd: repoPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf-8',
      });

      const stackData = JSON.parse(output);
      if (!stackData || !Array.isArray(stackData.branches)) return null;

      const branches: StackNode[] = stackData.branches.map((b: any) => ({
        branch: b.name,
        prNumber: b.prNumber,
        parent: b.parent,
        children: b.children || [],
        commitRange: {
          from: b.baseCommit || '',
          to: b.headCommit || '',
        },
      }));

      if (branches.length <= 1) return null;

      return {
        id: `graphite-${branch}-${Date.now()}`,
        branches,
        rootBranch: branches[0]?.branch || 'main',
        isGraphite: true,
      };
    } catch {
      return null;
    }
  }

  private detectGitStack(repoPath: string, branch: string): StackInfo | null {
    try {
      // Get the default branch
      const defaultBranch = execSync(
        'git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || echo refs/remotes/origin/main',
        { cwd: repoPath, encoding: 'utf-8' }
      )
        .trim()
        .replace('refs/remotes/origin/', '');

      // Get all branches that share a merge base with this branch
      const mergeBase = execSync(`git merge-base ${defaultBranch} ${branch}`, {
        cwd: repoPath,
        encoding: 'utf-8',
      }).trim();

      // Find branches between merge-base and current branch
      const branchList = execSync(
        `git branch --contains ${mergeBase} --no-contains ${defaultBranch} --format='%(refname:short)'`,
        { cwd: repoPath, encoding: 'utf-8' }
      )
        .trim()
        .split('\n')
        .filter(Boolean);

      if (branchList.length <= 1) return null;

      // Build topology: for each branch, find its parent
      const nodes: StackNode[] = branchList.map((b) => {
        const branchMergeBase = execSync(
          `git merge-base ${defaultBranch} ${b}`,
          { cwd: repoPath, encoding: 'utf-8' }
        ).trim();

        const headCommit = execSync(`git rev-parse ${b}`, {
          cwd: repoPath,
          encoding: 'utf-8',
        }).trim();

        return {
          branch: b,
          children: [],
          commitRange: { from: branchMergeBase, to: headCommit },
        };
      });

      // Sort by commit distance from merge base to establish parent-child
      const sortedNodes = nodes.sort((a, b) => {
        const aCount = parseInt(
          execSync(
            `git rev-list --count ${a.commitRange.from}..${a.commitRange.to}`,
            { cwd: repoPath, encoding: 'utf-8' }
          ).trim()
        );
        const bCount = parseInt(
          execSync(
            `git rev-list --count ${b.commitRange.from}..${b.commitRange.to}`,
            { cwd: repoPath, encoding: 'utf-8' }
          ).trim()
        );
        return aCount - bCount;
      });

      // Establish parent-child relationships
      for (let i = 1; i < sortedNodes.length; i++) {
        sortedNodes[i].parent = sortedNodes[i - 1].branch;
        sortedNodes[i - 1].children.push(sortedNodes[i].branch);
      }

      return {
        id: `git-${branch}-${Date.now()}`,
        branches: sortedNodes,
        rootBranch: defaultBranch,
        isGraphite: false,
      };
    } catch {
      return null;
    }
  }
}
