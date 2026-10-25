# AUDIT_REPORT — omee store

Дата аудиту: 2026-10-25. Режим: лише читання (код змін не вносився, БД/Vercel/секрети не змінювались).
Репозиторій: `YuriyStepanishin/omee-store` (у запиті вказано `Kateryna-Studio-Store` — це стара назва; `origin` вказує на `omee-store`).

## Що НЕ вдалося перевірити (немає доступу)
Vercel CLI не встановлено, токена Vercel немає. Тому **не перевірено**: Root Directory, Framework Preset, Build/Install/Output, Environment Variables (у т.ч. `API_ORIGIN`, `DATABASE_URL`, `CORS_ORIGINS`), Production vs Preview, список deployments. Neon перевірявся лише опосередковано (через відповіді Production API). Cloudinary — лише доступність URL зображень. Значення секретів не виводились.

## 1. Поточна архітектура (фактична)

```
Браузер ──► omee-store.vercel.app  (Next.js 16, Vercel)
              ├─ App Router: frontend/src/app/*  (сторінки)
              └─ Pages Router API: frontend/src/pages/api/[...path].js
                    └─ import ../../../../backend/api/index.js
                          └─ createApp() → Express 5 (backend/src/app.js)
                                ├─ PostgreSQL Neon (pg Pool, max 5)
                                └─ Cloudinary (sign/verify/upload)
kateryna-studio-store.vercel.app ──307──► omee-store.vercel.app
```

- Express **не слухає порт** у Production: `app.listen()` лише в `backend/server.mjs` (локальна розробка). У Vercel викликається `backend/api/index.js` як handler (lazy `createApp()`).
- Браузер звертається до `/api` (`frontend/src/services/http.ts:3`, `baseURL:'/api'`) — same-origin.
- SSR для блогу викликає власний сайт через `https://$VERCEL_URL/api/...` (`frontend/src/services/articles.server.ts:5-8`), а не окремий backend.
- Окремого `vercel.json`, `middleware`/`proxy`, rewrites та `API_ORIGIN` у коді Production немає (`API_ORIGIN` — лише локальний fallback, `articles.server.ts:5`).
- Дублювання API: лише `/api/products` vs `/api/catalog` і `/api/admin/products` vs `/api/products` (різні призначення). Застарілих маршрутів-дублікатів не знайдено.

## 2. Що вже перенесено
Підтверджено запитами до `https://omee-store.vercel.app` (без другого deployment):

| Endpoint | Результат |
|---|---|
| `GET /api/health` | 200 `{"status":"ok","mode":"postgres"}` (запит до БД проходить) |
| `GET /api/catalog` | 200, ~900 КБ, 189 товарів |
| `GET /api/articles` | 200 |
| `GET /api/categories` | 200 |
| `GET /api/delivery/status` | 200 (Nova Poshta/Ukrposhta: `configured:false`, Meest: true) |
| `GET /api/auth/me` без cookie | 401 |
| `POST /api/auth/refresh` без cookie | 401 |
| `POST /api/auth/login` невірні дані | 401 `Неправильний email або пароль.` |
| `POST /api/orders` порожнє тіло | 400 (валідація; замовлення не створювалось) |
| Захищені (`/api/upload`, `/upload/video`, `/products` POST/DELETE, `/categories` POST, `/admin/content`, `/admin/categories`, `/admin/products`, `/admin/catalog`, `/admin/uploads/sign`, `/admin/articles/publish-hair-care`) без авторизації | 401 |
| CORS `Origin: https://evil.example` | `Access-Control-Allow-Origin` відсутній |
| `/api/nope` | 404 JSON |

Cookies: `HttpOnly; SameSite=Lax; Secure` (у production), access `Path=/api` 15 хв, refresh `Path=/api/auth` 7 днів (`backend/src/services/tokens.js:70-77`). Helmet, `x-powered-by` вимкнено.

## 3. Що ще не перенесено / не підтверджено
- Production, схоже, **застаріла збірка** відносно локального коду: `/manifest.webmanifest`, `/icon-192.png`, `/hero/banner-1.png` → 404; `/blog` і `/blog/<slug>` → **500**; у каталозі 143 товари з ціною 2000 і всі 189 опубліковані (тестові механізми ще активні на Production). Нові зміни (локальні, не закомічені: 87 файлів) ще не задеплоєні. HEAD = `981b506` = `origin/main`.
- Конфігурація Vercel (див. вище) — не перевірена.
- Серверних залежностей другого проєкту в коді **не знайдено**.

## 4. Помилки й ризики

### Critical
Немає підтверджених.

