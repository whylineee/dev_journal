# Dev Journal 1.0.0 Release Notes

## Build target
- Platform: macOS
- Architecture: Apple Silicon (arm64)
- Artifact: `Dev Journal_1.0.0_aarch64.dmg`
- SHA-256: `d12dcbd37c41580f0ae361433dffc50040f9d05fdf2247b8711f0c1d1dfec8b8`

## Included scope
- Оновлений інтуїтивний layout (контекст активної сторінки, лічильники, підказки).
- Покращена навігація на мобільних пристроях.
- Оновлений UX пошуку та бокового меню.

## Release checklist
1. `npm run tauri build -- --bundles dmg`
2. `ls -lah "src-tauri/target/release/bundle/dmg/Dev Journal_1.0.0_aarch64.dmg"`
3. `shasum -a 256 "src-tauri/target/release/bundle/dmg/Dev Journal_1.0.0_aarch64.dmg"`
4. Опублікувати `.dmg` як asset релізу `v1.0.0` на GitHub
