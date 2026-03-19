import { ipcMain, BrowserWindow } from 'electron';
import { ReviewOrchestrator } from '../services/ai/orchestrator';
import { getDatabase } from '../services/db';

let activeOrchestrator: ReviewOrchestrator | null = null;

export function registerReviewHandlers(
  getWindow: () => BrowserWindow | null
): void {
  ipcMain.handle('reviews:run', async (_event, prId: string) => {
    const db = getDatabase();
    const window = getWindow();

    // Get PR data from cache
    const pr = db
      .prepare('SELECT raw_data FROM pull_requests WHERE id = ?')
      .get(prId) as { raw_data: string } | undefined;

    if (!pr) throw new Error(`PR not found: ${prId}`);

    const prData = JSON.parse(pr.raw_data);

    // Get enabled API keys
    const apiKeys: Record<string, string> = {};
    const settings: Record<string, any> = {};

    const rows = db.prepare('SELECT key, value FROM settings').all() as {
      key: string;
      value: string;
    }[];

    for (const row of rows) {
      if (row.key.startsWith('apiKey:')) {
        // Keys are encrypted, will be decrypted by the provider
        const provider = row.key.replace('apiKey:', '');
        apiKeys[provider] = row.value;
      } else {
        try {
          settings[row.key] = JSON.parse(row.value);
        } catch {
          settings[row.key] = row.value;
        }
      }
    }

    // Create orchestrator
    activeOrchestrator = new ReviewOrchestrator({
      apiKeys,
      settings,
      onProgress: (progress) => {
        window?.webContents.send('reviews:progress', progress);
      },
    });

    try {
      const result = await activeOrchestrator.runReview(prData);

      // Save results to database
      db.prepare(`
        INSERT INTO review_results (id, pr_id, models_used, agents_used, total_findings,
          high_confidence_count, medium_confidence_count, low_confidence_count,
          duration_ms, started_at, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        result.id, prId,
        JSON.stringify(result.modelsUsed),
        JSON.stringify(result.agentsUsed),
        result.totalFindings,
        result.highConfidenceCount,
        result.mediumConfidenceCount,
        result.lowConfidenceCount,
        result.durationMs,
        result.startedAt,
        result.completedAt
      );

      // Save individual findings
      const insertFinding = db.prepare(`
        INSERT INTO review_findings (id, review_id, pr_id, file_path, line_start, line_end,
          severity, category, description, suggested_fix, confidence,
          source_models, source_agents, original_findings)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const saveFindingsTransaction = db.transaction((findings: any[]) => {
        for (const finding of findings) {
          insertFinding.run(
            finding.id, result.id, prId,
            finding.filePath, finding.lineStart, finding.lineEnd,
            finding.severity, finding.category,
            finding.description, finding.suggestedFix,
            finding.confidence,
            JSON.stringify(finding.sourceModels),
            JSON.stringify(finding.sourceAgents),
            JSON.stringify(finding.originalFindings)
          );
        }
      });

      saveFindingsTransaction(result.findings);
      return result;
    } finally {
      activeOrchestrator = null;
    }
  });

  ipcMain.handle('reviews:get-results', async (_event, prId: string) => {
    const db = getDatabase();

    const review = db
      .prepare(
        'SELECT * FROM review_results WHERE pr_id = ? ORDER BY created_at DESC LIMIT 1'
      )
      .get(prId) as any;

    if (!review) return null;

    const findings = db
      .prepare('SELECT * FROM review_findings WHERE review_id = ? ORDER BY confidence DESC, severity ASC')
      .all(review.id) as any[];

    return {
      ...review,
      modelsUsed: JSON.parse(review.models_used),
      agentsUsed: JSON.parse(review.agents_used),
      findings: findings.map((f) => ({
        ...f,
        sourceModels: JSON.parse(f.source_models),
        sourceAgents: JSON.parse(f.source_agents),
        originalFindings: f.original_findings
          ? JSON.parse(f.original_findings)
          : [],
      })),
    };
  });

  ipcMain.on('reviews:cancel', () => {
    if (activeOrchestrator) {
      activeOrchestrator.cancel();
      activeOrchestrator = null;
    }
  });
}
