import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCatalog} from './src/models/catalog.js';
test('public catalog excludes drafts and chooses Cloudinary images first',async()=>{
 let sql;
 const rows=await loadCatalog({async query(query){sql=query;return {rows:[{images:['https://res.cloudinary.com/store/p.png'],price:'25.00',oldPrice:null}]};}});
 assert.match(sql,/WHERE p.is_active AND c.is_active/);assert.match(sql,/res\.cloudinary\.com/);
 assert.equal(rows[0].image,'https://res.cloudinary.com/store/p.png');assert.equal(rows[0].price,25);
});
test('explicit admin preview includes drafts; missing gallery maps to empty image',async()=>{
 let sql;const rows=await loadCatalog({async query(query){sql=query;return {rows:[{images:[],price:'0',oldPrice:null,isPublished:false}]};}},{includeDrafts:true});
 assert.doesNotMatch(sql,/WHERE p.is_active AND c.is_active/);assert.equal(rows[0].isPublished,false);assert.equal(rows[0].image,'');
});
