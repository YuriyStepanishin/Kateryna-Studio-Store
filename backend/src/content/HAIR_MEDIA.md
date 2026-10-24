# Добірка: догляд за волоссям

4 відео та 10 фото. Знайдено 24.10.2026. Це зовнішні редакційні матеріали; автори не представляють omee store.

## Відео

| Назва | Автор | Мова | Джерело |
| --- | --- | --- | --- |
| Миття голови та вибір догляду: розмова з трихологом | Vichy Ukraine | Українська | [YouTube](https://www.youtube.com/watch?v=1xM7LcpMpGg) |
| Кучерявий метод: очищення, кондиціонування та укладання | НАТАЛІ ХМАРА | Українська | [YouTube](https://www.youtube.com/watch?v=DUef8f9xgN4) |
| Укладання волосся з меншим ризиком пошкодження | American Academy of Dermatology | Англійська | [YouTube](https://www.youtube.com/watch?v=YyLQRpYRALE) |
| Фарбування та завивка: поради для доглянутого волосся | American Academy of Dermatology | Англійська | [YouTube](https://www.youtube.com/watch?v=bU9CznCb9Lc) |

Відео додаються через оригінальний YouTube-плеєр. Перед записом імпорт перевіряє відповідь oEmbed, автора та наявність вбудованого плеєра. Файли відео не копіюються у Cloudinary. Доступність програвання може залежати від налаштувань автора та регіону.

## Фото

| Сюжет | Автор | Джерело |
| --- | --- | --- |
| Миття волосся в салоні | cottonbro studio | [Pexels](https://www.pexels.com/photo/woman-getting-her-hair-shampoo-3993444/) |
| Змивання догляду після миття | Oleskandra Biliak | [Pexels](https://www.pexels.com/photo/hairdresser-washing-customer-hair-23349891/) |
| Нанесення кондиціонувального догляду | Beyzanur K. | [Pexels](https://www.pexels.com/photo/close-up-of-woman-applying-hair-treatment-28994649/) |
| Сироватка для догляду за волоссям | Beyzanur K. | [Pexels](https://www.pexels.com/photo/applying-hair-serum-to-red-curls-in-close-up-28994394/) |
| Незмивний догляд у форматі спрею | Beyzanur K. | [Pexels](https://www.pexels.com/photo/applying-hair-spray-to-long-red-hair-indoors-28994645/) |
| Сушіння волосся феном | Beyzanur K. | [Pexels](https://www.pexels.com/photo/young-woman-drying-red-hair-with-hairdryer-28994570/) |
| Формування локонів | Beyzanur K. | [Pexels](https://www.pexels.com/photo/red-hair-curling-with-a-styling-iron-28994561/) |
| Розчісування дерев’яним гребінцем | Yaroslav Shuraev | [Pexels](https://www.pexels.com/photo/combing-a-woman-s-hair-5977770/) |
| Увага до довжини та кінчиків | Beyzanur K. | [Pexels](https://www.pexels.com/photo/close-up-of-red-hair-and-hands-in-soft-lighting-28994648/) |
| Інструменти для домашнього укладання | Nataliya Vaitkevich | [Pexels](https://www.pexels.com/photo/hair-styling-set-and-a-heart-shaped-hair-strands-8467962/) |

Фото використовуються за [ліцензією Pexels](https://www.pexels.com/license/). Це ілюстрації догляду, а не фото продукції магазину або свідчення результатів її використання.

Імпорт зберігає фото у поточній папці з EDITORIAL_FOLDER у mediaVerifier.js (на момент підготовки: omee/images). Перевіряє розмір від 1200 px по довгій стороні та від 800 px по короткій. У site_media записуються Cloudinary URL, підпис, автор, джерело та ліцензія.

## Запуск

```sh
npm run media:import -- --apply
```

Без --apply команда показує добірку без записів та завантажень. Альтернатива: Адмінпанель → Контент та акції → Фото та відео → Додати 4 відео та 10 фото.

Доступ до БД та схема site_media перевіряються до зовнішніх завантажень. Публікація 14 записів виконується однією транзакцією. Повторний запуск повторно використовує Cloudinary public_id, YouTube ID та source_key; змінені вручну посилання не перезаписуються. Після невдалого запису вже завантажені фото можуть залишитися у Cloudinary: повторний запуск використає їх без дублювання.

Успіх: committed: true, verified: 14, photos: 10, videos: 4; CLI додатково перевіряє verifiedPublicReads: 14 через ту саму модель, що формує медіаблок на головній.

Спроба запису 24.10.2026 з цього середовища зупинилася на ENOTFOUND до запису в БД та завантажень у Cloudinary. Живу публікацію не підтверджено.
