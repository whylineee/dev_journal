# Dev Journal Agent Guide

Last updated: 2026-04-12

This file is the project-level source of truth for AI agents and contributors working in this repository.

Update this file after every substantial product, architecture, schema, or workflow change.

## Product Summary

Dev Journal is a local-first desktop productivity app for developers built with Tauri 2, React 19, TypeScript, Rust, and SQLite.

The app combines:
- daily journal entries
- a markdown-based pages workspace
- a kanban-style task board
- goals tracking
- habits tracking
- project workspaces with branches
- planner and meetings management
- analytics and insights
- theme and backup settings

The app is desktop-first. Data is stored locally in SQLite inside the Tauri app data directory.

## Current Product State

Version in `package.json`: `1.0.4`

Important current behavior:
- The app defaults to the OS color scheme on first launch.
- Theme customization is persisted in `localStorage`.
- The window hides to tray on close when tray support is available.
- Journal surfaces no longer rely on cwd-based git commit widgets, because packaged desktop cwd is not a stable repo context.
- CI/release workflow should not be triggered unnecessarily.
- Routine commits should use `[skip ci]` unless the user explicitly wants CI/release.
- Do not bump the app version unless the user explicitly asks for a new app version or release.

## Core Functional Areas

### 1. Planner
- Main landing tab in `src/App.tsx`
- Contains weekly planning UX and meetings scheduling
- Supports upcoming meetings, weekly meeting calendar, reminders, recurrence, participants, notes, decisions, and action items
- Can convert meeting action items into tasks
- Includes a stronger `Today Dashboard` summary layer
- Includes `Weekly Review`
- Includes upgraded `Focus Session` mode with optional task targeting and session tracking
- Focus Session now supports post-session break presets (`5m`, `10m`, `15m`)
- `PlannerBoard.tsx` now delegates meeting form state to `usePlannerMeetingForm`, planner UI preferences to `usePlannerPreferences`, and derived dashboard calculations to `plannerSelectors`

### 2. Journal
- Daily entry workflow by date
- Entry fields include `yesterday`, `today`, and optional `project_id`
- Supports reminders to write a daily entry after a configured hour

### 3. Pages
- Markdown-based page editor in `src/components/PageEditor.tsx`
- Single-column Notion-like full-canvas layout (no boxed inner editor panel)
- No side-by-side editor/preview split anymore
- Editor is organized into three top-level sections: `Page`, `Tasks`, and `Checklist`
- Supports:
  - free writing in `Page` section (notes/ideas/requirements) without requiring task blocks
  - markdown formatting helpers
  - code blocks
  - markdown tables
  - markdown checklists
  - embedded task database block via `{{TASK_TABLE}}`
  - embedded Notion-style form database block via `{{FORM_DB:...}}` (URL-encoded JSON payload)
  - embedded Notion-style task tracker database via `{{TASK_TRACKER:<id>}}` token internally
- Task blocks expose Notion-like views (`All Tasks`, `My Tasks`, `Checklist`) inside the `Tasks` section
- Task Tracker view selection (`All Tasks` / `My Tasks` / `Checklist`) is persisted per page in `localStorage`
- `Checklist` section provides a dedicated checklist editing surface (add/edit/toggle/remove) synced to markdown task-list lines
- Checklist keyboard behavior:
  - `Enter` creates a new checklist item below
  - `Shift+Enter` inserts a soft line break inside the current checklist item
  - `Backspace` on empty item removes that item
- Task Tracker table has an inline ghost `+ New task` row at the bottom; pressing `Enter` creates a real row and focuses the new task-name field
- Empty page editor state shows hints (`/ for commands`, Tasks tab databases, Checklist tab task-list) and never persists them to markdown
- `pagePreviewEnabled` now controls inline live blocks below the editor, not a separate right-side pane
- Editor surface hides internal block tokens; interactive blocks render below the markdown editor in a single continuous page flow
- Editor surface shows lightweight placeholders like `[[Tasks Database]]`, `[[Form Database]]`, and `[[Task Tracker]]` instead of raw internal tokens so embedded block order is preserved while editing
- Embedded task/task-tracker databases use Notion-like view tabs with compact action controls in the block header
- This is still a markdown editor, not a true block-editor engine

