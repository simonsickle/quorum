import { SubAgentRole } from '../types';

export const REVIEW_OUTPUT_SCHEMA = `
You MUST respond with a valid JSON array of findings. Each finding must match this schema:
{
  "filePath": "string - the file path relative to repo root",
  "lineStart": "number - start line of the issue",
  "lineEnd": "number - end line of the issue",
  "severity": "one of: critical, warning, suggestion, nitpick",
  "category": "one of: architecture, bug, performance, security, style, naming, error-handling, testing, documentation, brand-tone, grammar, license, design, accessibility, other",
  "description": "string - clear explanation of the issue",
  "suggestedFix": "string - the corrected code or fix description"
}

Rules:
- Only report real issues, not style preferences unless they violate repo rules
- Be specific about line numbers
- Provide actionable suggested fixes with actual code when possible
- Do NOT report issues outside the diff being reviewed
- If there are no issues, return an empty array: []
`;

export const SYSTEM_PROMPT = `You are an expert code reviewer. You will be given a pull request diff, file contents, and repository-specific rules. Your job is to identify real issues and provide actionable feedback.

Be thorough but not pedantic. Focus on issues that matter: bugs, security holes, performance problems, and violations of the project's established patterns and rules.`;

export function getRepoRulesContext(rules: { source: string; content: string }[]): string {
  if (rules.length === 0) return '';

  return `
## Repository Rules and Guidelines
The following rules have been defined for this repository. Your review MUST check for compliance with these rules:

${rules.map((r) => `### From ${r.source}:\n${r.content}`).join('\n\n')}
`;
}

export function getStackContext(stackContext?: string): string {
  if (!stackContext) return '';

  return `
## Stacked PR Context
This PR is part of a stack. Below is context from other PRs in the stack. Use this to understand the broader changes, but ONLY comment on code in the current PR's diff.

${stackContext}
`;
}

export function getSubAgentPrompt(role: SubAgentRole): string {
  const prompts: Record<SubAgentRole, string> = {
    'tech-lead': `You are a Tech Lead reviewer. Focus on:
- **Architecture**: Is the code well-structured? Does it follow established patterns?
- **Separation of concerns**: Are responsibilities properly divided?
- **API design**: Are interfaces clean and well-documented?
- **Scalability**: Will this approach scale? Are there design limitations?
- **Dependencies**: Are new dependencies justified? Any security concerns?
- **Code organization**: Is the code in the right place? Should it be refactored?

Ignore minor style issues unless they impact readability significantly. Focus on the big picture.`,

    'senior-engineer': `You are a Senior Engineer reviewer. Focus on:
- **Bugs**: Logic errors, off-by-one errors, null/undefined handling, race conditions
- **Performance**: N+1 queries, unnecessary re-renders, memory leaks, inefficient algorithms
- **Error handling**: Missing try/catch, unhandled promise rejections, poor error messages
- **Idiomatic code**: Language-specific best practices and conventions
- **Edge cases**: Boundary conditions, empty inputs, concurrent access
- **Type safety**: Missing types, incorrect types, unsafe casts
- **Security**: Input validation, injection vulnerabilities, exposed secrets

Be precise. Point to specific lines and explain the concrete problem.`,

    'copyright-tone': `You are a Brand & Compliance reviewer. Focus on:
- **Brand tone**: User-facing strings should match the project's established voice
- **Grammar & spelling**: Fix typos, grammatical errors in comments, docs, and UI strings
- **License headers**: Check that new files have proper license headers if the repo uses them
- **Copyright notices**: Verify copyright information is correct and up to date
- **Inclusive language**: Flag non-inclusive terminology
- **Documentation quality**: Are comments helpful? Are complex algorithms explained?
- **Changelog/docs**: Should this change update documentation?

Only flag issues where there's a clear standard being violated or a real problem.`,

    'design-review': `You are a Design reviewer specializing in UI/UX. Focus on:
- **Visual consistency**: Do new components match existing design patterns?
- **Snapshot changes**: Are visual changes intentional and correct?
- **Accessibility**: ARIA labels, keyboard navigation, color contrast
- **Responsive design**: Does the UI work across screen sizes?
- **User experience**: Are interactions intuitive? Are loading/error states handled?
- **Component reuse**: Could existing components be reused instead of creating new ones?

Focus on the UI-related files in the diff. Skip backend-only changes.`,
  };

  return prompts[role];
}

export function buildReviewPrompt(
  role: SubAgentRole,
  diff: string,
  repoRules: { source: string; content: string }[],
  prTitle: string,
  prBody: string,
  stackContext?: string
): string {
  return `${getSubAgentPrompt(role)}

## PR Information
**Title**: ${prTitle}
**Description**: ${prBody || 'No description provided.'}

${getRepoRulesContext(repoRules)}
${getStackContext(stackContext)}

## Diff to Review
\`\`\`diff
${diff}
\`\`\`

${REVIEW_OUTPUT_SCHEMA}

Respond ONLY with the JSON array. No markdown code fences, no explanation outside the JSON.`;
}
