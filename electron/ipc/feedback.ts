import { ipcMain } from 'electron';
import crypto from 'crypto';
import { FeedbackTracker } from '../services/feedback/tracker';
import { FeedbackAnalyzer } from '../services/feedback/analyzer';
import { getDatabase } from '../services/db';

export function registerFeedbackHandlers(): void {
  const tracker = new FeedbackTracker();
  const analyzer = new FeedbackAnalyzer();

  ipcMain.handle(
    'feedback:record',
    async (_event, findingId: string, action: 'agree' | 'disagree', context: any) => {
      tracker.recordAction(findingId, action, context);
    }
  );

  ipcMain.handle('feedback:analytics', async (_event, repoName: string) => {
    return analyzer.getAnalytics(repoName);
  });

  ipcMain.handle('feedback:suggested-rules', async (_event, repoName: string) => {
    return analyzer.getSuggestedRules(repoName);
  });

  // Chat handlers
  ipcMain.handle(
    'chat:send',
    async (_event, findingId: string, message: string, model?: string) => {
      const db = getDatabase();
      const id = crypto.randomUUID();

      // Save user message
      db.prepare(
        'INSERT INTO chat_messages (id, finding_id, role, content) VALUES (?, ?, ?, ?)'
      ).run(id, findingId, 'user', message);

      // Get finding context
      const finding = db
        .prepare('SELECT * FROM review_findings WHERE id = ?')
        .get(findingId) as any;

      if (!finding) throw new Error('Finding not found');

      // For now, return a placeholder. The actual model call would go through
      // the appropriate provider based on settings.
      const responseId = crypto.randomUUID();
      const response = `I'll help you understand this finding about ${finding.category} in ${finding.file_path}. The suggestion was: ${finding.description}`;

      db.prepare(
        'INSERT INTO chat_messages (id, finding_id, role, content, model) VALUES (?, ?, ?, ?, ?)'
      ).run(responseId, findingId, 'assistant', response, model || 'default');

      return response;
    }
  );

  ipcMain.handle('chat:history', async (_event, findingId: string) => {
    const db = getDatabase();
    return db
      .prepare(
        'SELECT * FROM chat_messages WHERE finding_id = ? ORDER BY created_at ASC'
      )
      .all(findingId);
  });
}
