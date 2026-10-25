import test from 'node:test';
import assert from 'node:assert/strict';
import {materializeProductCategories,createCatalogCategories} from '../src/services/materializeProductCategories.js';
test('creates real category rows and assigns imported products only using known database groups',async()=>{
 const calls=[];
 const client={async query(sql,args){calls.push({sql,args});if(sql.startsWith('SELECT id FROM categories'))return {rows:[]};if(sql.startsWith('INSERT INTO categories'))return {rows:[{id:args[1]}]};if(sql.startsWith('SELECT p.id'))return {rows:[{id:'one',category_id:'old-brand',characteristics:{sourceGroups:['Шампуні']}},{id:'two',category_id:'old-brand',characteristics:{}}]};return {rowCount:1,rows:[]};}};
 const summary=await materializeProductCategories(client);assert.equal(summary.created,22);assert.equal(summary.assigned,1);assert.equal(summary.unassigned,1);
 assert.deepEqual(calls.find(c=>c.sql.startsWith('UPDATE')).args,['shampuni','one','old-brand']);
 assert.ok(calls.find(c=>c.sql.startsWith('SELECT p.id')).sql.includes("c.slug LIKE 'import-%'"));
});
test('rerun reuses categories and preserves administrator metadata',async()=>{
 let writes=0;
 const summary=await materializeProductCategories({async query(sql){if(sql.startsWith('SELECT id'))return {rows:[{id:'existing'}]};if(sql.startsWith('SELECT p.id'))return {rows:[]};writes++;return {rows:[]};}});
 assert.equal(summary.existing,22);assert.equal(summary.created,0);assert.equal(writes,0);
});
test('category creation is transactional and rolls back failures',async()=>{
 const calls=[];let released=false;
 const client={async query(sql){calls.push(sql);if(sql.startsWith('SELECT id'))throw Error('DB failed');return {rows:[]};},release(){released=true;}};
 await assert.rejects(()=>createCatalogCategories({connect:async()=>client}));assert.equal(calls.at(-1),'ROLLBACK');assert.ok(released);
});
