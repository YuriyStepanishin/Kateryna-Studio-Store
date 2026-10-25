import test from 'node:test';
import assert from 'node:assert/strict';
import {productAudience} from '../src/models/productAudience.js';
import {catalogDetails} from '../src/models/catalogDetails.js';
import {catalogRepository} from '../src/models/catalogAdmin.js';
import {validate,audienceSchema} from '../src/validators/catalog.js';
test('unassigned products default to women; explicit choice takes precedence over imported groups',()=>{
 assert.equal(productAudience(), 'women');assert.equal(productAudience({},['Дитяча лінійка']),'kids');
 assert.equal(productAudience({'Лінійка':'Чоловіча лінійка'},['Дитяча лінійка']),'men');
 assert.equal(productAudience({'Лінійка':'Жіноча лінійка'},['Дитяча лінійка']),'women');
 assert.equal(catalogDetails({category:'Full Force',characteristics:{brand:'Full Force',sourceGroups:['Дитяча лінійка']}}).audience,'kids');
});
test('line selection validates identifiers and preserves other characteristics using jsonb_set',async()=>{
 assert.throws(()=>validate(audienceSchema,{audience:'ADMIN'}),{status:400});assert.equal(validate(audienceSchema,{audience:'men'}).audience,'men');
 let query,args;const repo=catalogRepository({async query(sql,values){query=sql;args=values;return {rowCount:1,rows:[{id:'product'}]};}});
 await repo.saveAudience('product','kids');assert.match(query,/jsonb_set/);assert.deepEqual(args,['Дитяча лінійка','product']);
});
