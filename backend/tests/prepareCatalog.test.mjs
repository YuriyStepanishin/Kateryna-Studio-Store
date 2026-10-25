import test from 'node:test';
import assert from 'node:assert/strict';
import {inferProductGroups} from '../src/services/inferProductGroups.js';
import {prepareCatalog} from '../src/services/prepareCatalog.js';
test('classifies actual product type rather than recommendations; kids and trichology are secondary groups',()=>{
 assert.deepEqual(inferProductGroups({name:'Дитячий шампунь GENTLE wash kids hair shampoo'}).groups,['Шампуні','Дитяча лінійка']);
 assert.equal(inferProductGroups({name:'Набір: шампунь та маска'}).groups[0],'Набори');
 assert.ok(inferProductGroups({name:'Шампунь проти лупи ANTI DANDRUFF'}).groups.includes('Терапевтичні шампуні'));
 assert.equal(inferProductGroups({name:'Маска',description:'Після шампуню використайте маску'}).groups[0],'Маски для волосся');
});
test('uses introduction when title has only a line name and marks unknown products for review',()=>{
 assert.equal(inferProductGroups({name:'HYDRA',description:'A hydrating conditioner for dry hair.'}).groups[0],'Кондиціонери для волосся');
 assert.equal(inferProductGroups({name:'FREEDOM',description:'Professional product.'}).review,true);
});
test('combined preparation rolls back the complete operation on failure',async()=>{
 const calls=[];let released=false;
 const client={async query(sql){calls.push(sql);if(sql.startsWith('SELECT id FROM categories'))throw Error('DB unavailable');return {rows:[]};},release(){released=true;}};
 await assert.rejects(()=>prepareCatalog({connect:async()=>client}));assert.equal(calls.at(-1),'ROLLBACK');assert.ok(released);
});
test('catalog classification never invents prices or inventory and never changes publication status',async()=>{
 const calls=[];
 const client={async query(sql){calls.push(sql);if(sql.startsWith('SELECT id FROM categories'))return {rows:[{id:'category'}]};return {rows:[]};},release(){}};
 const result=await prepareCatalog({connect:async()=>client});
 assert.deepEqual(result,{categories:{created:0,existing:22,assigned:0,unassigned:0},classified:0,review:[]});
 assert.equal(calls.at(-1),'COMMIT');
 assert.ok(!calls.some(sql=>/UPDATE (products|categories) SET (price|stock|is_active)/i.test(sql)));
});
