import test from 'node:test';
import assert from 'node:assert/strict';
import {publishAllProducts} from './src/services/publishAllProducts.js';
function fixture(fail=false){const calls=[];let released=false;return {calls,released:()=>released,pool:{connect:async()=>({async query(sql,args){calls.push({sql,args});if(fail&&sql.startsWith('UPDATE products SET price'))throw Error('failure');if(sql.startsWith('SELECT id FROM categories'))return {rows:[{id:'existing'}]};if(sql.startsWith('SELECT p.id'))return {rows:[]};if(sql.startsWith('SELECT count'))return {rows:[{total:190,without_stock:190}]};return {rowCount:sql.startsWith('UPDATE products SET price')?144:sql.startsWith('UPDATE products SET is_active')?190:2,rows:[]};},release(){released=true;}})}};}
test('publication creates categories, fills missing prices and publishes atomically without inventing stock',async()=>{
 const f=fixture();const r=await publishAllProducts(f.pool);assert.equal(r.pricesSet,144);assert.equal(r.total,190);assert.equal(r.categorySetup.existing,22);assert.equal(f.calls.at(-1).sql,'COMMIT');
 const sql=f.calls.find(c=>c.sql.startsWith('UPDATE products SET price')).sql;assert.match(sql,/WHERE price IS NULL OR price<=0/);assert.match(sql,/old_price<2000/);assert.ok(!f.calls.some(c=>/SET stock/.test(c.sql)));assert.ok(f.released());
});
test('failed publication rolls back categories and price changes',async()=>{
 const f=fixture(true);await assert.rejects(()=>publishAllProducts(f.pool));assert.equal(f.calls.at(-1).sql,'ROLLBACK');assert.ok(f.released());
});