### High
1. **`/blog` та `/blog/[slug]` повертають 500 на Production.** Файли: `frontend/src/services/articles.server.ts:4-8` (залежить від `VERCEL_URL`; fetch власного домену з `cache:'no-store'`, таймаут 10 с; при SSR deployment-URL може бути захищений Deployment Protection → 401 → throw). Причина не підтверджена без логів Vercel. Виправлення: читати статті напряму з репозиторію/БД (виклик `articleRepository` на сервері) замість HTTP-запиту до себе; або використовувати стабільний `API_ORIGIN`/production-домен.
2. **Збірка залежить від спільного встановлення залежностей.** Імітація Vercel з Root=`frontend` (install лише у `frontend/`) завершується помилкою: `Can't resolve 'zod'` з `backend/src/validators/content.js:1` (import trace: `frontend/src/pages/api/[...path].js` → `backend/api/index.js` → `backend/src/app.js`). Бо `backend/` має власні `node_modules`, а Next збирає backend-код. Поточний Production збирається, отже Vercel налаштований інакше (імовірно Root=repo, install для обох) — **це треба підтвердити в Vercel Settings**. Ризик: зміна Root/Install Command зламає деплой. Виправлення: єдиний install (root `package.json` з workspaces або `installCommand: npm ci --prefix frontend && npm ci --prefix backend`), або перенести backend-залежності (`express, cors, helmet, pg, jsonwebtoken, bcrypt, multer, cloudinary, node-cron, zod`) у `frontend/package.json`. Для `bcrypt` (native) перевірити сумісність із Vercel runtime.
3. **Production містить тестові дані/логіку** (143 товари по 2000 грн, усі опубліковані) — див. попередню діагностику Neon; потрібні джерельні ціни, масових змін не виконано.

### Medium
4. **Rate limiter в пам'яті** (`backend/src/middleware/authLimiter.js:2`, `new Map()`): у serverless кожен інстанс має свій лічильник → захист від brute-force слабкий. Виправлення: ліміт у Neon/Upstash Redis або Vercel Firewall rate limit.
5. **`req.ip` за проксі Vercel**: немає `app.set('trust proxy', …)` (`backend/src/app.js:16`) → ключ ліміту може бути IP проксі. Виправлення: `app.set('trust proxy', 1)`.
6. **Pool у serverless** (`backend/src/config/db.js:5`, `max:5`): кожен інстанс тримає до 5 з'єднань. Рекомендовано pooled-рядок Neon (`-pooler`), `max:1–2`, `allowExitOnIdle:true`. Чи використовується pooler — не перевірено (значення `DATABASE_URL` не читались).
7. **`createApp()` без `readEnv` помилок на cold start**: невалідний env кидає виняток у handler (`backend/api/index.js:11`) → 500 без чіткого повідомлення. Додати `/api/health` з розрізненням config/DB.
8. **CORS за замовчуванням `localhost`** (`backend/src/config/env.js:9`); same-origin працює, але `CORS_ORIGINS` у Production не перевірено.
9. **Відповідь `/api/catalog` ≈ 900 КБ без кешування** (`cache-control: public, max-age=0, must-revalidate`) — повільно й дорого. Додати пагінацію/`s-maxage`.
10. **14 зображень товарів не на Cloudinary** (`https://full-force.com.ua/content/images/...`): зовнішній hotlink, CSP `img-src 'self' data:` від helmet застосовується до JSON, але для сторінок потрібно перевірити `next/image remotePatterns`. Перенести в Cloudinary (`cloudinary:migrate`).
11. **Завантаження файлів у Vercel**: Vercel Functions обмежують тіло запиту ~4.5 МБ, а `multer` дозволяє фото 5 МБ і відео 25 МБ (`backend/src/routes/catalog.js:33-34`). Є підпис прямого завантаження (`/admin/uploads/sign`) — використовувати його для відео та великих фото; прибрати серверні `/upload*` або знизити ліміт.
12. **`/api/admin/products/classify`** (`backend/src/routes/catalog.js:27`) повертає 404 на Production, хоча викликається з `frontend/src/services/catalogAdmin.ts:64-70` → Production відстає від коду.

### Low
13. `npm audit` frontend: 2 вразливості (moderate `baseline-browser-mapping`, high `source-map-js`, обидві — build-time, DoS). `npm audit fix`. Backend: 0.
14. `STORE_MODE=demo` пише файли в `backend/data/orders` (`backend/src/services/fileOrderStore.js:4-6`); у Production заборонено (`readEnv`), але в serverless FS read-only — лише для dev.
15. `node-cron` у залежностях backend; у serverless не працюватиме (перевірити, чи використовується).
16. `frontend/src/pages/api` змішує Pages Router з App Router; `bodyParser:false` коректний для Express. Рекомендовано в майбутньому перейти на `app/api/[...path]/route.ts`.
17. Локально є артефакти: `frontend/.next-production`, `frontend/dist`, `tsconfig.tsbuildinfo`; перевірити `.gitignore`. Видалено `backend/deliveryApi.test.mjs` (не закомічено).
18. Попередження Git про LF→CRLF — додати `.gitattributes`.
19. Старий домен `kateryna-studio-store.vercel.app` дає 307 на новий — це не backend, а редірект (ймовірно Redirect/Domain у проєкті).

