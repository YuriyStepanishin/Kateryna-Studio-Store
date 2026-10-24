'use client';
import MediaPreview from '@/components/MediaPreview';
import MediaCredit from '@/components/MediaCredit';
import BrandLogo from '@/components/BrandLogo';
import ProductPhoto from '@/components/ProductPhoto';
import ProductResults from '@/components/ProductResults';
import ProductCard, { canAddProduct } from '@/components/ProductCard';
import ProductModal from '@/components/ProductModal';
import { useAuthStore } from '@/store/auth';
import Link from 'next/link';
import DeliveryFields from '@/components/DeliveryFields';
import { PRODUCT_LINES, type ProductLine } from '@/constants/productLines';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  checkoutOrder,
  fetchCatalog,
  fetchAdminCatalog,
} from '@/services/storeApi';
import { useCart } from '@/hooks/useCart';
import styles from './Storefront.module.css';
const cx = (value: string) =>
  value
    .split(' ')
    .map(key => styles[key] || key)
    .join(' ');
import type { Product, PaymentPayload } from '@/types/store';
const money = (value: number) =>
  new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH' }).format(
    value
  );
const defaults: PaymentPayload = {
  fullName: '',
  phone: '',
  email: '',
  city: '',
  address: '',
  method: 'on_confirmation',
  deliveryCarrier: 'nova_poshta',
  deliveryType: 'branch',
};
export default function App() {
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);
  const loaded = useAuthStore(state => state.loaded);
  const preview = user?.role === 'ADMIN';
  const {
    data: catalog,
    error,
    isPending,
    refetch,
  } = useQuery({
    queryKey: ['catalog', preview ? 'admin' : 'public'],
    queryFn: preview ? fetchAdminCatalog : fetchCatalog,
    enabled: loaded,
  });
  const [category, setCategory] = useState('all');
  const [brand, setBrand] = useState('all');
  const [line, setLine] = useState<ProductLine>('women');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(defaults);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [lastAdded, setLastAdded] = useState('');
  const [cartNotice, setCartNotice] = useState('');
  const { items, addToCart, removeFromCart, changeQty, clearCart } = useCart();
  const products = catalog?.products ?? [];
  const lineProducts = products.filter(p => (p.audience || 'women') === line);
  const visible = lineProducts.filter(
    p =>
      (category === 'all' || (p.groups || [p.category]).includes(category)) &&
      (brand === 'all' || p.brand === brand) &&
      `${p.title} ${p.sku} ${p.brand || ''} ${(p.groups || [p.category]).join(' ')}`
        .toLocaleLowerCase('uk')
        .includes(search.toLocaleLowerCase('uk'))
  );
  const cart = useMemo(
    () =>
      items.flatMap(item => {
        const product = catalog?.products.find(p => p.id === item.productId);
        return product ? [{ ...item, product }] : [];
      }),
    [items, catalog]
  );
  const total = cart.reduce(
    (sum, item) => sum + item.product.price * item.qty,
    0
  );
  function addProduct(product: Product) {
    if (busy || !canAddProduct(product)) return;
    const current = items.find(item => item.productId === product.id)?.qty || 0;
    if (current >= Math.min(99, product.stock ?? 99)) {
      setCartNotice(
        'У кошику вже максимальна доступна кількість цього товару.'
      );
      return;
    }
    addToCart(product.id);
    setLastAdded(product.id);
    setCartNotice(product.title + ' — додано до кошика.');
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || !cart.length) return;
    lock.current = true;
    setBusy(true);
    setMessage('');
    try {
      const result = await checkoutOrder({
        items: cart.map(({ productId, qty }) => ({ productId, qty })),
        payment: form,
      });
      setMessage(
        `${result.message} Номер: ${result.orderId}. Сума: ${money(result.amount)}`
      );
      clearCart();
      await queryClient.invalidateQueries({ queryKey: ['catalog'] });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Не вдалося надіслати замовлення.'
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (error)
    return (
      <main className={cx('container section')}>
        <h1>Магазин тимчасово недоступний</h1>
        <p role="alert">{error.message}</p>
        <button className={cx('btn')} onClick={() => void refetch()}>
          Спробувати ще раз
        </button>
      </main>
    );
  if (isPending || !catalog)
    return (
      <p className={cx('container section')} role="status">
        Завантаження магазину…
      </p>
    );
  return (
    <>
      <main>
        {cartNotice && (
          <div className={cx('cart-notice')} role="status" aria-live="polite">
            {cartNotice} <a href="#cart">Переглянути кошик →</a>
          </div>
        )}
        {catalog.preview && (
          <div className={cx('preview-note')} role="status">
            Перегляд адміністратора: показані також чернетки. Покупці бачать
            лише опубліковані товари.{' '}
            <Link href="/admin/products">Керувати товарами →</Link>
          </div>
        )}
        {catalog.info.announcement && (
          <div className={cx('announcement')}>{catalog.info.announcement}</div>
        )}
        {!!catalog.banners?.length && (
          <section className={cx('section')}>
            <div className={cx('container')}>
              <h2 className={cx('section__title')}>Акції та пропозиції</h2>
              <ul className={cx('bannerGrid')}>
                {catalog.banners.map(banner => (
                  <li key={banner.id}>
                    <a href={banner.link || '#catalog'}>
                      <img
                        src={banner.imageUrl}
                        alt={banner.title}
                        className={cx('bannerImage')}
                      />
                      <h3>{banner.title}</h3>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
        <section className={cx('hero')} id="hero">
          <div className={cx('container hero__inner')}>
            <div className={cx('hero__content')}>
              <span className={cx('eyebrow')}>omee store · Hair care</span>
              <h1>Професійний догляд для краси вашого волосся</h1>
              <p>
                Засоби для зволоження, відновлення та захисту. Знайдіть догляд
                для своєї щоденної рутини.
              </p>
              <a className={cx('btn btn--primary')} href="#catalog">
                Перейти до каталогу
              </a>
            </div>
            <div className={cx('hero__image')}>
              {products[0]?.image ? (
                <ProductPhoto
                  className={cx('hero__photo')}
                  image={products[3].image}
                  images={products[3].images}
                  alt={products[0].title}
                  loading="eager"
                />
              ) : (
                <div className={cx('hero__placeholder')}>
                  <BrandLogo className={cx('hero__brand')} />
                  <p>Мистецтво догляду за волоссям</p>
                </div>
              )}
            </div>
          </div>
        </section>
        <section className={cx('section')} id="catalog">
          <div className={cx('container')}>
            <h2 className={cx('section__title')}>Каталог</h2>
            <div
              className={cx('product-lines')}
              role="group"
              aria-label="Лінійка товарів"
            >
              {PRODUCT_LINES.map(item => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={line === item.id}
                  onClick={() => {
                    setLine(item.id);
                    setCategory('all');
                    setBrand('all');
                    setSearch('');
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className={cx('catalog-filters')}>
              <label className={cx('search-label')}>
                Пошук
                <input
                  type="search"
                  placeholder="Назва або артикул"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </label>
              <label>
                Бренд
                <select value={brand} onChange={e => setBrand(e.target.value)}>
                  <option value="all">Усі бренди</option>
                  {[
                    ...new Set(
                      lineProducts
                        .map(p => p.brand)
                        .filter((b): b is string => Boolean(b))
                    ),
                  ]
                    .sort((a, b) => a.localeCompare(b, 'uk'))
                    .map(b => (
                      <option value={b} key={b}>
                        {b}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Група товарів
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  <option value="all">Усі групи</option>
                  {[
                    ...new Set(
                      [
                        ...(catalog.categories || []).map(c => c.name),
                        ...lineProducts.flatMap(p => p.groups || [p.category]),
                      ].filter(Boolean)
                    ),
                  ]
                    .sort((a, b) => a.localeCompare(b, 'uk'))
                    .map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                </select>
              </label>
              <button
                type="button"
                className={cx('btn btn--ghost')}
                onClick={() => {
                  setBrand('all');
                  setCategory('all');
                  setSearch('');
                  setLine('women');
                }}
              >
                Скинути
              </button>
            </div>
            <p className={cx('catalog-count')} role="status">
              Знайдено товарів: {visible.length}
            </p>
            <ProductResults
              key={JSON.stringify([line, brand, category, search, preview])}
              products={visible}
              renderItem={p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  busy={busy}
                  added={lastAdded === p.id}
                  onAdd={() => addProduct(p)}
                  onOpen={() => setSelectedProduct(p)}
                />
              )}
            />
            {!visible.length && (
              <p role="status">
                {!products.length
                  ? 'Каталог наповнюється. Товари з’являться після публікації.'
                  : 'Товарів за цим запитом немає.'}
              </p>
            )}
          </div>
        </section>
        <section className={cx('section section--alt')} id="media">
          <div className={cx('container')}>
            <h2 className={cx('section__title')}>Відео та фото</h2>
            <p>Ідеї та поради з догляду за волоссям.</p>
            <ul className={cx('media-grid')}>
              {catalog.media.map(item => (
                <li key={item.id} className={cx('media-card')}>
                  <h3>{item.title}</h3>
                  <MediaPreview item={item} className={cx('media-frame')} />
                  <MediaCredit item={item} className={cx('media-credit')} />
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className={cx('section')} id="blog">
          <div className={cx('container')}>
            <h2 className={cx('section__title')}>Корисні статті</h2><Link href="/blog">Усі статті →</Link>
            <ul className={cx('blog-grid')}>
              {catalog.blog.map(article => (
                <li className={cx('blog-card')} key={article.id}>
                  <p className={cx('blog-card__date')}>{article.date}</p>
                  <h3 className={cx('blog-card__title')}>{article.slug ? <Link href={'/blog/'+article.slug}>{article.title}</Link> : article.title}</h3>
                  <p>{article.excerpt}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className={cx('section section--alt')} id="about">
          <div className={cx('container')}>
            <h2 className={cx('section__title')}>{catalog.info.heading}</h2>
            <p>{catalog.info.description}</p>
            <ul className={cx('about__list')}>
              {catalog.info.points.map(point => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        </section>
        <section className={cx('section')} id="cart">
          <div className={cx('container')}>
            <h2 className={cx('section__title')}>Ваш кошик</h2>
            {!cart.length && <p>Кошик порожній. Оберіть товари в каталозі.</p>}
            <ul className={cx('cart-list')}>
              {cart.map(item => (
                <li key={item.productId} className={cx('cart-item')}>
                  <div>
                    <strong>{item.product.title}</strong>
                    <p>{money(item.product.price)} / шт.</p>
                    <p>{money(item.product.price * item.qty)}</p>
                  </div>
                  <div className={cx('cart-controls')}>
                    <input
                      type="number"
                      min={1}
                      max={Math.min(99, item.product.stock || 99)}
                      step={1}
                      value={item.qty}
                      disabled={busy}
                      aria-label={`Кількість: ${item.product.title}`}
                      onChange={e =>
                        changeQty(
                          item.productId,
                          Math.min(
                            Number(e.target.value),
                            item.product.stock || 99,
                            99
                          )
                        )
                      }
                    />
                    <button
                      disabled={busy}
                      onClick={() => removeFromCart(item.productId)}
                    >
                      Видалити
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className={cx('cart-total')}>Разом: {money(total)}</p>
          </div>
        </section>
        <section className={cx('section section--alt')} id="checkout">
          <div className={cx('container checkout-box')}>
            <h2 className={cx('section__title')}>Оформлення замовлення</h2>
            <p className={cx('checkout-note')}>
              Реєстрація не потрібна. Замовлення збережеться на сервері й
              очікуватиме підтвердження. Оплата онлайн ще не підключена.
            </p>
            <form className={cx('form checkout-form')} onSubmit={submit}>
              <DeliveryFields form={form} onChange={setForm} disabled={busy} />
              {(
                [
                  {
                    key: 'fullName',
                    label: 'Ім’я та прізвище',
                    type: 'text',
                    auto: 'name',
                  },
                  { key: 'phone', label: 'Телефон', type: 'tel', auto: 'tel' },
                  {
                    key: 'email',
                    label: 'Email',
                    type: 'email',
                    auto: 'email',
                  },

                ] as const
              ).map(field => (
                <label key={field.key}>
                  {field.label}
                  <input
                    type={field.type}
                    autoComplete={field.auto}
                    value={form[field.key]}
                    maxLength={120}
                    required
                    disabled={busy}
                    onChange={e =>
                      setForm({ ...form, [field.key]: e.target.value })
                    }
                  />
                </label>
              ))}
              <button
                className={cx('btn btn--primary')}
                disabled={busy || !cart.length}
              >
                {busy ? 'Надсилання…' : `Замовити на ${money(total)}`}
              </button>
            </form>
            {message && (
              <p
                className={cx('checkout-message')}
                role="status"
                aria-live="polite"
              >
                {message}
              </p>
            )}
          </div>
        </section>

      </main>
      {selectedProduct && (
        <ProductModal
          key={selectedProduct.id}
          product={selectedProduct}
          busy={busy}
          added={lastAdded === selectedProduct.id}
          onAdd={() => addProduct(selectedProduct)}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </>
  );
}
