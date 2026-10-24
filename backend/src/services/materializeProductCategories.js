import {GROUP_SOURCES} from './productGroups.js';
export async function materializeProductCategories(client){
 const summary={created:0,existing:0,assigned:0,unassigned:0};
 const categories=[];
 for(const group of GROUP_SOURCES){
  let row=(await client.query('SELECT id FROM categories WHERE slug=$1 OR lower(name)=lower($2) ORDER BY (slug=$1) DESC LIMIT 1',[group.slug,group.name])).rows[0];
  if(row)summary.existing++;
  else{
   row=(await client.query('INSERT INTO categories(name,slug) VALUES($1,$2) ON CONFLICT(slug) DO UPDATE SET slug=EXCLUDED.slug RETURNING id',[group.name,group.slug])).rows[0];summary.created++;
  }
  categories.push({...group,id:row.id});
 }
 const {rows}=await client.query("SELECT p.id,p.category_id,p.characteristics FROM products p JOIN categories c ON c.id=p.category_id WHERE c.slug LIKE 'import-%'");
 for(const product of rows){
  const raw=product.characteristics||{},source=raw.sourceData||{};
  const names=[raw.group,raw['Група'],raw.sourceCategory,source.category,...(Array.isArray(raw.sourceGroups)?raw.sourceGroups:[])].filter(value=>typeof value==='string');
  const chosen=categories.find(category=>names.includes(category.name));
  if(!chosen){summary.unassigned++;continue;}
  const updated=await client.query('UPDATE products SET category_id=$1 WHERE id=$2 AND category_id=$3',[chosen.id,product.id,product.category_id]);summary.assigned+=updated.rowCount;
 }
 return summary;
}
export async function createCatalogCategories(pool){
 const client=await pool.connect();
 try{
  await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(72619203)');
  const summary=await materializeProductCategories(client);await client.query('COMMIT');return summary;
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
