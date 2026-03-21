import OpenAI from 'openai';
import { AIProvider, PRContext, ReviewFinding, SubAgentRole } from '../../types';
import { SYSTEM_PROMPT } from '../prompts';
import { SkillRegistry } from '../skills/registry';
import crypto from 'crypto';

const MAX_TOOL_ROUNDS = 5;

export class OpenAIProvider implements AIProvider {
  name = 'openai' as const;
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4o') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async review(
    context: PRContext,
    agentRole: SubAgentRole,
    prompt: string
  ): Promise<ReviewFinding[]> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 8192,
      temperature: 0.1,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    });

    const text = response.choices[0]?.message?.content || '';
    return this.parseFindings(text, agentRole);
  }

  async reviewWithTools(
    context: PRContext,
    agentRole: SubAgentRole,
    prompt: string,
    skillRegistry: SkillRegistry
  ): Promise<ReviewFinding[]> {
    const tools: OpenAI.ChatCompletionTool[] = skillRegistry.getSkillDefinitions().map((skill) => ({
      type: 'function' as const,
      function: {
        name: skill.name,
        description: skill.description,
        parameters: {
          type: 'object',
          properties: Object.fromEntries(
            Object.entries(skill.parameters).map(([name, param]) => [
              name,
              { type: param.type, description: param.description },
            ])
          ),
          required: Object.entries(skill.parameters)
            .filter(([_, param]) => param.required)
            .map(([name]) => name),
        },
      },
    }));

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 8192,
        temperature: 0.1,
        tools,
        messages,
      });

      const choice = response.choices[0];
      if (!choice) return [];

      const toolCalls = choice.message.tool_calls;

      if (!toolCalls || toolCalls.length === 0 || choice.finish_reason === 'stop') {
        return this.parseFindings(choice.message.content || '', agentRole);
      }

      // Add assistant message with tool calls
      messages.push(choice.message);

      // Execute tool calls and add results
      for (const toolCall of toolCalls) {
        const args = JSON.parse(toolCall.function.arguments || '{}');
        const result = await skillRegistry.executeSkill(toolCall.function.name, args);

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result.error ? `Error: ${result.error}` : result.content,
        });
      }
    }

    console.warn(`OpenAI provider exhausted ${MAX_TOOL_ROUNDS} tool rounds for ${agentRole}`);
    return [];
  }

  private parseFindings(text: string, agentRole: SubAgentRole): ReviewFinding[] {
    try {
      let jsonStr = text.trim();

      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const findings = JSON.parse(jsonStr);
      if (!Array.isArray(findings)) return [];

      return findings.map((f: any) => ({
        id: crypto.randomUUID(),
        filePath: f.filePath || '',
        lineStart: Number(f.lineStart) || 0,
        lineEnd: Number(f.lineEnd) || f.lineStart || 0,
        severity: f.severity || 'suggestion',
        category: f.category || 'other',
        description: f.description || '',
        suggestedFix: f.suggestedFix || '',
        modelSource: 'openai',
        subAgentSource: agentRole,
      }));
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      return [];
    }
  }
}
