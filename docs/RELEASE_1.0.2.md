# Dev Journal 1.0.2 Release Notes

## Build target
- Platform: macOS
- Architecture: Apple Silicon (arm64)
- Artifact: `Dev Journal_1.0.2_aarch64.dmg`
- SHA-256: `5227c6dda4fa6a4ccf86bbb9f0d0253c116d9199b0bbf917f90853dab32cb68a`

## Included scope
- Виправлено контраст і читабельність у sidebar/header/journal editor.
- Прибрано жорстко зашиті темні оверлеї, інтерфейс став theme-aware.
- Виправлено browser-mode помилку для notification plugin поза Tauri runtime.

## Release checklist
1. `npm run tauri build -- --bundles dmg`
2. `ls -lah "src-tauri/target/release/bundle/dmg/Dev Journal_1.0.2_aarch64.dmg"`
3. `shasum -a 256 "src-tauri/target/release/bundle/dmg/Dev Journal_1.0.2_aarch64.dmg"`
4. Опублікувати `.dmg` як asset релізу `v1.0.2` на GitHub