### 4. Tasks
- Kanban board with `todo`, `in_progress`, `done`
- Drag-and-drop between status columns using `@dnd-kit/core`
- Task create/edit/delete with proper error feedback and server-confirmed side effects
- Task priority, due date, estimate, timer
- Recurring tasks with `daily`, `weekdays`, `weekly`
- Recurring tasks materialize the next occurrence when the current one is completed
- Subtasks CRUD
- Goal linking
- Project linking
- Gantt timeline based on due dates
- Creating a task that would be hidden by active filters auto-resets those filters so the new task is visible
- "Done" checkbox uncheck preserves current status instead of always resetting to `todo`

### 5. Goals
- Goal CRUD with status and progress
- Goal milestones CRUD
- Milestones can auto-drive goal progress
- Goals can be linked to projects
- Tasks can be linked to goals
- Goal deletion requires user confirmation via dialog

### 6. Habits
- Habit CRUD
- Weekly target and color
- Daily completion logs
- Derived streak and weekly metrics

### 7. Projects
- Project CRUD
- Per-project branch/workspace support
- Project-linked tasks, goals, entries, and meetings
- Meetings are surfaced inside project workspaces

### 8. Insights / Stats
- Derived stats and dashboards from usage, tasks, habits, and entries
- Uses Recharts for visualization

### 9. Settings
- Theme preset
- light/dark appearance
- font preset
- density
- corner radius
- language
- reminders
- autosave
- journal preview toggle
- page live blocks toggle
- backup export/import
- live palette/settings preview surface

## Architecture Overview

The app uses a strict frontend/backend split:

### Frontend
- Path: `src/`
- Stack: React 19 + TypeScript + MUI + React Query + Framer Motion
- Responsibility:
  - rendering
  - local UI state
  - invoking Tauri commands
  - cache invalidation
  - lightweight derived presentation logic

### Backend
- Path: `src-tauri/src/`
- Stack: Rust + Tauri 2 + rusqlite
- Responsibility:
  - persistence
  - schema migrations
  - normalization/validation
  - command handlers
  - OS integrations setup

## Frontend Map

### Entry points
- `src/main.tsx`: React bootstrap
- `src/App.tsx`: app shell orchestration, tab routing, reminders, command palette state, and lazy-loading for non-default workspace screens to keep startup lighter

### Main UI modules
- `src/components/Layout.tsx`: sidebar, shell, top navigation, global search, desktop/mobile navigation
- `src/components/PlannerBoard.tsx`: planner + meetings
- `src/components/EntryForm.tsx`: daily journal entries
- `src/components/PageEditor.tsx`: pages editor
- `src/components/TasksBoard.tsx`: kanban, subtasks, timers, gantt
- `src/components/GoalsBoard.tsx`: goals UI
- `src/components/HabitsBoard.tsx`: habits UI
- `src/components/ProjectsBoard.tsx`: project workspace and branches
- `src/components/InsightsBoard.tsx`: analytics
- `src/components/SettingsScreen.tsx`: appearance/settings/backup
- `src/components/CommandPalette.tsx`: global quick actions
- large screen components may delegate section JSX into colocated subfolders like `src/components/planner/` and `src/components/tasks/`

### Data hooks
- `src/hooks/useEntries.ts`
- `src/hooks/usePages.ts`
- `src/hooks/useTasks.ts`
- `src/hooks/useGoals.ts`
- `src/hooks/useHabits.ts`
- `src/hooks/useProjects.ts`
- `src/hooks/useProjectBranches.ts`
- `src/hooks/useMeetings.ts`
- `src/hooks/usePlannerPreferences.ts`
- `src/hooks/usePlannerMeetingForm.ts`
- `src/hooks/useTasksPreferences.ts`

Rule:
- keep `invoke(...)` access inside hooks
- invalidate React Query caches on mutation success
- prefer shared invalidation helpers in `src/hooks/queryInvalidation.ts` instead of duplicating raw query-key lists in every hook
- invalidate related cache families (e.g. `["entry"]`, `["search"]`, `["project-branches"]`) not just the primary list key
- on backup import, invalidate **all** query families including per-item caches like `["entry", date]` and `["search"]`
- do not scatter Tauri calls across random UI components unless there is a very strong reason

### Shared client contracts
- `src/types/index.ts`

