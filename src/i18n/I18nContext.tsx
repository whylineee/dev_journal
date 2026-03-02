import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";

export type Language = "en" | "uk";

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const STORAGE_KEY = "devJournal_language";

const ukTranslations: Record<string, string> = {
  "Dev Journal": "Dev Journal",
  "View: {tab}": "Розділ: {tab}",
  "Ctrl/Cmd + K": "Ctrl/Cmd + K",
  "Search...": "Пошук...",
  "Search journal entries...": "Пошук записів журналу...",
  "Overview": "Огляд",
  "Planner": "Планер",
  "Daily overview": "Щоденний огляд",
  "Daily Journal": "Щоденник",
  "Today": "Сьогодні",
  "Current daily report": "Поточний щоденний звіт",
  "Done": "Готово",
  "Missing": "Відсутньо",
  "Management": "Керування",
  "Tasks": "Задачі",
  "Execution board": "Дошка виконання",
  "Goals": "Цілі",
  "Milestones": "Етапи",
  "Habits": "Звички",
  "Daily consistency": "Щоденна сталість",
  "Pages": "Сторінки",
  "New Page": "Нова сторінка",
  "Create note or doc": "Створи нотатку або документ",
  "Knowledge page": "Сторінка знань",
  "Settings & Theme": "Налаштування і тема",
  "Customize Theme": "Налаштування теми",
  "Select a theme preset:": "Вибери пресет теми:",
  "Theme preset": "Пресет теми",
  "Appearance": "Зовнішній вигляд",
  "Theme mode": "Режим теми",
  "Dark": "Темна",
  "Light": "Світла",
  "Font": "Шрифт",
  "Density": "Щільність",
  "Comfortable": "Зручна",
  "Compact": "Компактна",
  "Corner radius (6-24)": "Радіус кутів (6-24)",
  "Language": "Мова",
  "English": "Англійська",
  "Ukrainian": "Українська",
  "Productivity": "Продуктивність",
  "Show journal markdown preview": "Показувати markdown-перегляд журналу",
  "Show page markdown preview": "Показувати markdown-перегляд сторінки",
  "Enable draft autosave": "Увімкнути автозбереження чернеток",
  "Reminders": "Нагадування",
  "Enable daily journal reminder": "Увімкнути щоденне нагадування",
  "Reminder hour (0-23)": "Година нагадування (0-23)",
  "Data": "Дані",
  "Export Backup (JSON)": "Експорт бекапу (JSON)",
  "Replace existing data on import": "Замінювати існуючі дані при імпорті",
  "Import Backup (JSON)": "Імпорт бекапу (JSON)",
  "Importing...": "Імпорт...",
  "Backup imported successfully.": "Бекап успішно імпортовано.",
  "Import failed. Check JSON format.": "Імпорт не вдався. Перевір формат JSON.",
  "Import failed. Invalid JSON file.": "Імпорт не вдався. Невалідний JSON-файл.",
  "Reset": "Скинути",
  "Done button": "Готово",
  "Open Planner": "Відкрити планер",
  "Switch to daily command center": "Перейти до щоденного центру керування",
  "Go to Today Journal": "Перейти до журналу за сьогодні",
  "Open today's daily entry": "Відкрити сьогоднішній запис",
  "Open Tasks Board": "Відкрити дошку задач",
  "Tasks Board": "Дошка задач",
  "Switch to tasks management view": "Перейти до керування задачами",
  "Open Overdue Tasks": "Відкрити прострочені задачі",
  "Switch to tasks with overdue filter": "Перейти до задач з фільтром прострочених",
  "Open Goals Board": "Відкрити дошку цілей",
  "Switch to long-term goals tracking": "Перейти до відстеження довгострокових цілей",
  "Open Habits Tracker": "Відкрити трекер звичок",
  "Switch to routine and streak tracking": "Перейти до відстеження рутини та стріків",
  "Open Insights": "Відкрити Insights",
  "Decision logs, incidents and retros": "Логи рішень, інциденти та ретро",
  "Create New Page": "Створити нову сторінку",
  "Open editor in new page mode": "Відкрити редактор у режимі нової сторінки",
  "Open Settings": "Відкрити налаштування",
  "Theme, reminders and data controls": "Тема, нагадування та керування даними",
  "Switch to {mode} Mode": "Перемкнути на {mode} тему",
  "Quick Actions": "Швидкі дії",
  "Status": "Статус",
  "All statuses": "Всі статуси",
  "Priority": "Пріоритет",
  "All priorities": "Всі пріоритети",
  "Overdue Only": "Лише прострочені",
  "Journal": "Журнал",
  "Jump to saved daily entry": "Перейти до збереженого щоденного запису",
  "Jump to page editor": "Перейти до редактора сторінки",
  "Open Goals: {title}": "Відкрити цілі: {title}",
  "Open Habits: {title}": "Відкрити звички: {title}",
  "Streak {count}d": "Серія {count}д",
  "Dev Journal Reminder": "Нагадування Dev Journal",
  "It's past {hour}:00. Time to write your dev journal!": "Вже після {hour}:00. Час заповнити щоденник!",
  "Daily command center for journal, tasks, goals, and habits.": "Щоденний центр керування журналом, задачами, цілями та звичками.",
  "Journal Today": "Журнал сьогодні",
  "Open Tasks": "Відкрити задачі",
  "Open Goals": "Відкрити цілі",
  "Open Habits": "Відкрити звички",
  "Quick Capture": "Швидке додавання",
  "Capture a task without leaving the planner.": "Додай задачу, не виходячи з планера.",
  "Quick task title": "Швидка назва задачі",
  "Due today": "На сьогодні",
  "Add Task": "Додати задачу",
  "Task added to board.": "Задачу додано на дошку.",
  "Overdue": "Прострочено",
  "Goals in 14d": "Цілі за 14 днів",
  "Habits done today": "Звички виконано сьогодні",
  "Tasks Due Today": "Задачі на сьогодні",
  "View All": "Переглянути всі",
  "No tasks due today.": "Сьогодні немає задач із дедлайном.",
  "Overdue Tasks": "Прострочені задачі",
  "Resolve": "Опрацювати",
  "No overdue tasks.": "Немає прострочених задач.",
  "Goals Near Deadline": "Цілі з близьким дедлайном",
  "Manage": "Керувати",
  "No active goals with deadlines in next 14 days.": "Немає активних цілей з дедлайном у найближчі 14 днів.",
  "Habits Today": "Звички сьогодні",
  "Track": "Відмічати",
  "No habits configured yet.": "Звички ще не налаштовані.",
  "New Goal": "Нова ціль",
  "New Habit": "Нова звичка",
  "Needs Attention": "Потребує уваги",
  "Priority: {priority}": "Пріоритет: {priority}",
  "No date": "Без дати",
  "Type a command or search": "Введи команду або пошук",
  "{count} commands": "{count} команд",
  "No commands found.": "Команди не знайдено.",
  "Insights": "Insights",
  "Decisions, incidents, retros": "Рішення, інциденти, ретро",
  "Track engineering decisions, incidents, retros, and developer intelligence.": "Фіксуй інженерні рішення, інциденти, ретро та інженерну аналітику.",
  "Mini ADR Log": "Міні ADR лог",
  "Capture architecture and implementation decisions with context and consequences.": "Фіксуй архітектурні та імплементаційні рішення з контекстом і наслідками.",
  "Decision title": "Назва рішення",
  "Problem": "Проблема",
  "Decision": "Рішення",
  "Rationale": "Обґрунтування",
  "Consequences": "Наслідки",
  "Review date": "Дата перегляду",
  "Save ADR": "Зберегти ADR",
  "No ADR records yet.": "Записів ADR ще немає.",
  "Created": "Створено",
  "Review": "Перегляд",
  "Delete": "Видалити",
  "What Broke Log": "Що зламалось",
  "Capture incidents and how you fixed them to build a practical bug knowledge base.": "Фіксуй інциденти та як ти їх полагодив, щоб збирати практичну базу знань по багах.",
  "Incident title": "Назва інциденту",
  "Severity": "Критичність",
  "Low": "Низька",
  "Medium": "Середня",
  "High": "Висока",
  "Critical": "Критична",
  "Symptoms": "Симптоми",
  "Root cause": "Причина",
  "Fix": "Виправлення",
  "How to prevent next time": "Як запобігти наступного разу",
  "Save incident": "Зберегти інцидент",
  "No incidents logged yet.": "Інцидентів ще немає.",
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const interpolate = (template: string, vars?: Record<string, string | number>) => {
  if (!vars) {
    return template;
  }

  return Object.entries(vars).reduce((result, [key, value]) => {
    return result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  }, template);
};

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "uk" ? "uk" : "en";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const value = useMemo<I18nContextValue>(() => {
    return {
      language,
      setLanguage,
      t: (key: string, vars?: Record<string, string | number>) => {
        if (language === "en") {
          return interpolate(key, vars);
        }

        const translated = ukTranslations[key] ?? key;
        return interpolate(translated, vars);
      },
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
};
