# Dev Journal Architecture

This document describes how the project is structured and where to add new code.

## Layers

1. `src/` (React + TypeScript)
- UI components, hooks, and client-side state.
- Talks to backend only through Tauri `invoke`.

2. `src-tauri/` (Rust + SQLite)
- Owns persistence, migrations, and business rules.
- Exposes strongly scoped commands to frontend.

3. `docs/`
- Maintains architecture and contributor-facing documentation.

## Frontend Structure

- `src/components/`
  - Screen-level UI (`TasksBoard`, `GoalsBoard`, `HabitsBoard`, `PlannerBoard`).
  - Keep components focused on rendering and interaction flows.
  - When a screen grows large, extract section-level JSX into colocated subfolders such as `components/planner/` or `components/tasks/`.

- `src/hooks/`
  - Data-access hooks for each domain (`useTasks`, `useGoals`, `useHabits`, etc.).
  - One hook file per domain.
  - Hooks should encapsulate `invoke(...)` calls and cache invalidation.
  - Screen orchestration and local-persistence hooks belong here when they remove non-rendering logic from large screens (`usePlannerPreferences`, `usePlannerMeetingForm`, `useTasksPreferences`).

- `src/theme/`
  - `ThemeContext.tsx` contains runtime theme state.
  - `presets.ts` contains theme preset definitions and helpers.

- `src/utils/`
  - Cross-component pure helpers (`taskUtils`, `goalUtils`, `pageEditorUtils`).
  - Local UI persistence helpers live here as well (`preferencesStorage`, analytics/focus storage helpers).
  - Prefer moving parsing/formatting/sorting logic here instead of duplicating in components.
  - Dashboard-derived selectors belong in dedicated pure helpers (`plannerSelectors`) instead of staying inline inside large screen components.
  - Board-specific derived data such as task filters/stats/gantt calculations belong in dedicated selector helpers (`tasksBoardSelectors`).

- `src/types/`
  - Shared TypeScript contracts synchronized with Rust models.

## Backend Structure

- `src-tauri/src/db.rs`
  - DB initialization and schema migrations.
  - All schema changes must be added as a new migration version.

- `src-tauri/src/models.rs`
  - Data models serialized to/from frontend.

- `src-tauri/src/commands.rs`
  - Tauri command re-exports and shared backend glue.
  - Keep command names stable for frontend compatibility.

- `src-tauri/src/commands/validation.rs`
  - Shared validation and normalization rules used across backend domains.

- `src-tauri/src/commands/tasks.rs`
  - Task commands, timer flows, and recurring task materialization.

- `src-tauri/src/commands/meetings.rs`
  - Meeting commands and meeting action-item to task materialization.

- `src-tauri/src/commands/backup.rs`
  - Backup import orchestration and restore-time reference sanitization.

- `src-tauri/src/lib.rs`
  - Command registration and Tauri app bootstrap.

## Conventions

- Add new features by domain: `type -> hook -> component -> command -> migration`.
- Keep UI-only formatting logic in `src/utils`.
- Keep `localStorage` access centralized behind shared helpers/hooks instead of scattering raw keys across components.
- Keep persistence rules in Rust, not in React.
- Prefer shared query invalidation helpers over repeating raw query-key arrays in every hook.
- If a screen grows beyond orchestration, extract persistence/form/selector logic into hooks and pure utils before doing visual decomposition.
- Run `npm test` when changing pure business logic, storage parsing, or editor serialization flows.
- Run `npm run build` and `cargo check` before commit.