### Utilities
- `src/utils/taskUtils.ts`
- `src/utils/goalUtils.ts`
- `src/utils/meetingUtils.ts`
- `src/utils/plannerSelectors.ts`
- `src/utils/tasksBoardSelectors.ts`

## Backend Map

### Bootstrap
- `src-tauri/src/lib.rs`
  - initializes plugins
  - initializes DB
  - registers Tauri commands
  - handles window close-to-tray behavior

### Persistence
- `src-tauri/src/db.rs`
  - opens SQLite database
  - enables WAL mode
  - owns all migrations

### Models
- `src-tauri/src/models.rs`
  - Rust structs serialized to frontend

### Commands
- `src-tauri/src/commands.rs`
  - re-exports Tauri command handlers and shared backend helpers
- `src-tauri/src/commands/validation.rs`
  - normalization and validation helpers shared across domains
- `src-tauri/src/commands/tasks.rs`
  - task CRUD, recurrence materialization, and subtask handlers
- `src-tauri/src/commands/meetings.rs`
  - meeting CRUD and meeting action-item materialization
- `src-tauri/src/commands/backup.rs`
  - backup import flow and cross-entity restore sanitization

### Tray
- `src-tauri/src/tray.rs`

## Tauri Plugins in Use

Configured in `src-tauri/src/lib.rs`:
- `tauri-plugin-fs`
- `tauri-plugin-os`
- `tauri-plugin-notification`
- `tauri-plugin-autostart`

Frontend also uses:
- `@tauri-apps/plugin-opener` for external links

## Data Model Snapshot

Current schema migration level: `v14`

### Tables
- `entries`
- `pages`
- `tasks`
- `goals`
- `habits`
- `habit_logs`
- `projects`
- `project_branches`
- `task_subtasks`
- `goal_milestones`
- `meetings`
- `schema_migrations`

### Domain links
- `entries.project_id -> projects.id`
- `tasks.project_id -> projects.id`
- `tasks.goal_id -> goals.id`
- `goals.project_id -> projects.id`
- `project_branches.project_id -> projects.id`
- `task_subtasks.task_id -> tasks.id`
- `goal_milestones.goal_id -> goals.id`
- `meetings.project_id -> projects.id`

Referential integrity notes:
- SQLite foreign key enforcement is enabled at connection startup
- `entries.project_id`, `goals.project_id`, `tasks.project_id`, `tasks.goal_id`, and `tasks.parent_task_id` are normalized during backup import and sanitized by schema migration `v13`
- child-table foreign keys for `goal_milestones -> goals` and `task_subtasks -> tasks` are rebuilt by schema migration `v14`
- backup import skips or nulls invalid cross-entity references instead of restoring broken links
- backup import normalizes `goal.target_date` via `normalize_optional_date` (same as task `due_date`)
- backup import preserves `parent_task_id` for tasks without an explicit `id` via `deferred_parent_links`
- `normalize_habit_date` returns `Result<String, String>` and rejects invalid dates instead of silently substituting today

### Meeting-specific storage
The `meetings` table also stores:
- `participants_json`
- `notes`
- `decisions`
- `action_items_json`
- `recurrence`
- `recurrence_until`
- `reminder_minutes`

Meeting action items are stored as JSON and can be materialized into real tasks.
Meeting action-item materialization (`materialize_meeting_action_items`) is wrapped in a DB transaction for atomicity.

## Current Domain Rules

### Tasks
- Valid statuses: `todo`, `in_progress`, `done`
- Valid priorities: `low`, `medium`, `high`, `urgent`
- Valid recurrence values: `none`, `daily`, `weekdays`, `weekly`
- Timer data is persisted in the DB
- Drag-and-drop changes task status

### Goals
- Valid statuses: `active`, `paused`, `completed`, `archived`
- If a goal has milestones, progress may be recomputed from milestone completion

### Projects
- Valid statuses: `active`, `paused`, `completed`, `archived`

### Project branches
- Valid statuses: `open`, `merged`

### Meetings
- Valid statuses: `planned`, `live`, `done`, `missed`, `cancelled`
- Valid recurrence values: `none`, `daily`, `weekdays`, `weekly`
- `getMeetingDisplayStatus` respects user-set `missed` / `cancelled` / `done` without overriding from the time window
- `recurrence_until` is stored as a UTC ISO string; saved directly as `"YYYY-MM-DDT23:59:59.000Z"` to avoid local-timezone shift
- Current limitation:
  - recurring meeting edits/status changes apply to the meeting series
  - per-occurrence exceptions are not implemented

