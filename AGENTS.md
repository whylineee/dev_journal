# Dev Journal Agent Guide

Last updated: 2026-03-05

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

Version in `package.json`: `1.0.3`

Important current behavior:
- The app defaults to the OS color scheme on first launch.
- Theme customization is persisted in `localStorage`.
- The window hides to tray on close when tray support is available.
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

### 2. Journal
- Daily entry workflow by date
- Entry fields include `yesterday`, `today`, and optional `project_id`
- Supports reminders to write a daily entry after a configured hour

### 3. Pages
- Markdown-based page editor in `src/components/PageEditor.tsx`
- Single-column Notion-like canvas layout
- No side-by-side editor/preview split anymore
- Supports:
  - markdown formatting helpers
  - code blocks
  - markdown tables
  - markdown checklists
  - embedded task database block via `{{TASK_TABLE}}`
- `pagePreviewEnabled` now controls inline live blocks below the editor, not a separate right-side pane
- This is still a markdown editor, not a true block-editor engine

### 4. Tasks
- Kanban board with `todo`, `in_progress`, `done`
- Drag-and-drop between status columns using `@dnd-kit/core`
- Task create/edit/delete
- Task priority, due date, estimate, timer
- Recurring tasks with `daily`, `weekdays`, `weekly`
- Recurring tasks materialize the next occurrence when the current one is completed
- Subtasks CRUD
- Goal linking
- Project linking
- Gantt timeline based on due dates

### 5. Goals
- Goal CRUD with status and progress
- Goal milestones CRUD
- Milestones can auto-drive goal progress
- Goals can be linked to projects
- Tasks can be linked to goals

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
- `src/App.tsx`: app shell orchestration, tab routing, reminders, command palette state

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

### Data hooks
- `src/hooks/useEntries.ts`
- `src/hooks/usePages.ts`
- `src/hooks/useTasks.ts`
- `src/hooks/useGoals.ts`
- `src/hooks/useHabits.ts`
- `src/hooks/useProjects.ts`
- `src/hooks/useProjectBranches.ts`
- `src/hooks/useMeetings.ts`

Rule:
- keep `invoke(...)` access inside hooks
- invalidate React Query caches on mutation success
- do not scatter Tauri calls across random UI components unless there is a very strong reason

### Shared client contracts
- `src/types/index.ts`

### Utilities
- `src/utils/taskUtils.ts`
- `src/utils/goalUtils.ts`
- `src/utils/meetingUtils.ts`

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
  - CRUD handlers
  - normalization helpers
  - backup import
  - domain-specific workflows like meeting action item materialization

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

Current schema migration level: `v12`

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
- Current limitation:
  - recurring meeting edits/status changes apply to the meeting series
  - per-occurrence exceptions are not implemented

### Pages
- Stored as raw markdown content in the DB
- `{{TASK_TABLE}}` is a custom embedded block token
- Checklist interaction currently relies on markdown task list syntax and inline live block rendering

## Calendar / Meetings Integration Reality Check

Current calendar integration is link-based, not full API sync.

Implemented:
- store `meet_url`
- store `calendar_event_url`
- open external meeting links
- generate/open Google Calendar template URLs as fallback

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

## Search, Notifications, and Local State

### Search
- entry search is available in the shell
- command palette is opened with `Cmd/Ctrl + K`

### Notifications
- daily journal reminder uses Tauri notification plugin
- meeting reminders use local polling in `src/App.tsx`
- reminder delivery state is persisted in `localStorage`

### Other persisted local state
- reminder settings
- preview toggles
- autosave
- theme settings
- usage metrics
- meeting reminder dedupe map
- page drafts

## Backup / Import / Export

Managed in `src/components/SettingsScreen.tsx` and `src-tauri/src/commands.rs`.

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
- update backup import/export if the changed domain is part of backups
- update i18n strings in `src/i18n/I18nContext.tsx` for any new user-facing text
- update this `AGENTS.md`
- update `docs/ARCHITECTURE.md` when architectural boundaries or conventions change

Before finishing work:
- run `npm run build`
- run `cargo check` when backend Rust code changed

## UI/UX Direction

The app is moving toward:
- desktop-first productivity UI
- cleaner editor/productivity styling
- Notion-inspired page experience
- richer workspace-driven planning

Avoid:
- breaking existing functionality during redesign
- describing partially implemented features as complete integrations
- introducing visual changes that fight the existing theme/token system

## Known Technical Debt / Follow-ups

- Pages are still markdown-first, not a true draggable block editor
- Meeting recurrence does not support per-occurrence exceptions
- Bundle size warning exists in `vite build`
- Calendar integration is still URL/template based
- Some docs outside this file may lag behind and should be synchronized when touched

## Recently Added Major Features

As of 2026-03-05, the app already includes these recent additions:
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
