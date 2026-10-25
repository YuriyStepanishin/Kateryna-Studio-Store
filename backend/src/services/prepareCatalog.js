import {materializeProductCategories} from './materializeProductCategories.js';
import {inferProductGroups} from './inferProductGroups.js';
export async function prepareCatalog(pool){
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(72619204)');await client.query('SELECT pg_advisory_xact_lock(72619203)');
  const categories=await materializeProductCategories(client);
  const available=(await client.query('SELECT id,name FROM categories')).rows;
  const categoryIds=new Map(available.map(c=>[c.name,c.id]));
  const pending=(await client.query("SELECT p.id,p.name,p.description,p.category_id,p.characteristics FROM products p JOIN categories c ON c.id=p.category_id WHERE c.slug LIKE 'import-%'")).rows;
  let classified=0;const review=[];
  for(const product of pending){
   const inferred=inferProductGroups(product);
   if(inferred.review)review.push({id:product.id,name:product.name});
   const group=inferred.groups[0]||'Інший догляд за волоссям';
   if(!categoryIds.has(group)){
    const row=(await client.query("INSERT INTO categories(name,slug) VALUES($1,'other-hair-care') ON CONFLICT(slug) DO UPDATE SET slug=EXCLUDED.slug RETURNING id",[group])).rows[0];categoryIds.set(group,row.id);
   }
   const raw=product.characteristics||{};
   const combined=[...new Set([...(Array.isArray(raw.sourceGroups)?raw.sourceGroups:[]),...inferred.groups])];
   const assignment={sourceGroups:combined,sourceCategoryAssignment:{basis:inferred.review?'review':inferred.basis,review:inferred.review}};
   const updated=await client.query("UPDATE products SET category_id=$1,characteristics=COALESCE(characteristics,'{}'::jsonb)||$2::jsonb WHERE id=$3 AND category_id=$4",[categoryIds.get(group),JSON.stringify(assignment),product.id,product.category_id]);classified+=updated.rowCount;
  }
  await client.query('COMMIT');return {categories,classified,review};
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