### Pages
- Stored as raw markdown content in the DB
- `{{TASK_TABLE}}` is a custom embedded block token
- `{{FORM_DB:...}}` is a custom embedded form database token (self-contained schema + rows)
- `{{TASK_TRACKER:<id>}}` is a custom embedded task tracker token used by the markdown/page engine
- Checklist soft line breaks are persisted in markdown using `<br/>` inside checklist text and converted back to new lines in the checklist editor UI
- The editor hides custom block tokens from visible text editing and keeps embedded blocks interactive below the editor
- On save, task trackers are persisted into markdown as URL-encoded payload tokens and restored on load
- Legacy URL-encoded tracker payload tokens are auto-migrated back to short token format in the editor
- Checklist interaction is managed through the dedicated `Checklist` section and persisted as markdown task-list lines

## Calendar / Meetings Integration Reality Check

Current calendar integration is link-based, not full API sync.

Implemented:
- store `meet_url`
- store `calendar_event_url`
- open external meeting links
- generate/open Google Calendar template URLs as fallback
- meeting and calendar links are limited to `http` / `https`; invalid or custom-scheme URLs are ignored

Not implemented:
- Google OAuth
- real-time Google Calendar sync
- provider-level calendar account connection
- two-way sync with external calendars

Do not describe the app as having full Google Calendar sync unless that is actually implemented later.

## Theme and Appearance

Theme runtime lives in:
- `src/theme/ThemeContext.tsx`
- `src/theme/presets.ts`

Key facts:
- first launch respects the OS color scheme
- user-selected mode then persists in `localStorage`
- supports theme presets, font presets, density, and border radius
- current `AppearanceMode` is `dark | light`
- there is no persistent `system` mode toggle; system preference is only the initial fallback and reset target

### Dashboard / Data-rich Design System

The app uses a clean dashboard visual language inspired by Raycast, Amie, and Things 3:

- **Solid surfaces**: all MUI Paper, Card, Drawer, AppBar, Dialog, Menu, Popover, and Tooltip use opaque `background.paper` or `background.default` — no `backdrop-filter`, no blur, no transparency
- **Three-level shadows**: `shadowSm` (1px), `shadowMd` (2-8px), `shadowLg` (8-24px) defined in `buildMuiTheme`
- **Clean borders**: all borders use the `divider` palette token (solid hex color, not rgba)
- **No body gradients**: `bodyGradient` is `"none"` in all presets; backgrounds are flat solid colors
- **Opaque preset palettes**: `backgroundPaper` and `backgroundDefault` are solid hex values
- **Flat primary buttons**: `containedPrimary` uses solid `palette.primary` background, no gradient
- **Button contrast text**: `gradientContrastText()` utility in `ThemeContext.tsx` computes WCAG-aware contrast color based on average luminance of `primary` and `secondary`
- **Hover behavior**: cards use `borderColor` + `boxShadow` transitions on hover — no `translateY` lift
- **Pill chips**: `MuiChip` uses `borderRadius: 999` with no border
- **Scrollbars**: 6px thin with transparent tracks and subtle thumbs
- **Selection color**: theme-aware `::selection` via MuiCssBaseline overrides
- **Tab/Progress overrides**: `MuiTab`, `MuiTabs`, `MuiLinearProgress` have compact dashboard-style defaults
- **Helper functions**: `relativeLuminance(hex)` and `gradientContrastText(colorA, colorB)` live in `ThemeContext.tsx`

Layout conventions:
- `Layout.tsx` uses a compact 240px sidebar with `NavItem` components (icon + label + optional count)
- Sidebar is organized into sections: Overview, Management, Analytics, with Settings at bottom
- Top bar shows page title + date; gains border-bottom on scroll
- No stats block, entry list, or page list in sidebar — those live in their respective screens
- `PlannerBoard.tsx` uses `plannerCardSx` with solid `background.paper` and `divider` borders
- Board item cards (Goals, Habits, Projects, Tasks) use solid bg + hover border/shadow transitions
- `SettingsScreen.tsx` is the reference control surface: live preview on top, grouped controls below

## Search, Notifications, and Local State

