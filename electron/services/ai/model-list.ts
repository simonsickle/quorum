import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ModelInfo {
  id: string;
  name: string;
}

export async function listAnthropicModels(apiKey: string): Promise<ModelInfo[]> {
  const client = new Anthropic({ apiKey });
  const response = await client.models.list({ limit: 100 });
  return response.data
    .filter((m) => m.type === 'model')
    .map((m) => ({
      id: m.id,
      name: m.display_name ?? m.id,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listOpenAIModels(apiKey: string): Promise<ModelInfo[]> {
  const client = new OpenAI({ apiKey });
  const response = await client.models.list();
  const models: ModelInfo[] = [];
  for await (const model of response) {
    // Filter to chat/completion models, skip embeddings, tts, whisper, dall-e, etc.
    if (
      model.id.startsWith('gpt-') ||
      model.id.startsWith('o') ||
      model.id.startsWith('chatgpt-')
    ) {
      models.push({ id: model.id, name: model.id });
    }
  }
  return models.sort((a, b) => a.name.localeCompare(b.name));
}

export async function listGeminiModels(apiKey: string): Promise<ModelInfo[]> {
  // The @google/generative-ai SDK doesn't expose a listModels method,
  // so we call the REST API directly.
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`
  );
  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }
  const data = (await response.json()) as {
    models: { name: string; displayName: string; supportedGenerationMethods: string[] }[];
  };
  return data.models
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => ({
      id: m.name.replace('models/', ''),
      name: m.displayName,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