## 5. Результати тестування
| Команда | Результат |
|---|---|
| `npm --prefix backend test` | 88/88 пройшли |
| `npm --prefix frontend run typecheck` | OK (після останніх змін) |
| `npm --prefix frontend run build` (поточне робоче дерево) | OK |
| `npm ci --prefix frontend` (HEAD, чиста копія) | OK |
| Збірка HEAD лише з `frontend` install | **Помилка**: `Can't resolve 'zod'` (див. High #2) |
| `npm audit --omit=dev` | backend 0; frontend 2 (1 moderate, 1 high) |
| `npm test` у корені = backend-тести; CI (`.github/workflows/check.yml`) ставить обидва пакети — працює |

`npm ci` для backend окремо повторно не запускався (node_modules вже встановлені; щоб не руйнувати локальне середовище).

## 6. Стан Neon і Cloudinary
**Neon** (через Production API): `health` 200 з перевіркою `SELECT 1`; каталог, категорії, статті завантажуються; 189 товарів, 0 з ціною ≤0, 0 із залишком 0; 143 з ціною 2000; усі `isPublished=true`. Схема відповідає коду для перевірених маршрутів (немає `42P01`). Замовлення не створювались. Pooler/`sslmode`/витоки з'єднань — лише за кодом (єдиний `Pool` на інстанс, `closePool` лише в `server.mjs`).
Примітка: у Neon раніше застосовано міграції 007/008 (колонки/таблиця для скасованої верифікації email) — код їх не використовує.

**Cloudinary**: перевірені 5 зображень товарів → 200 `image/webp|png`; жодний товар без зображення; 14 зображень на стороннім домені (Medium #10). Credentials лише серверні (`backend/src/config/cloudinary.js`, не `NEXT_PUBLIC_`); завантаження тільки для ADMIN (401 без авторизації); ліміти 5 МБ/25 МБ, `files:1`.

## 7. Залежність від другого Vercel-проєкту
У коді та Production-поведінці залежності **не знайдено**:
- `baseURL:'/api'` (same-origin); немає rewrites на інший домен; `API_ORIGIN` не використовується в Production-гілці (`articles.server.ts:5-8`).
- Жодних `localhost` у Production-шляху (лише dev fallback).
- `omee-store.vercel.app/api/*` відповідає самостійно (`X-Matched-Path: /api/[...path]`).
Не підтверджено: чи не встановлено в Vercel Env `API_ORIGIN`/`NEXT_PUBLIC_*`, що вказують на другий проєкт; чи другий deployment ще отримує трафік (аналітика/логи); чи не використовується він зовнішніми клієнтами/вебхуками (напр. LiqPay callback) — перевірити в Vercel.

## 8. План виправлень
1. У Vercel підтвердити Root Directory/Install/Build і Env (`DATABASE_URL`, `JWT_*`, `CLOUDINARY_*`, `CORS_ORIGINS`, відсутність посилань на другий проєкт).
2. Зафіксувати єдиний install для monorepo (High #2), перевірити Preview-збірку.
3. Виправити `/blog` 500 (High #1) — читати дані напряму; перевірити логи Vercel.
4. Після окремого підтвердження: задеплоїти поточні зміни (прибрані 2000 грн, публікація), далі відновити ціни/статуси в Neon за затвердженим планом.
5. `trust proxy`, розподілений rate-limit, pooled Neon connection, `max:1–2`.
6. Кеш для `/api/catalog`, пагінація.
7. Перенести 14 зовнішніх зображень у Cloudinary; прямі завантаження для відео.
8. `npm audit fix` у frontend; `.gitattributes`; прибрати артефакти збірки з робочого дерева.

## 9. Остаточний висновок щодо другого deployment

**ПОКИ НЕ МОЖНА** (код і Production-API доводять, що основний проєкт обслуговує API самостійно; але бракує даних Vercel для безпечного видалення).

Докази «основний проєкт самодостатній»: усі перевірені `/api/*` на `omee-store.vercel.app` відповідають (health з БД, каталог, статті, категорії, 401 для admin/upload, 400 для замовлення); у коді немає запитів на інший домен.
Що залишилось до видалення:
1. Підтвердити в Vercel Env/Domains/Webhooks, що ніщо не посилається на другий проєкт і що він не отримує трафік.
2. Виправити `/blog` 500 і підтвердити, що Production-збірка відтворювана (High #1–#2), щоб не залишитись без робочого backend.
3. Не плутати з доменом `kateryna-studio-store.vercel.app`: це, ймовірно, окремий (старий) проєкт з редіректом — перед видаленням переконатись, що редірект потрібен/перенесений.
Після виконання 1–3 видалення можна вважати безпечним.
