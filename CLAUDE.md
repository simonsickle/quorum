# CLAUDE.md

## Project Overview

Quorum is a multi-model AI code review desktop app. It uses Electron for the shell, React + Tailwind for the UI, and Vite for bundling. The main process (Node/Electron) lives in `electron/`, the renderer (React) lives in `src/`.

## Architecture

- **Renderer** (`src/`): React 18, Zustand state, React Router. No direct Node access — all side effects go through IPC.
- **Main process** (`electron/`): Registers IPC handlers, runs AI providers, talks to GitHub, writes to SQLite via better-sqlite3.
- **IPC boundary** (`electron/preload.ts`): Exposes a typed `window.electronAPI` surface via `contextBridge`. Add new capabilities here when the renderer needs new main-process functionality.
- **AI layer** (`electron/services/ai/`): `orchestrator.ts` fans out to provider adapters, `consensus.ts` merges results, `model-harness.ts` wraps individual model calls.

## Development

```bash
npm run electron:dev   # Vite dev server + Electron (hot reload)
npm run typecheck      # Check both tsconfigs before committing
```

Two separate `tsconfig` files exist: `tsconfig.json` (renderer, targets DOM) and `tsconfig.electron.json` (main process, targets Node). Keep them separate — do not merge.

## Key Conventions

- **State**: Use Zustand slices in `src/store/`. Each slice file maps to a domain (`prSlice`, `reviewSlice`, `settingsSlice`). Access via `useStore()`.
- **IPC calls**: Always go through `window.electronAPI.*`. Never use `ipcRenderer` directly in components.
- **Styling**: Tailwind only. Custom design tokens are defined in `tailwind.config.js` (e.g. `text-text-primary`, `bg-surface-1`, `accent-blue`). Use those instead of raw colors.
- **Types**: Shared renderer types live in `src/types/`. Electron-side types live alongside their service files.

## Adding a New AI Provider

1. Create `electron/services/ai/providers/<name>.ts` implementing the provider interface.
2. Register it in `orchestrator.ts`.
3. Add the provider key to the `ModelProvider` union in `src/types/review.ts`.
4. Add an API key input and model selector entry — `Settings.tsx` already iterates over the `providers` array.

## Testing & Type Checking

There are no automated tests currently. Before committing, run:

```bash
npm run typecheck
```

Both `tsconfig.json` and `tsconfig.electron.json` must pass without errors.
