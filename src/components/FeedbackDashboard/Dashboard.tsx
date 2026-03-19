import { useState } from 'react';
import { useFeedback } from '../../hooks/useFeedback';

export function Dashboard() {
  const [repoName, setRepoName] = useState('');
  const [activeRepo, setActiveRepo] = useState('');
  const { analytics, suggestedRules, loading, refresh } = useFeedback(activeRepo);

  const handleSearch = () => {
    if (repoName.trim()) {
      setActiveRepo(repoName.trim());
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">
            Feedback Dashboard
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Track AI review accuracy and discover suggested repo rules
          </p>
        </div>

        {/* Repo selector */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={repoName}
            onChange={(e) => setRepoName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="owner/repo"
            className="flex-1 bg-surface-0 border border-border-default rounded-md px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 rounded-md bg-accent-blue text-white text-sm hover:bg-accent-blue/80"
          >
            Load
          </button>
        </div>

        {loading && (
          <div className="text-text-muted text-sm text-center py-8">Loading analytics...</div>
        )}

        {analytics && !loading && (
          <>
            {/* Overall stats */}
            <div className="grid grid-cols-3 gap-4">
              <StatCard
                label="Total Reviews"
                value={analytics.overall.total}
                color="text-text-primary"
              />
              <StatCard
                label="Agree Rate"
                value={`${analytics.overall.agreeRate.toFixed(1)}%`}
                color={analytics.overall.agreeRate > 70 ? 'text-green-400' : analytics.overall.agreeRate > 50 ? 'text-yellow-400' : 'text-red-400'}
              />
              <StatCard
                label="Disagreed"
                value={analytics.overall.disagrees}
                color="text-red-400"
              />
            </div>

            {/* By category */}
            {analytics.byCategory.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-text-primary mb-3">
                  Accuracy by Category
                </h2>
                <div className="space-y-2">
                  {analytics.byCategory.map((cat) => (
                    <div
                      key={cat.category}
                      className="flex items-center justify-between p-2 rounded bg-surface-1 border border-border-muted"
                    >
                      <span className="text-sm text-text-secondary">{cat.category}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-text-muted">
                          {cat.total} reviews
                        </span>
                        <div className="w-24 h-2 bg-surface-3 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              cat.agreeRate > 70
                                ? 'bg-green-500'
                                : cat.agreeRate > 50
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                            }`}
                            style={{ width: `${cat.agreeRate}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-secondary w-12 text-right">
                          {cat.agreeRate.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* By model */}
            {analytics.byModel.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-text-primary mb-3">
                  Accuracy by Model
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {analytics.byModel.map((m) => (
                    <div
                      key={m.model}
                      className="p-3 rounded-md bg-surface-1 border border-border-default text-center"
                    >
                      <div className="text-sm font-medium text-text-primary capitalize">
                        {m.model}
                      </div>
                      <div
                        className={`text-xl font-bold mt-1 ${
                          m.agreeRate > 70
                            ? 'text-green-400'
                            : m.agreeRate > 50
                              ? 'text-yellow-400'
                              : 'text-red-400'
                        }`}
                      >
                        {m.agreeRate.toFixed(0)}%
                      </div>
                      <div className="text-xs text-text-muted mt-1">
                        {m.total} reviews
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Suggested rules */}
            {suggestedRules.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-text-primary mb-3">
                  Suggested Repo Rules
                </h2>
                <p className="text-xs text-text-secondary mb-3">
                  Based on patterns in your agree/disagree feedback, these rules could improve future reviews.
                </p>
                <div className="space-y-2">
                  {suggestedRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-3 rounded-md bg-surface-1 border border-accent-orange/30"
                    >
                      <p className="text-sm text-text-primary">{rule.ruleText}</p>
                      <p className="text-xs text-text-muted mt-1">{rule.reason}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-accent-orange">
                          {(rule.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Trend */}
            {analytics.recentTrend.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-text-primary mb-3">
                  Weekly Trend
                </h2>
                <div className="flex items-end gap-1 h-24">
                  {analytics.recentTrend.map((week) => (
                    <div
                      key={week.week}
                      className="flex-1 flex flex-col items-center"
                    >
                      <div
                        className={`w-full rounded-t ${
                          week.agreeRate > 70
                            ? 'bg-green-500/50'
                            : week.agreeRate > 50
                              ? 'bg-yellow-500/50'
                              : 'bg-red-500/50'
                        }`}
                        style={{ height: `${Math.max(week.agreeRate, 5)}%` }}
                        title={`${week.week}: ${week.agreeRate.toFixed(0)}% (${week.total} reviews)`}
                      />
                      <span className="text-xs text-text-muted mt-1 truncate w-full text-center">
                        {week.week.split('-W')[1]}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {!analytics && !loading && activeRepo && (
          <div className="text-text-muted text-sm text-center py-8">
            No feedback data found for {activeRepo}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="p-4 rounded-md bg-surface-1 border border-border-default">
      <div className="text-xs text-text-muted">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}
