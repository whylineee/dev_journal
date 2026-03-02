# Dev Journal 1.0.3 Release Notes

## Build targets
- Platform: macOS
- Architecture: Apple Silicon (arm64)
- Artifact: `Dev-Journal-1.0.3-macos-arm64.dmg`
- SHA-256: `09d364eaf049b0e23d8021d90afdaa6bd7005a858815eac4b94b521fee41bf1d`

- Platform: Windows
- Architecture: x64
- Artifacts:
  - `Dev-Journal-1.0.3-windows-x64.msi`
  - `Dev-Journal-1.0.3-windows-x64-setup.exe`
- SHA-256: see `checksums-windows.txt` in GitHub Release assets.

## Included scope
- Додано повноцінний release-потік для Windows installers (`.msi` + `.exe`).
- Додано кросплатформений workflow для автоматичного прикріплення macOS + Windows assets до GitHub Release.
- Стабілізовано runtime-поведінку трея/закриття вікна для Windows.
- Додано безпечний fallback для Git-інтеграції, якщо `git` відсутній у системі.

## Release checklist
1. `npm run tauri:build:mac`
2. `ls -lah "src-tauri/target/release/bundle/dmg/Dev Journal_1.0.3_aarch64.dmg"`
3. `shasum -a 256 "src-tauri/target/release/bundle/dmg/Dev Journal_1.0.3_aarch64.dmg"`
4. Push `main` + tag `v1.0.3` to GitHub.
5. Перевірити, що workflow `Build Desktop Release` прикріпив `.dmg`, `.msi`, `.exe` і checksum-файли до релізу `v1.0.3`.
