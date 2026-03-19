# Quorum

A multi-model AI-powered GitHub code review desktop app built with Electron, React, and TypeScript.

Quorum runs AI reviews across multiple providers (Anthropic Claude, OpenAI, Google Gemini) in parallel and surfaces a consensus review on your pull requests — all from a native desktop app.

## Features

- Fetch and browse open PRs from any GitHub repo
- Run parallel AI reviews using one or more of: Claude, GPT-4, Gemini
- Consensus engine merges multi-model feedback into a unified review
- Stacked PR detection (native git topology + Graphite support)
- Design review agent triggered on snapshot test changes
- Inline diff viewer with per-file review comments
- Feedback dashboard to track review history
- Auto-review mode to review new PRs as they appear

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm v9 or later
- At least one AI provider API key (Anthropic, OpenAI, or Google Gemini)
- A GitHub personal access token with `repo` scope

## Setup

1. **Clone the repo**

   ```bash
   git clone <repo-url>
   cd quorum
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run in development mode**

   ```bash
   npm run electron:dev
   ```

   This starts the Vite dev server and launches Electron concurrently.

4. **Configure the app**

   On first launch, open **Settings** and:
   - Paste your GitHub personal access token (requires `repo` scope)
   - Add at least one AI provider API key
   - Enable the models you want to use
   - Adjust preferences (poll interval, auto-review, design review, stack detection)

## Scripts

| Command | Description |
|---|---|
| `npm run electron:dev` | Start app in development mode |
| `npm run build` | Build renderer + electron main |
| `npm run electron:build` | Build and package app for distribution |
| `npm run typecheck` | Type-check all TypeScript sources |
| `npm run dev` | Start Vite dev server only (no Electron) |

## Project Structure

```
quorum/
├── electron/           # Electron main process
│   ├── main.ts         # App entry point
│   ├── preload.ts      # Context bridge / IPC exposure
│   ├── ipc/            # IPC handler registrations
│   └── services/       # Business logic
│       ├── ai/         # AI orchestration, providers, consensus
│       ├── db/         # SQLite (better-sqlite3)
│       ├── github/     # GitHub API client
│       ├── feedback/   # Review feedback storage
│       └── stack/      # Stacked PR detection
├── src/                # React renderer
│   ├── components/     # UI components
│   ├── store/          # Zustand state slices
│   ├── hooks/          # Custom React hooks
│   └── types/          # Shared TypeScript types
├── vite.config.ts
├── tsconfig.json       # Renderer TS config
└── tsconfig.electron.json  # Main process TS config
```

## Building for Distribution

```bash
npm run electron:build
```

Output is placed in `release/`. Targets: macOS (dmg + zip), Windows (nsis), Linux (AppImage + deb).
