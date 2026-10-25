import test from 'node:test';
import assert from 'node:assert/strict';
import {GROUP_SOURCES,productPath,categoryProducts,categoryPages} from '../src/services/productGroups.js';
import {catalogDetails} from '../src/models/catalogDetails.js';
test('all supplied groups are configured separately from brands',()=>{assert.equal(GROUP_SOURCES.length,22);assert.ok(GROUP_SOURCES.some(g=>g.name==='Термозахист'));});
test('category membership is extracted from cards, ignoring global links and other sites',()=>{
 const html='<nav><a href="/unrelated-product/">Other</a></nav><div class="catalogCard-title"><a href="/shampoo/">Шампунь</a></div><a class="catalogCard-image" href="/mask/"><img></a><div class="catalogCard-title"><a href="https://evil.example/another/">Bad</a></div>';
 assert.deepEqual([...categoryProducts(html,'https://full-force.com.ua/shampuni/')],['/shampoo/','/mask/']);
 assert.equal(productPath('https://evil.example/shampoo/'),null);
});
test('pagination stays in the selected category and is bounded',()=>{
 const html='<a href="?page=2">2</a><a href="/masky-dlia-volossia/?page=3">Other</a><a href="?page=101">Overflow</a>';
 assert.deepEqual(categoryPages(html,'https://full-force.com.ua/shampuni/'),['https://full-force.com.ua/shampuni/?page=2']);
});
test('database supports several groups per product and excludes raw importer fields',()=>{
 const result=catalogDetails({category:'Full Force',characteristics:{brand:'Full Force',sourceGroups:['Шампуні','Трихологія','Шампуні']}});
 assert.equal(result.brand,'Full Force');assert.deepEqual(result.groups,['Шампуні','Трихологія']);assert.deepEqual(result.characteristics,{});
});
