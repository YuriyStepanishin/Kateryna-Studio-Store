import { http } from './http';
export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  isActive: boolean;
}
export interface ProductInput {
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  oldPrice: number | null;
  stock: number;
  sku: string;
  isActive: boolean;
  images: string[];
  characteristics: Record<string, string>;
}
export interface AdminProduct extends ProductInput {
  id: string;
  categoryName: string;
  audience?: 'women' | 'men' | 'kids';
}
export interface ProductList {
  items: AdminProduct[];
  total: number;
  page: number;
  limit: number;
}
export const getCategories = async () =>
  (await http.get<Category[]>('/admin/categories')).data;
export const saveCategory = async (data: Omit<Category, 'id'>, id?: string) =>
  id ? http.put('/categories/' + id, data) : http.post('/categories', data);
export const archiveCategory = (id: string) => http.delete('/categories/' + id);
export const getProducts = async (params: {
  page: number;
  q: string;
  category?: string;
}) =>
  (
    await http.get<ProductList>('/admin/products', {
      params: { ...params, limit: 20 },
    })
  ).data;
export const saveProduct = (data: ProductInput, id?: string) =>
  id ? http.put('/products/' + id, data) : http.post('/products', data);
export const archiveProduct = (id: string) => http.delete('/products/' + id);
export async function uploadPhoto(file: File) {
  const data = new FormData();
  data.append('image', file);
  return (
    await http.post<{ imageUrl: string }>('/upload', data, {
      headers: { 'Content-Type': undefined },
      timeout: 60000,
    })
  ).data.imageUrl;
}

export const saveProductLine = (
  id: string,
  audience: 'women' | 'men' | 'kids'
) => http.put('/products/' + id + '/line', { audience });

export const deleteProduct = (id: string) =>
  http.delete('/admin/products/' + id);

export const publishProducts = async () =>
  (
    await http.post<{
      published: number;
      pricesSet: number;
      total: number;
      without_stock: number;
      categorySetup: { created: number; existing: number; assigned: number };
    }>('/admin/products/publish', {}, { timeout: 60000 })
  ).data;

export const fillTestStock = async () =>
  (
    await http.post<{ updated: number; quantity: number }>(
      '/admin/products/test-stock'
    )
  ).data;

export const prepareCatalogForCart = async () =>
  (
    await http.post<{
      classified: number;
      stocked: number;
      review: Array<{ id: string; name: string }>;
    }>('/admin/products/prepare', {}, { timeout: 60000 })
  ).data;
