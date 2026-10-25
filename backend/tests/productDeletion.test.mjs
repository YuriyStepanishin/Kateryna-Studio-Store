import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogRepository} from '../src/models/catalogAdmin.js';
test('permanent deletion issues one parameterized DELETE; database cascades product-owned records',async()=>{
 let call;const repo=catalogRepository({async query(sql,args){call={sql,args};return {rowCount:1};}});
 await repo.deleteProduct('id');assert.equal(call.sql,'DELETE FROM products WHERE id=$1 RETURNING id');assert.deepEqual(call.args,['id']);
});
test('missing products return 404; products in orders remain protected with a useful error',async()=>{
 await assert.rejects(()=>catalogRepository({query:async()=>({rowCount:0})}).deleteProduct('missing'),{status:404});
 await assert.rejects(()=>catalogRepository({query:async()=>{throw {code:'23503'};}}).deleteProduct('ordered'),{status:409,message:'Товар є у замовленнях. Його можна приховати, але не видалити.'});
});
