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

- `src/hooks/`
  - Data-access hooks for each domain (`useTasks`, `useGoals`, `useHabits`, etc.).
  - One hook file per domain.
  - Hooks should encapsulate `invoke(...)` calls and cache invalidation.

- `src/theme/`
  - `ThemeContext.tsx` contains runtime theme state.
  - `presets.ts` contains theme preset definitions and helpers.

- `src/utils/`
  - Cross-component pure helpers (`taskUtils`, `goalUtils`).
  - Prefer moving parsing/formatting/sorting logic here instead of duplicating in components.

- `src/types/`
  - Shared TypeScript contracts synchronized with Rust models.

## Backend Structure

- `src-tauri/src/db.rs`
  - DB initialization and schema migrations.
  - All schema changes must be added as a new migration version.

- `src-tauri/src/models.rs`
  - Data models serialized to/from frontend.

- `src-tauri/src/commands.rs`
  - Tauri command handlers.
  - Validation/normalization logic lives near command handlers.
  - Keep command names stable for frontend compatibility.

- `src-tauri/src/lib.rs`
  - Command registration and Tauri app bootstrap.

## Conventions

- Add new features by domain: `type -> hook -> component -> command -> migration`.
- Keep UI-only formatting logic in `src/utils`.
- Keep persistence rules in Rust, not in React.
- Run `npm run build` and `cargo check` before commit.
