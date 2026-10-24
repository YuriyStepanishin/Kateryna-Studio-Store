import type {
  AuthPayload,
  CatalogResponse,
  CheckoutPayload,
  Product,
  UserProfile,
} from '../types/store';

const products: Product[] = [
  {
    id: 'p-1',
    title: 'Hydra Repair Shampoo',
    sku: 'KSS-001',
    category: 'Шампуні',
    price: 720,
    isHit: true,
    description: 'Мʼяке очищення та інтенсивне зволоження.',
    image:
      'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'p-2',
    title: 'Keratin Restore Mask',
    sku: 'KSS-002',
    category: 'Маски',
    price: 980,
    isHit: true,
    description: 'Відновлення пошкодженого волосся з кератином.',
    image:
      'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'p-3',
    title: 'Daily Balance Balm',
    sku: 'KSS-003',
    category: 'Бальзами',
    price: 640,
    description: 'Щоденний догляд і легке розчісування.',
    image:
      'https://images.unsplash.com/photo-1556228578-dd6f587a981d?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'p-4',
    title: 'Gloss Protect Spray',
    sku: 'KSS-004',
    category: 'Спреї',
    price: 590,
    isNew: true,
    description: 'Термозахист і дзеркальний блиск.',
    image:
      'https://images.unsplash.com/photo-1544717302-de2939b7ef71?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'p-5',
    title: 'Argan Fluid Therapy',
    sku: 'KSS-005',
    category: 'Флюїди',
    price: 860,
    isNew: true,
    description: 'Антифриз-ефект і живлення кінчиків.',
    image:
      'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'p-6',
    title: 'Silk Oil Elixir',
    sku: 'KSS-006',
    category: 'Олійки',
    price: 920,
    isHit: true,
    description: 'Концентрована олійка для гладкості.',
    image:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'p-7',
    title: 'Scalp Therapy System',
    sku: 'KSS-007',
    category: 'Трихологія',
    price: 1240,
    isNew: true,
    description: 'Професійний догляд за шкірою голови.',
    image:
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'p-8',
    title: 'Kids Soft Care',
    sku: 'KSS-008',
    category: 'Дитяча лінійка',
    price: 510,
    description: 'Делікатний склад для дітей 3+.',
    image:
      'https://images.unsplash.com/photo-1519415943484-9fa1873496d4?auto=format&fit=crop&w=800&q=80',
  },
];

const media = [
  {
    id: 'm-1',
    title: 'Огляд лінійки Volume & Shine',
    type: 'video' as const,
    url: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
    cover:
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'm-2',
    title: 'Результати клієнтів до/після',
    type: 'photo' as const,
    url: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=80',
    cover:
      'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'm-3',
    title: 'Бекстейдж виробництва',
    type: 'video' as const,
    url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    cover:
      'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=800&q=80',
  },
];

const blog = [
  {
    id: 'b-1',
    title: 'Як підібрати домашній догляд під тип волосся',
    excerpt: 'Пояснюємо, як зібрати працюючий набір саме для вашої рутини.',
    date: '12.03.2026',
  },
  {
    id: 'b-2',
    title: '5 помилок у догляді, які зʼїдають обʼєм',
    excerpt: 'Розбираємо звички, що заважають зберегти легкість та блиск.',
    date: '02.03.2026',
  },
  {
    id: 'b-3',
    title: 'Термозахист: що важливо знати перед укладкою',
    excerpt: 'Короткий гід для безпечного використання фену та стайлерів.',
    date: '21.02.2026',
  },
];

const info = {
  heading: 'Kateryna Studio Store - професійна косметика для волосся',
  description:
    'Бренд поєднує салонну експертизу та доступний домашній догляд. В асортименті лінійки для відновлення, зволоження і захисту волосся.',
  points: [
    'Сертифіковані інгредієнти та контроль якості.',
    'Підбір догляду під ваш тип волосся.',
    'Швидка доставка по Україні та оплата онлайн.',
  ],
};

const usersByEmail = new Map<string, UserProfile>();

const emulateNetwork = async <T>(payload: T, ms = 450): Promise<T> => {
  await new Promise(resolve => setTimeout(resolve, ms));
  return payload;
};

export const fetchCatalog = async (): Promise<CatalogResponse> => {
  return emulateNetwork({ products, media, blog, info });
};

export const registerUser = async (
  payload: AuthPayload
): Promise<UserProfile> => {
  const existing = usersByEmail.get(payload.email);
  if (existing) {
    return emulateNetwork(existing, 250);
  }

  const user: UserProfile = {
    id: `u-${Date.now()}`,
    name: payload.name,
    email: payload.email,
  };

  usersByEmail.set(payload.email, user);
  return emulateNetwork(user, 350);
};

export const loginUser = async (
  payload: Pick<AuthPayload, 'email'>
): Promise<UserProfile> => {
  const user = usersByEmail.get(payload.email);
  if (user) {
    return emulateNetwork(user, 250);
  }

  const guest: UserProfile = {
    id: `u-${Date.now()}`,
    name: 'Клієнт',
    email: payload.email,
  };

  usersByEmail.set(payload.email, guest);
  return emulateNetwork(guest, 300);
};

export const checkoutOrder = async (payload: CheckoutPayload) => {
  const amount = payload.items.reduce((sum, item) => {
    const product = products.find(prod => prod.id === item.productId);
    return sum + (product ? product.price * item.qty : 0);
  }, 0);

  return emulateNetwork(
    {
      orderId: `ORD-${Date.now()}`,
      status: 'paid' as const,
      amount,
      message: 'Оплата пройшла успішно. Замовлення прийняте.',
    },
    900
  );
};
