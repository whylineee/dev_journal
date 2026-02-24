# Dev Journal 0.1.0 Release Notes

## Build target
- Platform: macOS
- Architecture: Apple Silicon (arm64)
- Artifact: `Dev-Journal-0.1.0-macos-arm64.zip`

## Included scope
- Оновлений інтуїтивний layout (контекст активної сторінки, лічильники, підказки).
- Покращена навігація на мобільних пристроях.
- Оновлений UX пошуку та бокового меню.

## Release checklist
1. `npm run tauri build`
2. `ditto -c -k --sequesterRsrc --keepParent "src-tauri/target/release/bundle/macos/Dev Journal.app" "releases/Dev-Journal-0.1.0-macos-arm64.zip"`
3. `shasum -a 256 "releases/Dev-Journal-0.1.0-macos-arm64.zip"`
4. Завантажити zip в `lending_dev-journal/public/downloads/`
5. Оновити кнопку завантаження на лендингу
