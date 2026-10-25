'use client';
import { useSyncExternalStore } from 'react';
import css from '../shared/Layout.module.css';

const STORAGE_KEY = 'kateryna-theme';
const listeners = new Set<() => void>();
const isDark = () => document.documentElement.dataset.theme === 'dark';
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

function setTheme(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {}
  listeners.forEach(listener => listener());
}

export default function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  return (
    <button
      type="button"
      className={css.themeToggle}
      aria-label={dark ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'}
      title={dark ? 'Світла тема' : 'Темна тема'}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      <span aria-hidden="true">{dark ? '☀' : '☾'}</span>
      <span className={css.themeLabel}>Тема</span>
    </button>
  );
}
