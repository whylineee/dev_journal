# Changelog

All notable changes to this project are documented in this file.

## [1.0.4] - 2026-03-11

### Added
- Planner upgrades: Today Dashboard, Weekly Review, focus sessions, daily wins tracker, and tomorrow planning workflow.
- Meetings system with recurrence, reminders, participants, notes, decisions, and action-item materialization into tasks.
- Task stack upgrades: drag-and-drop board flow, recurring tasks, subtasks, goal linking, and gantt timeline.
- Pages workspace upgrades: single-column Notion-like markdown experience with checklists, code blocks, tables, and embedded task table token.

### Improved
- Glassmorphism UI refresh across the app shell and top navigation.
- Updated desktop app icon.

### Fixed
- Quick Capture overflow and clipped action button on narrow layouts.
- Additional UI spacing and interaction polish across planner/tasks screens.

## [1.0.3] - 2026-03-02

### Added
- Windows release pipeline with `.msi` and `.exe` installers in GitHub Releases.
- Cross-platform release workflow for macOS and Windows assets on tag push.
- Windows release automation with checksum generation.

### Fixed
- Tray/window close behavior now safely falls back when tray init fails.
- Removed panic-prone `unwrap` calls in tray/window handlers.
- Git commits widget now degrades gracefully when `git` is unavailable.

## [1.0.2] - 2026-02-24

### Fixed
- UI contrast issues in journal and navigation for light themes.
- Sidebar/header styling inconsistencies caused by hardcoded dark overlays.
- Search input placeholder readability in app header.
- Browser-mode runtime errors from Tauri notification calls (`invoke` guard).

### Improved
- Journal editor layout and action bar behavior on mobile/desktop.
- Theme-aware hover/selected states in sidebar navigation.

## [1.0.0] - 2026-02-24

### Added
- First stable public release for macOS (Apple Silicon).
- DMG packaging and release workflow documentation.
