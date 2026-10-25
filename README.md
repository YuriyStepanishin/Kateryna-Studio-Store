# Kateryna Studio Store

Магазин за ТЗ KM-studio. Фронтенд — у `frontend/`, бекенд — у `backend/`. Кореневий package.json містить зручні команди для обох застосунків.

## Структура

```text
frontend/    Next.js, src/, public/, конфігурація, залежності
backend/     Express, src/, migrations/, конфігурація, залежності
.github/     спільні перевірки CI
package.json команди запуску з кореня
```

## Поточний етап

Підготовлений каркас етапу 1: Next.js 16 App Router, TypeScript, CSS Modules, layout із Header/Footer/Container; TanStack Query + Axios; кошик Zustand із відновленням після hydration. Express 5 API має окремі routes/controllers/models/services/middleware/config/validators. PostgreSQL pool налаштований для Neon. Міграція створює таблиці з ТЗ та refresh_tokens для майбутньої авторизації.

Backend і frontend мають окремі Node.js/TypeScript перевірки. У локальному середовищі доступні Neon health check і каталог через API; міграції залишаються ручними та не запускаються під час build/deploy.

## Встановлення і запуск (Node.js 22+)

У корені:

```powershell
npm --prefix frontend ci
npm --prefix backend ci
# Лише якщо відповідного .env ще немає:
Copy-Item frontend/.env.example frontend/.env.local
Copy-Item backend/.env.example backend/.env
```

Запуск магазину:

```powershell
npm run dev
```

`npm run dev` запускає Next.js; його API Route викликає Express handler в тому ж процесі. Окремий `npm run backend:start` залишений для прямого локального запуску й ручних перевірок API, але для звичайної розробки разом із Next запускати обидва процеси не потрібно. Команди можна виконувати з кореня; у папках також працюють стандартні `npm run dev` та `npm start`.

Магазин: http://localhost:5173. Next.js API Route передає `/api/*` на Express без окремого API-домену. Локально `API_ORIGIN` використовується лише серверним завантаженням статей і за замовчуванням вказує на Next.js `127.0.0.1:5173`; щоб тестувати окремий процес Express, задайте `http://127.0.0.1:5001`.

## Режими даних

`STORE_MODE=demo`: демонстраційний каталог і замовлення у `backend/data/orders/*.json`. Це локальна демонстрація без оплати. Файли з контактами клієнтів і `.env` виключені з git.

`STORE_MODE=postgres`: каталог і замовлення в PostgreSQL. Потрібна `DATABASE_URL` окремої БД магазину. Не використовуйте бази SODA/OLGATORG/LASKA. Вкажіть Neon URL із `sslmode=require` у `backend/.env`, потім:

```powershell
npm --prefix backend run db:migrate
```

Після успішної міграції встановіть `STORE_MODE=postgres` і перезапустіть бекенд. У новій БД каталог порожній; керування товарами та наповнення — наступний етап. Міграції виконуються вручну, транзакційно, з advisory lock і перевіркою checksum. Автоматичне створення ADMIN відсутнє.

Сервер визначає ціну самостійно, блокує рядки залишків під час створення замовлення і зменшує stock у тій самій транзакції. Статус нового замовлення — NEW. Зміна статусів і повернення резерву при скасуванні ще не реалізовані.

## Перевірки

```powershell
npm test
npm run typecheck
npm run build
```

Тести без зовнішніх залежностей перевіряють валідацію, файлове збереження demo, заборону demo у production та транзакційну логіку замовлень із тестовим DB-клієнтом. Це не інтеграційна перевірка справжньої PostgreSQL або Express HTTP.

## Розміщення

Vercel: Framework Next.js, Root Directory `frontend`, Node.js 22. Увімкніть `Include source files outside of the Root Directory`, щоб Next міг зібрати наявний Express-код із `backend/`. Install Command: `npm ci --prefix ../backend && npm ci`; Build Command: `npm run build`; Output Directory залиште автоматичним для Next.js. Не додавайте catch-all rewrite: Next API Route `src/pages/api/[...path].js` передає всі `/api/*` Express handler-у, решту URL обробляє App Router.

