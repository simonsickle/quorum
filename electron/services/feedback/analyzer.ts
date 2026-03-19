import { getDatabase } from '../db';

interface CategoryStats {
  category: string;
  total: number;
  agrees: number;
  disagrees: number;
  agreeRate: number;
}

interface AnalyticsResult {
  overall: {
    total: number;
    agrees: number;
    disagrees: number;
    agreeRate: number;
  };
  byCategory: CategoryStats[];
  bySeverity: {
    severity: string;
    total: number;
    agrees: number;
    disagrees: number;
    agreeRate: number;
  }[];
  byModel: {
    model: string;
    total: number;
    agrees: number;
    disagrees: number;
    agreeRate: number;
  }[];
  recentTrend: {
    week: string;
    agreeRate: number;
    total: number;
  }[];
}

interface SuggestedRule {
  id: number;
  ruleText: string;
  reason: string;
  confidence: number;
  status: string;
}

export class FeedbackAnalyzer {
  getAnalytics(repoName: string): AnalyticsResult {
    const db = getDatabase();

    // Overall stats
    const overall = db
      .prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN action = 'agree' THEN 1 ELSE 0 END) as agrees,
          SUM(CASE WHEN action = 'disagree' THEN 1 ELSE 0 END) as disagrees
        FROM feedback_actions WHERE repo_name = ?
      `)
      .get(repoName) as any;

    overall.agreeRate =
      overall.total > 0 ? (overall.agrees / overall.total) * 100 : 0;

    // By category
    const byCategory = db
      .prepare(`
        SELECT
          category,
          COUNT(*) as total,
          SUM(CASE WHEN action = 'agree' THEN 1 ELSE 0 END) as agrees,
          SUM(CASE WHEN action = 'disagree' THEN 1 ELSE 0 END) as disagrees
        FROM feedback_actions WHERE repo_name = ?
        GROUP BY category ORDER BY total DESC
      `)
      .all(repoName) as any[];

    byCategory.forEach((row: any) => {
      row.agreeRate = row.total > 0 ? (row.agrees / row.total) * 100 : 0;
    });

    // By severity
    const bySeverity = db
      .prepare(`
        SELECT
          severity,
          COUNT(*) as total,
          SUM(CASE WHEN action = 'agree' THEN 1 ELSE 0 END) as agrees,
          SUM(CASE WHEN action = 'disagree' THEN 1 ELSE 0 END) as disagrees
        FROM feedback_actions WHERE repo_name = ?
        GROUP BY severity ORDER BY total DESC
      `)
      .all(repoName) as any[];

    bySeverity.forEach((row: any) => {
      row.agreeRate = row.total > 0 ? (row.agrees / row.total) * 100 : 0;
    });

    // By model (need to parse JSON array)
    const byModel = db
      .prepare(`
        SELECT source_models, action FROM feedback_actions WHERE repo_name = ?
      `)
      .all(repoName) as any[];

    const modelCounts = new Map<
      string,
      { total: number; agrees: number; disagrees: number }
    >();

    for (const row of byModel) {
      const models = JSON.parse(row.source_models) as string[];
      for (const model of models) {
        if (!modelCounts.has(model)) {
          modelCounts.set(model, { total: 0, agrees: 0, disagrees: 0 });
        }
        const counts = modelCounts.get(model)!;
        counts.total++;
        if (row.action === 'agree') counts.agrees++;
        else counts.disagrees++;
      }
    }

    const byModelResult = Array.from(modelCounts.entries()).map(
      ([model, counts]) => ({
        model,
        ...counts,
        agreeRate: counts.total > 0 ? (counts.agrees / counts.total) * 100 : 0,
      })
    );

    // Weekly trend
    const recentTrend = db
      .prepare(`
        SELECT
          strftime('%Y-W%W', created_at) as week,
          COUNT(*) as total,
          SUM(CASE WHEN action = 'agree' THEN 1 ELSE 0 END) as agrees
        FROM feedback_actions WHERE repo_name = ?
        GROUP BY week ORDER BY week DESC LIMIT 12
      `)
      .all(repoName) as any[];

    const trend = recentTrend.map((row: any) => ({
      week: row.week,
      agreeRate: row.total > 0 ? (row.agrees / row.total) * 100 : 0,
      total: row.total,
    }));

    return {
      overall,
      byCategory,
      bySeverity,
      byModel: byModelResult,
      recentTrend: trend.reverse(),
    };
  }

  getSuggestedRules(repoName: string): SuggestedRule[] {
    const db = getDatabase();

    // Analyze categories with high disagree rates
    const problematicCategories = db
      .prepare(`
        SELECT
          category,
          COUNT(*) as total,
          SUM(CASE WHEN action = 'disagree' THEN 1 ELSE 0 END) as disagrees,
          GROUP_CONCAT(CASE WHEN action = 'disagree' THEN description ELSE NULL END, '|||') as disagree_descriptions
        FROM feedback_actions
        WHERE repo_name = ?
        GROUP BY category
        HAVING total >= 5 AND (CAST(disagrees AS REAL) / total) > 0.5
        ORDER BY (CAST(disagrees AS REAL) / total) DESC
      `)
      .all(repoName) as any[];

    const suggestions: SuggestedRule[] = [];

    for (const cat of problematicCategories) {
      const disagreeRate = (cat.disagrees / cat.total) * 100;
      const descriptions = (cat.disagree_descriptions || '')
        .split('|||')
        .filter(Boolean)
        .slice(0, 3);

      const ruleText = `Consider adjusting ${cat.category} review sensitivity. Users disagreed with ${disagreeRate.toFixed(0)}% of ${cat.category} suggestions.`;
      const reason = `Based on ${cat.total} feedback actions. Common disagreed items: ${descriptions.join('; ')}`;

      // Check if this suggestion already exists
      const existing = db
        .prepare(
          'SELECT id FROM suggested_rules WHERE repo_name = ? AND rule_text = ?'
        )
        .get(repoName, ruleText);

      if (!existing) {
        const result = db
          .prepare(`
            INSERT INTO suggested_rules (repo_name, rule_text, reason, agree_count, disagree_count, confidence)
            VALUES (?, ?, ?, ?, ?, ?)
          `)
          .run(
            repoName,
            ruleText,
            reason,
            cat.total - cat.disagrees,
            cat.disagrees,
            disagreeRate / 100
          );

        suggestions.push({
          id: Number(result.lastInsertRowid),
          ruleText,
          reason,
          confidence: disagreeRate / 100,
          status: 'pending',
        });
      }
    }

    // Also return existing pending suggestions
    const existingSuggestions = db
      .prepare(
        'SELECT id, rule_text as ruleText, reason, confidence, status FROM suggested_rules WHERE repo_name = ? AND status = ? ORDER BY confidence DESC'
      )
      .all(repoName, 'pending') as SuggestedRule[];

    return [...suggestions, ...existingSuggestions];
  }
}
