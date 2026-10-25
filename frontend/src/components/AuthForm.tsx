'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { login, register as registerAccount } from '@/services/auth';
import { useAuthStore } from '@/store/auth';
import styles from './Auth.module.css';
const schema = z.object({
  name: z.string().optional(),
  email: z.string().email('Вкажіть коректний email.'),
  password: z
    .string()
    .min(8, 'Щонайменше 8 символів.')
    .refine(
      value => new TextEncoder().encode(value).length <= 72,
      'Пароль завеликий (максимум 72 байти).'
    ),
});
type Fields = z.infer<typeof schema>;
export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const setSession = useAuthStore(s => s.setSession);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const isRegister = mode === 'register';
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({ resolver: zodResolver(schema) });
  async function submit(values: Fields) {
    setMessage('');
    if (isRegister && (!values.name || values.name.trim().length < 2)) {
      setError('name', { message: 'Вкажіть ім’я (від 2 символів).' });
      return;
    }
    try {
      const user = await (isRegister ? registerAccount(values) : login(values));
      setSession(user);
      router.replace('/profile');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не вдалося увійти.');
    }
  }
  return (
    <main className={styles.page}>
      <h1>{isRegister ? 'Зареєструватися' : 'Вхід до магазину'}</h1>
      <form className={styles.form} onSubmit={handleSubmit(submit)} noValidate>
        {isRegister && (
          <label>
            Ім’я
            <input
              {...register('name')}
              autoComplete="name"
              maxLength={120}
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && (
              <span className={styles.error}>{errors.name.message}</span>
            )}
          </label>
        )}
        <label>
          Email
          <input
            {...register('email')}
            type="email"
            autoComplete="email"
            maxLength={254}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && (
            <span className={styles.error}>{errors.email.message}</span>
          )}
        </label>
        <div className={styles.passwordField}>
          <label htmlFor="auth-password">Пароль</label>
          <div className={styles.passwordControl}>
            <input
              id="auth-password"
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            <button
              className={styles.passwordToggle}
              type="button"
              aria-controls="auth-password"
              aria-label={showPassword ? 'Приховати пароль' : 'Показати пароль'}
              aria-pressed={showPassword}
              disabled={isSubmitting}
              onClick={() => setShowPassword(value => !value)}
            >
              {showPassword ? 'Приховати' : 'Показати'}
            </button>
          </div>
          {errors.password && (
            <span id="password-error" className={styles.error}>
              {errors.password.message}
            </span>
          )}
        </div>
        <button disabled={isSubmitting}>
          {isSubmitting
            ? 'Зачекайте…'
            : isRegister
              ? 'Зареєструватися'
              : 'Увійти'}
        </button>
        {message && (
          <p role="alert" className={styles.error}>
            {message}
          </p>
        )}
      </form>
      <Link className={styles.link} href={isRegister ? '/login' : '/register'}>
        {isRegister
          ? 'Уже маєте акаунт? Увійти'
          : 'Якщо ще немаєте акаунта? Зареєструватися'}
      </Link>
    </main>
  );
}
