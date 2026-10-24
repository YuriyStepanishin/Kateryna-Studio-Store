import test from 'node:test';
import assert from 'node:assert/strict';
import {photoIdentity,betterResolution,smallPhoto} from './src/services/imageQuality.js';
test('same-photo matching tolerates thumbnail sizes but not changed packaging photo identifiers',()=>{
 assert.equal(photoIdentity('https://cotril.it/wp-content/uploads/2026/04/PRODUCT-150x150.png'),photoIdentity('https://cotril.it/wp-content/uploads/2026/04/PRODUCT-1024x1536.png'));
 assert.equal(photoIdentity('https://full-force.com.ua/content/images/17/1800x1800l80mc0/123.webp'),photoIdentity('https://full-force.com.ua/content/images/17/78x78l80nn0/123.webp'));
 assert.notEqual(photoIdentity('https://full-force.com.ua/content/images/17/1800x1800l80mc0/123.webp'),photoIdentity('https://full-force.com.ua/content/images/17/1800x1800l80mc0/456.webp'));
 assert.equal(photoIdentity('https://other.example/image.png'),null);
});
test('quality replacement requires genuine larger dimensions in both directions',()=>{
 assert.ok(smallPhoto({width:150,height:150}));assert.ok(betterResolution({width:150,height:150},{width:1024,height:1536}));
 assert.equal(betterResolution({width:1000,height:1000},{width:1200,height:600}),false);
 assert.equal(betterResolution({width:150,height:150},{width:300,height:300}),false);
 assert.equal(betterResolution({width:150,height:150},{width:undefined,height:1024}),false);
});
