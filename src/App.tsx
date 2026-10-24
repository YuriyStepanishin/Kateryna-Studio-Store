import { FormEvent, useEffect, useMemo, useState } from 'react';
import { checkoutOrder, fetchCatalog } from './api/storeApi';
import { useAuth } from './context/AuthContext';
import { useCart } from './context/CartContext';
import type {
  CatalogResponse,
  PaymentPayload,
  Product,
  ProductCategory,
} from './types/store';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    maximumFractionDigits: 0,
  }).format(price);

const paymentDefaults: PaymentPayload = {
  fullName: '',
  phone: '',
  email: '',
  city: '',
  address: '',
  method: 'card',
  cardLast4: '',
};

function App() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState<ProductCategory | 'all'>('all');

  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [paymentForm, setPaymentForm] =
    useState<PaymentPayload>(paymentDefaults);
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  const { user, loading: authBusy, register, login, logout } = useAuth();
  const { items, addToCart, removeFromCart, changeQty, clearCart, itemsCount } =
    useCart();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchCatalog();
        setCatalog(data);
      } catch {
        setError('Не вдалося завантажити дані магазину. Спробуйте пізніше.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (user?.email) {
      setPaymentForm(prev => ({
        ...prev,
        email: user.email,
        fullName: user.name,
      }));
    }
  }, [user]);

  const products = catalog?.products ?? [];
  const visibleProducts = useMemo(() => {
    if (category === 'all') {
      return products;
    }
    return products.filter(item => item.category === category);
  }, [products, category]);

  const categories = useMemo(
    () => Array.from(new Set(products.map(item => item.category))),
    [products]
  );

  const cartProducts = useMemo(() => {
    const map = new Map<string, Product>();
    for (const product of products) {
      map.set(product.id, product);
    }

    return items
      .map(item => {
        const product = map.get(item.productId);
        if (!product) {
          return null;
        }
        return {
          ...item,
          product,
          lineTotal: item.qty * product.price,
        };
      })
      .filter(Boolean) as Array<{
      productId: string;
      qty: number;
      product: Product;
      lineTotal: number;
    }>;
  }, [items, products]);

  const totalAmount = cartProducts.reduce(
    (sum, item) => sum + item.lineTotal,
    0
  );

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCheckoutMessage('');

    try {
      if (mode === 'register') {
        await register({ name, email, password });
      } else {
        await login(email);
      }
      setName('');
      setPassword('');
    } catch {
      setCheckoutMessage(
        'Помилка авторизації. Перевірте дані й спробуйте ще раз.'
      );
    }
  };

  const handleCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      setCheckoutMessage('Для оплати потрібно увійти або зареєструватися.');
      return;
    }

    if (!cartProducts.length) {
      setCheckoutMessage('Кошик порожній. Додайте товари перед оплатою.');
      return;
    }

    setCheckoutBusy(true);
    setCheckoutMessage('');

    try {
      const result = await checkoutOrder({
        userId: user.id,
        items: cartProducts.map(item => ({
          productId: item.productId,
          qty: item.qty,
        })),
        payment: paymentForm,
      });

      setCheckoutMessage(
        `${result.message} Номер замовлення: ${result.orderId}`
      );
      clearCart();
      setPaymentForm(prev => ({
        ...paymentDefaults,
        email: prev.email,
        fullName: prev.fullName,
      }));
    } catch {
      setCheckoutMessage(
        'Оплата не пройшла. Спробуйте інший метод або повторіть пізніше.'
      );
    } finally {
      setCheckoutBusy(false);
    }
  };

  if (loading) {
    return <p className="container section">Завантаження магазину...</p>;
  }

  if (error || !catalog) {
    return (
      <p className="container section">
        {error || 'Немає даних для відображення.'}
      </p>
    );
  }

  return (
    <>
      <div className="top-bar">
        <p className="top-bar-text">
          Безкоштовна доставка від 2000 грн • Подарунки до кожного 3-го
          замовлення • Оплата онлайн
        </p>
      </div>

      <header className="header">
        <div className="container header__inner">
          <a className="logo" href="#hero">
            Kateryna Studio
          </a>

          <nav className="nav">
            <ul className="nav__list">
              <li>
                <a href="#catalog">Каталог</a>
              </li>
              <li>
                <a href="#media">Відео та фото</a>
              </li>
              <li>
                <a href="#about">Інформація</a>
              </li>
              <li>
                <a href="#checkout">Оплата</a>
              </li>
            </ul>
          </nav>

          <div className="header__actions">
            <span className="icon-btn" aria-label="Користувач">
              {user ? `Привіт, ${user.name}` : 'Гість'}
            </span>
            <button className="icon-btn" type="button" aria-label="Кошик">
              Кошик <span className="badge">{itemsCount}</span>
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero" id="hero">
          <div className="container hero__inner">
            <div className="hero__content">
              <h1>
                Магазин професійної косметики у форматі desktop / tablet /
                mobile
              </h1>
              <p>
                Повноцінний e-commerce: дані з бекенду, вітрина товарів,
                медіа-блоки, кошик, реєстрація клієнта та онлайн-оплата через
                сайт або застосунок.
              </p>
              <div className="hero__actions">
                <a href="#catalog" className="btn btn--primary">
                  Перейти до покупок
                </a>
                <a href="#checkout" className="btn btn--ghost">
                  Оформити замовлення
                </a>
              </div>
            </div>
            <div className="hero__image">
              <img
                className="hero__photo"
                src="https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=80"
                alt="Професійна косметика"
              />
            </div>
          </div>
        </section>

        <section className="section" id="catalog">
          <div className="container">
            <h2 className="section__title">Каталог магазину</h2>
            <ul className="categories">
              <li>
                <button
                  className={`categories__item ${category === 'all' ? 'is-active' : ''}`}
                  type="button"
                  onClick={() => setCategory('all')}
                >
                  Всі
                </button>
              </li>
              {categories.map(item => (
                <li key={item}>
                  <button
                    className={`categories__item ${category === item ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>

            <ul className="product-grid product-grid--main">
              {visibleProducts.map(product => (
                <li key={product.id} className="product-card">
                  <img
                    className="product-card__image"
                    src={product.image}
                    alt={product.title}
                  />
                  <div className="product-card__badge-row">
                    <span>{product.category}</span>
                    {product.isHit && (
                      <span className="product-card__badge">Хіт</span>
                    )}
                    {product.isNew && (
                      <span className="product-card__badge">New</span>
                    )}
                  </div>
                  <h3 className="product-card__title">{product.title}</h3>
                  <p className="product-card__sku">{product.sku}</p>
                  <p className="product-card__description">
                    {product.description}
                  </p>
                  <div className="product-card__bottom">
                    <span className="product-card__price">
                      {formatPrice(product.price)}
                    </span>
                    <button
                      className="product-card__btn"
                      type="button"
                      onClick={() => addToCart(product.id)}
                    >
                      Додати
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section section--alt" id="media">
          <div className="container">
            <h2 className="section__title">Відео та фото</h2>
            <ul className="media-grid">
              {catalog.media.map(item => (
                <li key={item.id} className="media-card">
                  <h3>{item.title}</h3>
                  {item.type === 'video' ? (
                    <iframe
                      className="media-frame"
                      src={item.url.replace('watch?v=', 'embed/')}
                      title={item.title}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  ) : (
                    <img
                      src={item.cover}
                      alt={item.title}
                      className="media-photo"
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section" id="about">
          <div className="container about">
            <div className="about__text">
              <h2 className="section__title">{catalog.info.heading}</h2>
              <p>{catalog.info.description}</p>
              <ul className="about__list">
                {catalog.info.points.map(point => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
            <div className="about__badge">
              <p>Made in Ukraine</p>
            </div>
          </div>
        </section>

        <section className="section section--alt" id="auth">
          <div className="container auth-layout">
            <div className="auth-box">
              <h2 className="section__title">Реєстрація / Вхід</h2>
              {user ? (
                <div>
                  <p>
                    Ви увійшли як {user.name} ({user.email})
                  </p>
                  <button
                    className="btn btn--ghost"
                    onClick={logout}
                    type="button"
                  >
                    Вийти
                  </button>
                </div>
              ) : (
                <form className="form" onSubmit={handleAuthSubmit}>
                  <div className="switcher">
                    <button
                      type="button"
                      className={`switcher__btn ${mode === 'register' ? 'is-active' : ''}`}
                      onClick={() => setMode('register')}
                    >
                      Реєстрація
                    </button>
                    <button
                      type="button"
                      className={`switcher__btn ${mode === 'login' ? 'is-active' : ''}`}
                      onClick={() => setMode('login')}
                    >
                      Вхід
                    </button>
                  </div>

                  {mode === 'register' && (
                    <label>
                      Ім'я
                      <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                      />
                    </label>
                  )}
                  <label>
                    Email
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </label>
                  {mode === 'register' && (
                    <label>
                      Пароль
                      <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        minLength={6}
                        required
                      />
                    </label>
                  )}
                  <button
                    className="btn btn--primary"
                    type="submit"
                    disabled={authBusy}
                  >
                    {authBusy
                      ? 'Обробка...'
                      : mode === 'register'
                        ? 'Створити акаунт'
                        : 'Увійти'}
                  </button>
                </form>
              )}
            </div>

            <div className="cart-box">
              <h2 className="section__title">Кошик клієнта</h2>
              {cartProducts.length === 0 && <p>Наразі кошик порожній.</p>}
              <ul className="cart-list">
                {cartProducts.map(item => (
                  <li key={item.productId} className="cart-item">
                    <div>
                      <strong>{item.product.title}</strong>
                      <p>{formatPrice(item.product.price)}</p>
                    </div>
                    <div className="cart-controls">
                      <input
                        type="number"
                        min={1}
                        value={item.qty}
                        onChange={e =>
                          changeQty(item.productId, Number(e.target.value))
                        }
                      />
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.productId)}
                      >
                        Видалити
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="cart-total">Разом: {formatPrice(totalAmount)}</p>
            </div>
          </div>
        </section>

        <section className="section" id="checkout">
          <div className="container checkout-box">
            <h2 className="section__title">Оплата через сайт / додаток</h2>
            <form className="form checkout-form" onSubmit={handleCheckout}>
              <label>
                ПІБ
                <input
                  value={paymentForm.fullName}
                  onChange={e =>
                    setPaymentForm(prev => ({
                      ...prev,
                      fullName: e.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                Телефон
                <input
                  value={paymentForm.phone}
                  onChange={e =>
                    setPaymentForm(prev => ({ ...prev, phone: e.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={paymentForm.email}
                  onChange={e =>
                    setPaymentForm(prev => ({ ...prev, email: e.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Місто
                <input
                  value={paymentForm.city}
                  onChange={e =>
                    setPaymentForm(prev => ({ ...prev, city: e.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Адреса
                <input
                  value={paymentForm.address}
                  onChange={e =>
                    setPaymentForm(prev => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                Метод оплати
                <select
                  value={paymentForm.method}
                  onChange={e =>
                    setPaymentForm(prev => ({
                      ...prev,
                      method: e.target.value as PaymentPayload['method'],
                    }))
                  }
                >
                  <option value="card">Картка</option>
                  <option value="applepay">Apple Pay</option>
                  <option value="googlepay">Google Pay</option>
                </select>
              </label>
              {paymentForm.method === 'card' && (
                <label>
                  Останні 4 цифри картки
                  <input
                    value={paymentForm.cardLast4}
                    onChange={e =>
                      setPaymentForm(prev => ({
                        ...prev,
                        cardLast4: e.target.value,
                      }))
                    }
                    minLength={4}
                    maxLength={4}
                    required
                  />
                </label>
              )}
              <button
                className="btn btn--primary"
                type="submit"
                disabled={checkoutBusy}
              >
                {checkoutBusy
                  ? 'Оплата...'
                  : `Сплатити ${formatPrice(totalAmount)}`}
              </button>
            </form>

            {checkoutMessage && (
              <p className="checkout-message">{checkoutMessage}</p>
            )}
          </div>
        </section>

        <section className="section section--alt" id="blog">
          <div className="container">
            <h2 className="section__title">Корисні статті</h2>
            <ul className="blog-grid">
              {catalog.blog.map(article => (
                <li className="blog-card" key={article.id}>
                  <p className="blog-card__date">{article.date}</p>
                  <h3 className="blog-card__title">{article.title}</h3>
                  <p className="blog-card__excerpt">{article.excerpt}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="footer" id="contacts">
        <div className="container footer__inner">
          <div className="footer__block">
            <h3>Kateryna Studio Store</h3>
            <p>
              Інтернет-магазин професійної косметики. Оплата онлайн, доставка по
              Україні.
            </p>
          </div>
          <div className="footer__block">
            <h4>Контакти</h4>
            <ul>
              <li>+38 (097) 000-00-00</li>
              <li>hello@kateryna.studio</li>
              <li>Instagram: @kateryna.studio</li>
            </ul>
          </div>
          <div className="footer__block">
            <h4>Навігація</h4>
            <ul>
              <li>
                <a href="#catalog">Каталог</a>
              </li>
              <li>
                <a href="#auth">Реєстрація</a>
              </li>
              <li>
                <a href="#checkout">Оплата</a>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  );
}

export default App;
