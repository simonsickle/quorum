import { getDatabase } from '../db';

export interface FeedbackContext {
  prId: string;
  repoName: string;
  filePath: string;
  category: string;
  severity: string;
  confidence: string;
  sourceModels: string[];
  sourceAgents: string[];
  description: string;
  diffContext?: string;
}

export class FeedbackTracker {
  recordAction(
    findingId: string,
    action: 'agree' | 'disagree',
    context: FeedbackContext
  ): void {
    const db = getDatabase();

    // Record the feedback action
    db.prepare(`
      INSERT INTO feedback_actions (finding_id, pr_id, repo_name, action, file_path,
        category, severity, confidence, source_models, source_agents, description, diff_context)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      findingId,
      context.prId,
      context.repoName,
      action,
      context.filePath,
      context.category,
      context.severity,
      context.confidence,
      JSON.stringify(context.sourceModels),
      JSON.stringify(context.sourceAgents),
      context.description,
      context.diffContext || null
    );

    // Update the finding's user_action
    db.prepare(`
      UPDATE review_findings SET user_action = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(action, findingId);
  }

  getActionCounts(repoName: string): {
    total: number;
    agrees: number;
    disagrees: number;
  } {
    const db = getDatabase();
    const row = db
      .prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN action = 'agree' THEN 1 ELSE 0 END) as agrees,
          SUM(CASE WHEN action = 'disagree' THEN 1 ELSE 0 END) as disagrees
        FROM feedback_actions
        WHERE repo_name = ?
      `)
      .get(repoName) as { total: number; agrees: number; disagrees: number };

    return row || { total: 0, agrees: 0, disagrees: 0 };
  }
}
