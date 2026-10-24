'use client';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import styles from './Layout.module.css';
export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === 'dark';
  return (
    <button
      type="button"
      className={styles.themeToggle}
      disabled={!mounted}
      aria-label={dark ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'}
      title={dark ? 'Світла тема' : 'Темна тема'}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      <span aria-hidden="true">{dark ? '☀' : '☾'}</span>
      <span className={styles.themeLabel}>{dark ? 'Тема' : 'Тема'}</span>
    </button>
  );
}
