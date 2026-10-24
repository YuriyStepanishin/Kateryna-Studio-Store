import {materializeProductCategories} from './materializeProductCategories.js';
export async function publishAllProducts(pool){
 const client=await pool.connect();
 try{
  await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(72619204)');
  await client.query('SELECT pg_advisory_xact_lock(72619203)');
  const categorySetup=await materializeProductCategories(client);
  const priced=await client.query('UPDATE products SET price=2000,old_price=CASE WHEN old_price<2000 THEN NULL ELSE old_price END WHERE price IS NULL OR price<=0 RETURNING id');
  const categories=await client.query('UPDATE categories SET is_active=true WHERE NOT is_active AND EXISTS(SELECT 1 FROM products p WHERE p.category_id=categories.id) RETURNING id');
  const published=await client.query('UPDATE products SET is_active=true WHERE NOT is_active RETURNING id');
  const totals=await client.query('SELECT count(*)::int AS total,count(*) FILTER(WHERE stock=0)::int AS without_stock FROM products');
  await client.query('COMMIT');return {categorySetup,published:published.rowCount,pricesSet:priced.rowCount,categoriesEnabled:categories.rowCount,...totals.rows[0]};
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
