import test from 'node:test';
import assert from 'node:assert/strict';
import {productFromHtml,sameProduct} from '../src/services/repairImageSources.js';
test('recovery requires matching SKU and volume, including Ukrainian units',()=>{
 assert.ok(sameProduct({article:'FF1',title:'Маска 250 мл'},{sku:'FF1',name:'Mask 250 ml'}));
 assert.equal(sameProduct({article:'FF1',title:'Mask 300 ml'},{sku:'FF1',name:'Mask 250 ml'}),false);
 assert.equal(sameProduct({article:'FF1',title:'Mask 250 ml'},{sku:'FF2',name:'Mask 250 ml'}),false);
 assert.equal(sameProduct({title:'Mask 250 ml'},{sku:'FF1',name:'Mask 250 ml'}),false);
});
test('recovery reads only product images from structured data, excluding unrelated external images',()=>{
 const html='<script type="application/ld+json">'+JSON.stringify({'@graph':[{'@type':'Product',sku:'FF1',name:'Mask 250 ml',image:['https://full-force.com.ua/content/images/1/photo.webp','https://other.example/p.png']} ]})+'</script>';
 const p=productFromHtml(html,'https://full-force.com.ua/mask/');assert.equal(p.sku,'FF1');assert.equal(p.images.length,1);
 assert.equal(productFromHtml('<img src="recommendation.png">','https://full-force.com.ua/mask/'),null);
});
