import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, PRContext, ReviewFinding, SubAgentRole } from '../../types';
import { SYSTEM_PROMPT } from '../prompts';
import { SkillRegistry } from '../skills/registry';
import crypto from 'crypto';

const MAX_TOOL_ROUNDS = 5;

export class AnthropicProvider implements AIProvider {
  name = 'anthropic' as const;
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-sonnet-4-20250514') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async review(
    context: PRContext,
    agentRole: SubAgentRole,
    prompt: string
  ): Promise<ReviewFinding[]> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    return this.parseFindings(text, agentRole);
  }

  async reviewWithTools(
    context: PRContext,
    agentRole: SubAgentRole,
    prompt: string,
    skillRegistry: SkillRegistry
  ): Promise<ReviewFinding[]> {
    const tools: Anthropic.Tool[] = skillRegistry.getSkillDefinitions().map((skill) => ({
      name: skill.name,
      description: skill.description,
      input_schema: {
        type: 'object' as const,
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
    }));

    let messages: Anthropic.MessageParam[] = [
      { role: 'user', content: prompt },
    ];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        tools,
        messages,
      });

      // Check if the model wants to use tools
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
        // No more tool calls, extract the text response
        const textBlock = response.content.find(
          (block): block is Anthropic.TextBlock => block.type === 'text'
        );
        return this.parseFindings(textBlock?.text || '', agentRole);
      }

      // Execute tool calls and add results
      messages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        const result = await skillRegistry.executeSkill(
          toolUse.name,
          toolUse.input as Record<string, unknown>
        );
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result.error ? `Error: ${result.error}` : result.content,
        });
      }

      messages.push({ role: 'user', content: toolResults });
    }

    // If we exhausted rounds, return empty
    console.warn(`Anthropic provider exhausted ${MAX_TOOL_ROUNDS} tool rounds for ${agentRole}`);
    return [];
  }

  private parseFindings(text: string, agentRole: SubAgentRole): ReviewFinding[] {
    try {
      // Try to extract JSON from the response
      let jsonStr = text.trim();

      // Handle cases where the model wraps JSON in markdown code fences
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
        modelSource: 'anthropic',
        subAgentSource: agentRole,
      }));
    } catch (error) {
      console.error('Failed to parse Anthropic response:', error);
      return [];
    }
  }
}