### Search
- entry search is available in the shell
- command palette is opened with `Cmd/Ctrl + K`
- command palette filtering should stay lightweight; prefer deferred query updates and precomputed searchable text over rebuilding large search strings on every keystroke

### Notifications
- daily journal reminder uses Tauri notification plugin
- journal reminder skips when the entries query is still loading to avoid false positives
- meeting reminders use local polling in `src/App.tsx`
- meeting reminder polling uses an async guard to prevent overlapping runs and duplicate notifications
- reminder delivery state is persisted in `localStorage`

### Other persisted local state
- reminder settings
- preview toggles
- autosave
- theme settings
- usage metrics
- meeting reminder dedupe map
- page drafts
- planner daily wins / collapsed sections via `usePlannerPreferences`
- tasks overdue filter via `useTasksPreferences`
- insights storage writes should remain best-effort so localStorage quota/privacy failures do not break the screen

## Backup / Import / Export

Managed in `src/components/SettingsScreen.tsx` and `src-tauri/src/commands/backup.rs`.

Export currently includes:
- entries
- pages
- tasks
- task subtasks
- goals
- projects
- project branches
- meetings
- habits
- habit logs
- local UI/preferences snapshot (theme, app shell toggles, planner/task view preferences, reminder state)

If schema changes, backup import/export must be reviewed as part of the same change.

## Development Workflow

### Install
```bash
npm install
```

### Run web build
```bash
npm run build
```

### Run tests
```bash
npm test
```

### Run desktop dev app
```bash
npm run tauri:dev
```

### Build desktop app
```bash
npm run tauri:build
```

### Backend verification
```bash
cd src-tauri && cargo check
```

## Change Rules For Future Agents

When adding or changing functionality:
- update TypeScript types in `src/types/index.ts` if contracts changed
- update Rust models in `src-tauri/src/models.rs` if serialized payloads changed
- add a new migration in `src-tauri/src/db.rs` for every schema change
- register new Tauri commands in `src-tauri/src/lib.rs`
- add or update React Query hooks instead of calling `invoke` directly from many components
- prefer `src/hooks/queryInvalidation.ts` for shared invalidation patterns before adding new ad hoc `invalidateQueries(...)` lists
- ensure mutation hooks invalidate all related cache families (not just the primary list key)
- update backup import/export if the changed domain is part of backups
- update i18n strings in `src/i18n/I18nContext.tsx` for any new user-facing text (both English key and Ukrainian translation)
- provide `onSuccess` / `onError` callbacks for all user-facing mutations with appropriate toast feedback
- wrap multi-statement backend operations in a DB transaction
- use stable, content-based React keys (never array index) for dynamic lists
- follow the robustness conventions documented in the "Robustness Conventions" section
- update this `AGENTS.md`
- update `docs/ARCHITECTURE.md` when architectural boundaries or conventions change

Before finishing work:
- run `npm run build`
- run `npm test` when changing business logic, storage helpers, or recurrence/date behavior
- run `cargo check` when backend Rust code changed

## UI/UX Direction

The app uses a dashboard / data-rich visual language:
- desktop-first productivity UI inspired by Raycast, Amie, Things 3
- solid opaque surfaces with subtle shadows (no glassmorphism / blur)
- clean card-based layouts with clear visual hierarchy
- Notion-inspired page experience
- richer workspace-driven planning
- compact sidebar navigation (240px) with icon + label + count

Avoid:
- breaking existing functionality during redesign
- describing partially implemented features as complete integrations
- using `backdrop-filter`, `blur()`, or semi-transparent `rgba` backgrounds on surfaces
- adding `translateY` hover animations — use border-color/box-shadow transitions instead
- using rgba for borders — use the `divider` theme token instead

## Known Technical Debt / Follow-ups

- Pages are still markdown-first, not a true draggable block editor
- Meeting recurrence does not support per-occurrence exceptions
- Bundle size warning exists in `vite build`
- Calendar integration is still URL/template based
- Some docs outside this file may lag behind and should be synchronized when touched
- `useMemo` for time-dependent values (week intervals, meeting lists) relies on `today` string as dependency; long-lived sessions without data changes between days may still show stale data until a query refetch triggers re-render
- `localStorage.setItem` is wrapped in try/catch in `usePersistentState` for quota/private-mode safety

## Robustness Conventions

