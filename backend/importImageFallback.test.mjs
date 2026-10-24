import test from 'node:test';
import assert from 'node:assert/strict';
import {imageCandidates,uploadImportedImage} from './src/services/importImageFallback.js';
test('fallback removes only the WordPress thumbnail size, preserving source host and filename',()=>{
 const src='https://cotril.it/wp-content/uploads/2026/04/SHAMPOO-150x150.png';
 assert.deepEqual(imageCandidates(src),[src,'https://cotril.it/wp-content/uploads/2026/04/SHAMPOO.png']);
 assert.equal(imageCandidates('https://full-force.com.ua/content/image-150x150.png').length,1);
});
test('missing thumbnail retries original; auth failures do not trigger fallback',async()=>{
 const src='https://cotril.it/wp-content/uploads/2026/04/SHAMPOO-150x150.png';
 const calls=[];const cloud={uploader:{async upload(url){calls.push(url);if(calls.length===1)throw {http_code:404};return {secure_url:'ok'};}}};
 assert.equal((await uploadImportedImage(cloud,src,{})).secure_url,'ok');assert.equal(calls.length,2);
 let count=0;await assert.rejects(()=>uploadImportedImage({uploader:{async upload(){count++;throw {http_code:401};}}},src,{}));assert.equal(count,1);
});
