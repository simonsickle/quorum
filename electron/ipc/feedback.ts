import { ipcMain, safeStorage } from 'electron';
import crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FeedbackTracker } from '../services/feedback/tracker';
import { FeedbackAnalyzer } from '../services/feedback/analyzer';
import { getDatabase } from '../services/db';

const ENCRYPTED_PREFIX = 'encrypted:';

function decryptKey(encryptedValue: string): string {
  if (encryptedValue.startsWith(ENCRYPTED_PREFIX)) {
    const encrypted = Buffer.from(
      encryptedValue.slice(ENCRYPTED_PREFIX.length),
      'base64'
    );
    return safeStorage.decryptString(encrypted);
  }
  return encryptedValue;
}

function getApiKeyAndModel(db: any): { provider: string; apiKey: string; model: string } | null {
  const rows = db.prepare('SELECT key, value FROM settings').all() as {
    key: string;
    value: string;
  }[];

  const settings: Record<string, any> = {};
  const apiKeys: Record<string, string> = {};

  for (const row of rows) {
    if (row.key.startsWith('apiKey:')) {
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

  const enabledModels = settings.enabledModels || {};

  // Prefer Anthropic, then OpenAI, then Gemini
  for (const provider of ['anthropic', 'openai', 'gemini']) {
    if (enabledModels[provider] && apiKeys[provider]) {
      const modelConfigs = settings.modelConfigs || {};
      const model = modelConfigs[provider]?.model ||
        (provider === 'anthropic' ? 'claude-opus-4-6' :
         provider === 'openai' ? 'gpt-5.3-codex' : 'gemini-3.1-pro-preview');
      return { provider, apiKey: decryptKey(apiKeys[provider]), model };
    }
  }

  return null;
}

async function callAI(
  provider: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  if (provider === 'openai') {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model,
      max_tokens: 2048,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
    });
    return response.choices[0]?.message?.content || '';
  }

  if (provider === 'gemini') {
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model });
    const chat = geminiModel.startChat({
      history: messages.slice(0, -1).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      systemInstruction: systemPrompt,
    });
    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    return result.response.text();
  }

  throw new Error(`Unknown provider: ${provider}`);
}

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
    async (_event, findingId: string, message: string, _preferredModel?: string) => {
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

      // Get chat history for this finding
      const history = db
        .prepare(
          'SELECT role, content FROM chat_messages WHERE finding_id = ? ORDER BY created_at ASC'
        )
        .all(findingId) as { role: string; content: string }[];

      // Get an available AI provider
      const aiConfig = getApiKeyAndModel(db);
      if (!aiConfig) {
        throw new Error('No AI models configured. Please add an API key in Settings.');
      }

      const systemPrompt = `You are an expert code reviewer assistant. The user is asking about a specific finding from an AI code review.

## Finding Context
- **File**: ${finding.file_path}
- **Lines**: ${finding.line_start}–${finding.line_end}
- **Severity**: ${finding.severity}
- **Category**: ${finding.category}
- **Description**: ${finding.description}
- **Suggested Fix**: ${finding.suggested_fix || 'None provided'}
- **Confidence**: ${finding.confidence}
- **Source Models**: ${finding.source_models}

Help the user understand this finding. Be concise and specific. If they ask for alternatives or disagree, engage constructively. You can explain the reasoning, suggest different approaches, or acknowledge if the finding may be a false positive.`;

      // Build conversation messages (exclude the system-level first message context)
      const conversationMessages = history.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await callAI(
        aiConfig.provider,
        aiConfig.apiKey,
        aiConfig.model,
        systemPrompt,
        conversationMessages
      );

      const responseId = crypto.randomUUID();
      db.prepare(
        'INSERT INTO chat_messages (id, finding_id, role, content, model) VALUES (?, ?, ?, ?, ?)'
      ).run(responseId, findingId, 'assistant', response, `${aiConfig.provider}:${aiConfig.model}`);

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
