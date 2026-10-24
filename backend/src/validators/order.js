import {validateDelivery} from './delivery.js';
import {randomUUID} from 'node:crypto';
import {catalog} from '../../catalog.mjs';
export function validateOrder(body) {
  if (!body || !Array.isArray(body.items) || !body.items.length || body.items.length > 100) throw new Error('Додайте товари до кошика.');
  const seen = new Set();
  const items = body.items.map(item => {
    const product = catalog.products.find(p => p.id === item?.productId);
    if (!product || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 99 || seen.has(item.productId)) throw new Error('Некоректний товар або кількість (від 1 до 99).');
    seen.add(item.productId);
    return { productId:product.id, sku:product.sku, title:product.title, qty:item.qty, unitPrice:product.price, lineTotal:product.price*item.qty };
  });
  const customer = {};
  for (const key of ['fullName','phone','email','city','address']) {
    const value = body.payment?.[key];
    if (typeof value !== 'string' || !value.trim() || value.length > (key==='address'?300:120)) throw new Error('Заповніть контактні дані й адресу доставки.');
    customer[key] = value.trim();
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) throw new Error('Вкажіть коректний email.');
  if (!/^\+?[\d\s()\-]{10,25}$/.test(customer.phone) || customer.phone.replace(/\D/g,'').length < 10) throw new Error('Вкажіть коректний телефон.');
  if (body.payment.method !== 'on_confirmation') throw new Error('Онлайн-оплата ще не підключена.');
  const delivery=validateDelivery(body.payment);
  return { delivery, orderId:randomUUID(), createdAt:new Date().toISOString(), status:'NEW', customer, items, amount:Math.round(items.reduce((sum,i)=>sum+i.lineTotal,0)*100)/100, currency:'UAH' };
}
