export const SCHEMA_VERSION = 1;

export const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pull_requests (
    id TEXT PRIMARY KEY,
    number INTEGER NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    state TEXT NOT NULL,
    author_login TEXT NOT NULL,
    author_avatar_url TEXT,
    repo_name_with_owner TEXT NOT NULL,
    repo_url TEXT,
    head_ref TEXT NOT NULL,
    base_ref TEXT NOT NULL,
    head_oid TEXT,
    base_oid TEXT,
    additions INTEGER DEFAULT 0,
    deletions INTEGER DEFAULT 0,
    changed_files INTEGER DEFAULT 0,
    url TEXT NOT NULL,
    review_decision TEXT,
    is_draft INTEGER DEFAULT 0,
    is_stacked INTEGER DEFAULT 0,
    stack_id TEXT,
    stack_position INTEGER,
    raw_data TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    fetched_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pr_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pr_id TEXT NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    status TEXT NOT NULL,
    additions INTEGER DEFAULT 0,
    deletions INTEGER DEFAULT 0,
    patch TEXT,
    contents_url TEXT,
    previous_filename TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS review_results (
    id TEXT PRIMARY KEY,
    pr_id TEXT NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    models_used TEXT NOT NULL,
    agents_used TEXT NOT NULL,
    total_findings INTEGER DEFAULT 0,
    high_confidence_count INTEGER DEFAULT 0,
    medium_confidence_count INTEGER DEFAULT 0,
    low_confidence_count INTEGER DEFAULT 0,
    duration_ms INTEGER,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS review_findings (
    id TEXT PRIMARY KEY,
    review_id TEXT NOT NULL REFERENCES review_results(id) ON DELETE CASCADE,
    pr_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    line_start INTEGER NOT NULL,
    line_end INTEGER NOT NULL,
    severity TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    suggested_fix TEXT,
    confidence TEXT NOT NULL,
    source_models TEXT NOT NULL,
    source_agents TEXT NOT NULL,
    original_findings TEXT,
    user_action TEXT,
    posted_to_github INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS feedback_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    finding_id TEXT NOT NULL REFERENCES review_findings(id) ON DELETE CASCADE,
    pr_id TEXT NOT NULL,
    repo_name TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('agree', 'disagree')),
    file_path TEXT NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    confidence TEXT NOT NULL,
    source_models TEXT NOT NULL,
    source_agents TEXT NOT NULL,
    description TEXT NOT NULL,
    diff_context TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS repo_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_name TEXT NOT NULL,
    source_file TEXT NOT NULL,
    content TEXT NOT NULL,
    fetched_at TEXT DEFAULT (datetime('now')),
    UNIQUE(repo_name, source_file)
  );

  CREATE TABLE IF NOT EXISTS suggested_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_name TEXT NOT NULL,
    rule_text TEXT NOT NULL,
    reason TEXT NOT NULL,
    agree_count INTEGER DEFAULT 0,
    disagree_count INTEGER DEFAULT 0,
    confidence REAL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    finding_id TEXT NOT NULL REFERENCES review_findings(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    model TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY
  );

  CREATE INDEX IF NOT EXISTS idx_pr_files_pr_id ON pr_files(pr_id);
  CREATE INDEX IF NOT EXISTS idx_review_findings_review_id ON review_findings(review_id);
  CREATE INDEX IF NOT EXISTS idx_review_findings_pr_id ON review_findings(pr_id);
  CREATE INDEX IF NOT EXISTS idx_feedback_actions_repo ON feedback_actions(repo_name);
  CREATE INDEX IF NOT EXISTS idx_feedback_actions_category ON feedback_actions(category);
  CREATE INDEX IF NOT EXISTS idx_repo_rules_repo ON repo_rules(repo_name);
`;
