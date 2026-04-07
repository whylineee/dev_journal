# Copilot Instructions for Dev Journal

Dev Journal is a local-first desktop productivity app built with Tauri 2 (Rust) + React 19 + TypeScript + SQLite. It combines daily journaling, a markdown pages workspace, kanban tasks, goals, habits, meetings/planner, and project workspaces.

## Commands

```bash
npm install           # Install dependencies
npm run build         # TypeScript check + Vite build
npm test              # Run all tests (TypeScript + Rust)
npm run test:ts       # Run only TypeScript tests
npm run test:rust     # Run only Rust tests
npm run tauri:dev     # Run desktop app in dev mode
npm run tauri:build   # Build desktop app
cd src-tauri && cargo check  # Verify Rust backend compiles
```

### Running a single test

TypeScript tests use Node's built-in test runner:
```bash
node --test tests/taskUtils.test.ts
```

Rust tests:
```bash
cargo test --manifest-path src-tauri/Cargo.toml <test_name>
```

## Architecture

### Frontend (`src/`)
React 19 + TypeScript + MUI + React Query + Framer Motion

- **Entry points**: `main.tsx` (React bootstrap), `App.tsx` (shell, routing, reminders)
- **Components**: Screen-level UI in `src/components/` (e.g., `TasksBoard.tsx`, `PageEditor.tsx`)
- **Hooks**: Data-access hooks in `src/hooks/` — one per domain (`useTasks`, `useGoals`, etc.)
- **Types**: Shared contracts in `src/types/index.ts` — must sync with Rust models
- **Theme**: Runtime in `src/theme/ThemeContext.tsx`, presets in `src/theme/presets.ts`
- **Utils**: Pure helpers in `src/utils/` (sorting, formatting, localStorage wrappers)

### Backend (`src-tauri/src/`)
Rust + Tauri 2 + rusqlite

- **lib.rs**: Plugin init, DB init, command registration, window behavior
- **db.rs**: SQLite connection, WAL mode, all schema migrations
- **models.rs**: Rust structs serialized to/from frontend
- **commands.rs**: CRUD handlers, validation, backup import

### Data flow
Frontend calls backend exclusively via Tauri `invoke()`. All `invoke` calls should be encapsulated in React Query hooks, not scattered across components. Invalidate caches on mutation success.

## Key Conventions

### Adding new features
Follow domain order: `type → hook → component → command → migration`

### Schema changes
Add a new versioned migration in `src-tauri/src/db.rs`. Current level: v14. Never modify existing migrations.

### TypeScript/Rust sync
When changing data contracts, update both `src/types/index.ts` and `src-tauri/src/models.rs`.

### localStorage access
Centralize behind helpers in `src/utils/` — don't scatter raw keys across components.

### Theme and styling
- Use opaque solid surfaces (no `backdrop-filter`, blur, or rgba backgrounds)
- Borders use the `divider` theme token
- Hover: use border-color/box-shadow transitions, not `translateY`
- Compact 240px sidebar with icon + label + count

### Valid domain values
- Task status: `todo`, `in_progress`, `done`
- Task priority: `low`, `medium`, `high`, `urgent`
- Task/Meeting recurrence: `none`, `daily`, `weekdays`, `weekly`
- Goal/Project status: `active`, `paused`, `completed`, `archived`
- Meeting status: `planned`, `live`, `done`, `missed`, `cancelled`

### Pages/Markdown
Pages are markdown-first. Custom embedded blocks use tokens:
- `{{TASK_TABLE}}` — embedded task database
- `{{FORM_DB:...}}` — form database (URL-encoded JSON)
- `{{TASK_TRACKER:<id>}}` — task tracker

### Backup/Import
If a domain is part of backups, update import/export logic in `SettingsScreen.tsx` and `commands.rs` when changing schema.

### Git commits
- Use `[skip ci]` for routine commits unless you want CI/release
- Don't bump version unless explicitly requested

### Before finishing
- Run `npm run build`
- Run `npm test` when changing business logic or date/recurrence behavior
- Run `cargo check` when Rust code changed
