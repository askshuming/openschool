export const THEME_KEY = 'lessonforge-theme';
export const COURSE_CONTEXT_KEY = 'lessonforge-course-context';
export const LAST_PAYLOAD_KEY = 'lessonforge-last-payload';

export function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
}

export function initializeTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') {
    setTheme(saved);
    return saved;
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const fallback = prefersDark ? 'dark' : 'light';
  setTheme(fallback);
  return fallback;
}

export function mountThemeToggle() {
  const toggle = document.querySelector('#theme-toggle');
  const label = document.querySelector('#theme-toggle-label');
  if (!toggle || !label) return;

  const sync = (theme) => {
    const dark = theme === 'dark';
    toggle.setAttribute('aria-pressed', String(dark));
    label.textContent = dark ? 'Light' : 'Dark';
  };

  sync(initializeTheme());

  toggle.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
    sync(next);
  });
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function truncateText(text, maxLength = 36) {
  const value = String(text || '');
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

export function loadJsonStorage(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveJsonStorage(storage, key, value) {
  storage.setItem(key, JSON.stringify(value));
}
