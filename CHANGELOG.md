# Changelog

All notable changes to this project are documented in this file.

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
