import { useState, useEffect, useCallback } from 'react';

interface Analytics {
  overall: { total: number; agrees: number; disagrees: number; agreeRate: number };
  byCategory: { category: string; total: number; agreeRate: number }[];
  bySeverity: { severity: string; total: number; agreeRate: number }[];
  byModel: { model: string; total: number; agreeRate: number }[];
  recentTrend: { week: string; agreeRate: number; total: number }[];
}

interface SuggestedRule {
  id: number;
  ruleText: string;
  reason: string;
  confidence: number;
  status: string;
}

export function useFeedback(repoName: string) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [suggestedRules, setSuggestedRules] = useState<SuggestedRule[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAnalytics = useCallback(async () => {
    if (!repoName) return;
    setLoading(true);
    try {
      const [analyticsData, rules] = await Promise.all([
        window.electronAPI.feedback.getAnalytics(repoName),
        window.electronAPI.feedback.getSuggestedRules(repoName),
      ]);
      setAnalytics(analyticsData);
      setSuggestedRules(rules);
    } catch (error) {
      console.error('Failed to load feedback analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [repoName]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return {
    analytics,
    suggestedRules,
    loading,
    refresh: loadAnalytics,
  };
}