У Vercel Environment Variables задайте `STORE_MODE=postgres`, Neon `DATABASE_URL` із `sslmode=require`, два різні JWT secrets довжиною від 32 символів, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` і `CLOUDINARY_API_SECRET`. Для доставки додайте `NOVA_POSHTA_API_KEY` та/або `UKRPOSHTA_BEARER` за потреби. `API_ORIGIN` у production не потрібний: серверні запити статей використовують deployment `VERCEL_URL`. Не задавайте secrets як `NEXT_PUBLIC_*`.

У Cloudinary Console вручну створіть два **підписані** Upload Presets:

1. `omee_signed_images`: signed preset; формати `jpg`, `jpeg`, `png`, `webp`; max file size `5,242,880` bytes; папка `omee/images`.
2. `omee_signed_videos`: signed preset; формати `mp4`, `webm`; max file size `26,214,400` bytes (25 MiB); папка `omee/videos`.

Frontend звіряє preset, папку, тип ресурсу й дозволені формати з підписаною відповіддю backend, а браузер завантажує файл напряму до Cloudinary. Перевірка розміру до видачі підпису спирається на заявлений клієнтом розмір і не є обмеженням самого завантаження. Після upload backend перевіряє Cloudinary resource type, фактичний формат і байти, папку, підписаний public ID та HTTPS URL перед тим, як дозволити збереження посилання. Невідповідність відхиляється, але файл, уже завантажений напряму, автоматично не видаляється. Фактичні обмеження під час приймання файлу залежать від Cloudinary Console: перевірте, що обидва presets signed і мають саме вказані папки, формати та ліміти. Ці налаштування не можна підтвердити лише кодом. `CLOUDINARY_API_SECRET` залишається лише на сервері. Наявні URL із `kateryna-studio/images` та `omee/images` перевіряються за Cloudinary ресурсом і не переносяться чи перейменовуються. Не налаштовуйте окремий Render service та не створюйте Vercel rewrites для `/api`.

Preview deployments мають використовувати окрему Neon гілку/БД або сумісні production credentials із належною обережністю. Vercel не запускає міграції автоматично: застосуйте чинні SQL-міграції до Neon вручну перед переключенням `STORE_MODE=postgres`. Цей код не змінює схему даних.

## Авторизація

Додані `/login`, `/register` та базовий `/profile`. API `/api/auth/register`, `/login`, `/refresh`, `/logout`, `/me` використовує PostgreSQL, bcrypt та JWT у HttpOnly cookies. Паролі й токени не повертаються в профілі; refresh зберігається у БД як digest і змінюється під час оновлення сесії. Нові акаунти мають лише CUSTOMER. Потрібні два різні JWT secrets по 32+ символи в backend/.env; локальні ключі вже згенеровані. Після зміни коду або .env перезапустіть бекенд або використовуйте `npm run backend:dev`.

## Далі за ТЗ

Перевірити авторизацію на справжній БД. Етап 3: керування категоріями, товарами й фото. Повний перелік стану — `IMPLEMENTATION.md`.

## Адмінпанель каталогу та контенту

1. Виконайте `npm run db:migrate` для міграції 002_site_content.sql.
2. Зареєструйте свій акаунт і виконайте з кореня `npm run admin:promote -- your-email@example.com`. Ця CLI-команда призначає ADMIN лише вказаному існуючому акаунту; публічного API призначення ролей немає.
3. Перезавантажте кабінет: з’явиться посилання Керування магазином (/admin).
4. Додайте CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET у backend/.env і перезапустіть бекенд. Не додавайте їх у frontend/.env.

Розділи: категорії, товари, інформація/контакти, фото/відео, акційні банери, промокоди. Редагування захищене серверною перевіркою ADMIN. У видаленні використовується приховування, яке можна скасувати через редагування. Файли надсилаються в Cloudinary через бекенд, посилання зберігаються в Neon після збереження форми. Без Cloudinary можна вказувати готові HTTPS-посилання. Промокоди поки не застосовуються до суми checkout; онлайн-оплата не підключена.
## Довідники доставки

Оформлення підтримує відділення / кур’єра для трьох перевізників та поштомати Нової пошти й Meest. Міста й пункти отримання завантажуються через серверні `/api/delivery/cities` та `/api/delivery/points`. Ключі не передаються браузеру. Якщо довідник недоступний, покупець може ввести адресу вручну.

У `backend/.env` додайте:

```dotenv
NOVA_POSHTA_API_KEY=
UKRPOSHTA_BEARER=
```

Ключ Нової пошти створюється в бізнес-кабінеті (Налаштування → Безпека). Bearer Укрпошти надається до договору; використовується адресний класифікатор v3.20. Meest PublicAPI не потребує ключа. Після зміни `.env` перезапустіть backend. `/api/delivery/status` показує наявність налаштувань, а не результат перевірки зв’язку.

Це підключення довідників. Розрахунок тарифу, автоматичне створення ТТН і виклик кур’єра наразі не реалізовані. Адреса та вибраний спосіб отримання записуються в замовлення; доступність і вартість доставки підтверджує менеджер.

Офіційні джерела: https://novaposhta.ua/for-business/cooperation/integration/ ; https://dev.ukrposhta.ua/uploads/Address-classifier-v3.20-11022026.pdf ; https://publicapi.meest.com/ .

## Статті про догляд

`npm run blog:publish -- --apply` публікує сім оригінальних статей у Neon із `backend/.env`. Без `--apply` команда лише читає схему й показує план. Імпорт перевіряє `information_schema`, створює `blog_posts` лише за відсутності іншої таблиці статей, реєструє міграцію `005_blog_posts.sql` і записує матеріали однією транзакцією. Slug, заголовок і хеш повного тексту захищають від дублікатів; конфлікт із зміненим текстом скасовує імпорт без перезапису. Перевірка опублікованих рядків виконується до COMMIT, а CLI додатково перечитує список і повні тексти після запису.

Альтернативний запуск: **Адмінпанель → Статті → Опублікувати 7 статей**. Кнопка потребує ADMIN і перевіряє публічний список після запису. Сторінки доступні на `/blog` і `/blog/[slug]`, блок на головній отримує опубліковані матеріали з БД. SEO-заголовок, опис і Open Graph формуються для кожної статті; джерела відображаються після повного тексту.

Це нові редакційні тексти за сімома вказаними темами. Точні тексти з розмови «Статті про догляд» не були доступні. Живе підключення до Neon у середовищі виконання перевірено 2026-10-24: `ENOTFOUND`, запис не розпочато. Локальні тести не замінюють підтвердження реального запису; успіх імпорту підтверджують `committed: true`, `published: 7` і `verifiedPublicReads: 7` у виводі команди.

## Фото й відео про догляд

Підготовлено 4 відео (2 українською, 2 англійською) та 10 фото Pexels. Повний перелік авторів, джерел і умови імпорту: [добірка медіа](backend/src/content/HAIR_MEDIA.md).

Запуск: `npm run media:import -- --apply`. Без `--apply` показується лише план. Кнопка в інтерфейсі: **Адмінпанель → Контент та акції → Фото та відео → Додати 4 відео та 10 фото**. Фото завантажуються до Cloudinary у поточну папку медіа, відео відображаються оригінальним YouTube-плеєром. Посилання, автори та ліцензії зберігаються у `site_media`; міграція `006_media_sources.sql` застосовується й реєструється імпортом автоматично. Повторний запуск не створює дублікатів.

## Локальна production-версія

```sh
npm run build
npm start
```

`npm start` запускає готову production-збірку на порту 5173. Перед запуском зупиніть development-сервер на цьому порту. API запускається окремо через `npm run backend:start`. Для публічного сервера застосуйте змінні середовища з розділу «Розміщення»; секрети не додаються до git.

Production-збірка зберігається у `frontend/.next-production`, development — у `frontend/.next`. Це розділяє вихідні файли та зменшує конфлікти запису під час локальної роботи. Онлайн-публікація потребує окремого деплою.