These patterns are enforced across the codebase after the 2026-04-09 audit:

### Frontend
- **Mutations must confirm before side effects**: never show success toasts or clear local state until `onSuccess` fires; always provide `onError` feedback
- **Stable React keys**: embedded page blocks use `block.value` / `block.token` / `block.trackerData.id` as keys, never array index
- **Time-dependent memos**: `useMemo` for week intervals, meeting occurrences, habit dates must include a date string (e.g. `today`) in the dependency array
- **Async guard**: long-running polling callbacks (meeting reminders) use a `running` flag to prevent overlapping async executions
- **Cleanup**: speech recognition, intervals, and event listeners must be cleaned up on unmount via `useEffect` return
- **NaN safety**: `getTaskElapsedSeconds`, `formatDuration`, and `compareTasks` guard against non-finite/NaN inputs
- **Energy tag toggle**: selecting "No tag" toggles off the current tag; the handler never creates a tag from null state
- **Shared selectors/hooks first**: if a screen starts accumulating dashboard selectors, persistence, or form orchestration, extract that logic into hooks/utils before splitting JSX
- **Centralized UI persistence**: screen-level components should read/write preference-like local state through shared hooks instead of direct `localStorage` access

### Backend (Rust)
- **Transactions**: multi-statement operations (meeting action-item materialization) must be wrapped in a `conn.transaction()`
- **Validation returns errors**: `normalize_habit_date` returns `Result` instead of silently substituting; callers decide how to handle
- **Backup completeness**: `goal.target_date` and task `parent_task_id` (including for id-less tasks) are normalized during import

### i18n
- Every user-facing string must have a Ukrainian entry in `ukTranslations` in `src/i18n/I18nContext.tsx`
- UI labels must match actual code constraints (e.g. border radius label matches the actual min/max clamp)

## Recently Added Major Features

As of 2026-03-11, the app already includes these recent additions:
- task card opening/editing flow
- task subtasks
- drag-and-drop task status movement
- task gantt timeline
- recurring tasks
- initial theme from OS preference
- meetings planner with recurrence, reminders, notes, decisions, participants, and action items
- project-linked meetings
- page checklists, code blocks, markdown tables, and embedded task database
- single-column Notion-like page editor layout
- planner today dashboard
- weekly review
- focus session tracking
- goal milestones
- glassmorphism full UI redesign (on `redesign/glassmorphism` branch)
- luminance-based button contrast text for all theme presets
- hidden sidebar scrollbar with preserved scroll functionality
- proper button active/focus-visible states to prevent visual artifacts
- blue notebook/code app icon set for clearer recognition in macOS Dock and Windows taskbar/start

As of 2026-04-09, the following robustness improvements were applied:
- task delete waits for server confirmation before clearing outcomes and showing toast
- task "done" uncheck preserves `in_progress` status instead of forcing `todo`
- weekly review / habit week / meeting lists refresh correctly across day boundaries
- meeting action-item editing uses title-based matching before index fallback
- journal reminder skips while entries query is loading
- backup import invalidates all query families including per-item and search caches
- project delete invalidates `project-branches` cache family
- entry save/delete invalidates search cache
- EntryForm energy tag "No tag" correctly clears instead of creating "Focused"
- page editor embedded blocks use stable content-based keys
- `getMeetingDisplayStatus` respects user-set `missed` status
- meeting action-item materialization wrapped in DB transaction
- goal delete requires confirmation dialog with error feedback
- SpeechRecognition properly cleaned up on InsightsBoard unmount
- InsightsBoard weekly retro uses string date comparison avoiding timezone mismatch
- `recurrence_until` stored as explicit UTC to prevent local-timezone date shift
- meeting mutations (cancel, workflow status, delete) surface error feedback
- meeting participant list uses stable composite keys
- meeting reminder polling guarded against overlapping async runs
- `normalize_habit_date` returns error instead of silent date substitution
- backup import preserves `parent_task_id` for tasks without explicit id
- backup import normalizes `goal.target_date`
- `taskUtils` guards against NaN in elapsed seconds, duration formatting, and priority sort
- i18n label "Corner radius (6-24)" corrected to match actual clamp (6-18)
- added missing Ukrainian translations for all new user-facing strings
- `localStorage.setItem` wrapped in try/catch in `usePersistentState`
- tray timer invoke logs errors in dev mode
