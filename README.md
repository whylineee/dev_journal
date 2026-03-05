# Dev Journal

**Dev Journal** — це сучасний десктопний застосунок для розробників, створений для ведення робочого щоденника, нотаток та відстеження робочого процесу. Проєкт побудований за допомогою фреймворку **Tauri** (Rust) для забезпечення високої продуктивності та **React** (TypeScript) для створення зручного користувацького інтерфейсу.

## 🚀 Основні можливості

- **Ведення нотаток:** Створення, редагування та видалення щоденних записів із повноцінною підтримкою Markdown.
- **Git-інтеграція:** Можливість отримувати інформацію про останні Git-коміти для прив'язки їх до щоденних звітів.
- **Миттєвий пошук:** Швидкий пошук необхідної інформації серед усіх збережених записів.
- **Локальне збереження:** Всі дані надійно та конфіденційно зберігаються локально за допомогою вбудованої бази даних SQLite.
- **Інтеграція з ОС:** 
  - Робота у фоновому режимі та в системному треї (System Tray).
  - Підтримка автозавантаження разом із системою (Autostart).
  - Нативні системні сповіщення.
- **Сучасний дизайн (UI/UX):** Інтерфейс побудований із використанням Material-UI (MUI), плавних анімацій Framer Motion та підтримкою кастомних тем (світла/темна тема, власні кольори).

## 🛠 Технологічний стек

### Frontend
- **Ядро:** [React](https://reactjs.org/) (v19), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **UI та Стилізація:** [Material-UI (MUI)](https://mui.com/), `@emotion/react`
- **Анімації та Інтерактив:** [Framer Motion](https://www.framer.com/motion/)
- **Візуалізація даних:** [Recharts](https://recharts.org/) (графіки та статистика)
- **Функціонал:** `react-markdown` для відображення розмітки.

### Backend (Десктопне ядро Tauri)
- **Фреймворк:** [Tauri v2](https://v2.tauri.app/)
- **Мова програмування:** [Rust](https://www.rust-lang.org/)
- **База даних:** [SQLite (rusqlite)](https://github.com/rusqlite/rusqlite)

## 📦 Встановлення та запуск

### Вимоги до системи
- [Node.js](https://nodejs.org/) (версія 18+)
- [Rust](https://www.rust-lang.org/tools/install)
- [Системні залежності Tauri (в залежності від ОС)](https://v2.tauri.app/start/prerequisites/)

### Кроки для локального запуску (Режим розробки)

1. Встановіть залежності для frontend:
   ```bash
   npm install
   ```

2. Запустіть проєкт:
   ```bash
   npm run tauri:dev
   ```

### Збірка застосунку
Для створення готового виконуваного файлу (`.app`, `.exe` або `.deb` залежно від вашої ОС) виконайте:
```bash
npm run tauri:build
```

### Release (macOS ARM64)
Поточний production-потік для macOS:

1. Побудувати реліз лише в `.dmg`:
   ```bash
   npm run tauri:build:mac
   ```
2. Перевірити артефакт:
   ```bash
   ls -lah "src-tauri/target/release/bundle/dmg/Dev Journal_1.0.3_aarch64.dmg"
   ```
3. Згенерувати checksum:
   ```bash
   shasum -a 256 "src-tauri/target/release/bundle/dmg/Dev Journal_1.0.3_aarch64.dmg"
   ```

### Release (Windows x64)
Windows-версію потрібно збирати на Windows-хості (або у CI з `windows-latest`):

1. Побудувати `.msi` + `.exe` (NSIS):
   ```bash
   npm run tauri:build:windows
   ```
2. Перевірити артефакти:
   ```bash
   dir "src-tauri\\target\\x86_64-pc-windows-msvc\\release\\bundle\\msi"
   dir "src-tauri\\target\\x86_64-pc-windows-msvc\\release\\bundle\\nsis"
   ```
3. Або запустити GitHub Actions workflow `Build Desktop Release` (`.github/workflows/build-desktop-release.yml`) і забрати артефакти з розділу Artifacts.
4. Для production-релізу створіть git tag формату `v*` (наприклад, `v1.0.3`) - workflow автоматично прикріпить `.msi`, `.exe`, `.dmg` та checksum-файли до GitHub Release.

## 📂 Архітектура та структура проєкту

- `src/` — Вихідний код frontend:
  - `components/` — Перевикористовувані компоненти (EntryForm, Layout та інші).
  - `types/` — Описи TypeScript-інтерфейсів.
  - `App.tsx` — Головний компонент застосунку.
- `src-tauri/` — Вихідний код десктопного ядра (Rust):
  - `src/models.rs` — Основні структури даних (записи, налаштування).
  - `src/db.rs` — Логіка взаємодії з SQLite (ініціалізація та міграції).
  - `src/commands.rs` — Tauri-команди, які експортуються для виклику з frontend.
  - `src/tray.rs` — Налаштування поведінки системного трея (меню, кліки).
  - `src/lib.rs` — Точка входу Tauri, ініціалізація плагінів (fs, os, autostart, notification).

## 🧭 Документація для розробки

- `/Users/marko/Desktop/Projects/dev-journal/docs/ARCHITECTURE.md` — актуальна схема шарів, відповідальностей та правил додавання нового функціоналу.
- `/Users/marko/Desktop/Projects/dev-journal/AGENTS.md` — живий технічний паспорт проєкту для AI-агентів і розробників: функціонал, архітектура, домени, обмеження, workflow.

## 📖 Документація API (Tauri Commands)

Спілкування між React та Rust відбувається через безпечні виклики команд (Invoke API). Доступні методи:

- `get_entries()` — Отримання повного списку всіх збережених записів.
- `get_entry(id: i32)` — Отримання деталей конкретної нотатки за її ідентифікатором.
- `save_entry(entry: EntryInput)` — Збереження нової або оновлення існуючої нотатки у базі даних (CRUD).
- `search_entries(query: String)` — Текстовий пошук за вмістом та заголовками записів.
- `get_git_commits(path: String)` — Читання локальної історії Git-репозиторію за вказаним шляхом для отримання коммітів.

---

*Розроблено спеціально для підвищення продуктивності розробників.*
