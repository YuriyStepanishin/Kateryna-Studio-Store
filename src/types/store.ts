export type ProductCategory =
  | 'Шампуні'
  | 'Маски'
  | 'Бальзами'
  | 'Спреї'
  | 'Флюїди'
  | 'Олійки'
  | 'Трихологія'
  | 'Дитяча лінійка';

export interface Product {
  id: string;
  title: string;
  sku: string;
  category: ProductCategory;
  price: number;
  isNew?: boolean;
  isHit?: boolean;
  description: string;
  image: string;
}

export interface MediaItem {
  id: string;
  title: string;
  url: string;
  cover: string;
  type: 'video' | 'photo';
}

export interface StoryArticle {
  id: string;
  title: string;
  excerpt: string;
  date: string;
}

export interface BrandInfo {
  heading: string;
  description: string;
  points: string[];
}

export interface CatalogResponse {
  products: Product[];
  media: MediaItem[];
  blog: StoryArticle[];
  info: BrandInfo;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export interface AuthPayload {
  name: string;
  email: string;
  password: string;
}

export interface CartItem {
  productId: string;
  qty: number;
}

export interface PaymentPayload {
  fullName: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  method: 'card' | 'applepay' | 'googlepay';
  cardLast4?: string;
}

export interface CheckoutPayload {
  userId: string;
  items: Array<{ productId: string; qty: number }>;
  payment: PaymentPayload;
}
