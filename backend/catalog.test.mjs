import test from 'node:test';
import assert from 'node:assert/strict';
import {IncomingMessage,ServerResponse} from 'node:http';
import {Socket} from 'node:net';
import {createApp} from './src/app.js';
import {getPool,closePool} from './src/config/db.js';
import {signSession} from './src/services/tokens.js';
import {validate,productSchema,categorySchema} from './src/validators/catalog.js';
import {bannerSchema} from './src/validators/content.js';
import {detectImage,detectVideo,uploadImage} from './src/services/upload.js';
import {catalogRepository} from './src/models/catalogAdmin.js';
const id='11111111-1111-4111-8111-111111111111';
const product={categoryId:id,name:'Шампунь',slug:'shampoo',description:'Догляд',price:720,oldPrice:800,stock:5,sku:'KM-1',isActive:true,images:['https://example.com/photo.jpg'],characteristics:{'Об’єм':'250 мл'}};
test('catalog validation rejects bad prices, quantities and unsafe links',()=>{
 assert.equal(validate(productSchema,product).price,720);
 for(const values of [{price:-1},{price:1.234},{stock:1.5},{oldPrice:100},{images:['javascript:alert(1)']}])assert.throws(()=>validate(productSchema,{...product,...values}),{status:400});
 assert.throws(()=>validate(categorySchema,{name:'Маски',slug:'unsafe slug',isActive:true}),{status:400});
 assert.throws(()=>validate(bannerSchema,{title:'Акція',imageUrl:'https://example.com/a.jpg',link:'javascript:alert(1)',isActive:true}),{status:400});
 assert.throws(()=>validate(bannerSchema,{title:'Акція',imageUrl:'https://example.com/a.jpg',link:'//other.example',isActive:true}),{status:400});
});
test('file validation checks content instead of trusting filename or MIME type',()=>{
 assert.equal(detectImage(Buffer.from([137,80,78,71,13,10,26,10])),'png');
 assert.equal(detectImage(Buffer.from('<svg onload=alert(1)>')),null);
 assert.ok(detectVideo(Buffer.from([26,69,223,163])));
 assert.throws(()=>uploadImage({buffer:Buffer.from('<html>')},{}),{status:400});
 assert.throws(()=>uploadImage({buffer:Buffer.from([255,216,255])},{}),{status:503});
});
test('product and image replacement are one transaction; image failure rolls back',async()=>{
 let fail=false;let calls=[];let released=false;
 const client={async query(sql,args){calls.push({sql,args});if(fail&&sql.startsWith('INSERT INTO product_images'))throw Error('test image failure');return {rows:[{id}]};},release(){released=true;}};
 const repo=catalogRepository({connect:async()=>client});
 await repo.saveProduct(product,id);assert.equal(calls.at(-1).sql,'COMMIT');assert.ok(calls.some(c=>c.sql.startsWith('DELETE FROM product_images')));assert.ok(released);
 fail=true;calls=[];released=false;await assert.rejects(()=>repo.saveProduct(product,id));assert.equal(calls.at(-1).sql,'ROLLBACK');assert.ok(released);
});
function request(app,url,cookie,method='GET'){return new Promise((resolve,reject)=>{const req=new IncomingMessage(new Socket());req.method=method;req.url=url;req.headers=cookie?{cookie}:{};req.push(null);const res=new ServerResponse(req);res.end=function(body){this.finished=true;this.emit('finish');resolve({status:this.statusCode,body:body?JSON.parse(body.toString()):null});return this;};app.handle(req,res,reject);});}
test('Express rejects guests and customers on admin routes, even with direct URL access',async()=>{
 const config={mode:'postgres',databaseUrl:'postgres://localhost/test',origins:[],accessSecret:'a'.repeat(48),refreshSecret:'b'.repeat(48)};
 const pool=getPool(config.databaseUrl);let role='CUSTOMER';pool.query=async sql=>({rows:sql.includes('FROM users')?[{id,name:'Тест',email:'test@example.com',role}]:[]});
 try{const app=createApp(config);assert.equal((await request(app,'/api/admin/categories')).status,401);assert.equal((await request(app,'/api/admin/catalog')).status,401);assert.equal((await request(app,'/api/admin/products/publish',undefined,'POST')).status,401);assert.equal((await request(app,'/api/admin/products/test-stock',undefined,'POST')).status,401);assert.equal((await request(app,'/api/admin/products/prepare',undefined,'POST')).status,401);assert.equal((await request(app,'/api/products/'+id+'/line',undefined,'PUT')).status,401);assert.equal((await request(app,'/api/admin/products/'+id,undefined,'DELETE')).status,401);const token=signSession({id},config).access;assert.equal((await request(app,'/api/admin/categories','kss_access='+token)).status,403);assert.equal((await request(app,'/api/admin/content','kss_access='+token)).status,403);assert.equal((await request(app,'/api/admin/catalog','kss_access='+token)).status,403);assert.equal((await request(app,'/api/products/'+id+'/line','kss_access='+token,'PUT')).status,403);assert.equal((await request(app,'/api/admin/products/'+id,'kss_access='+token,'DELETE')).status,403);assert.equal((await request(app,'/api/admin/products/publish','kss_access='+token,'POST')).status,403);assert.equal((await request(app,'/api/admin/products/test-stock','kss_access='+token,'POST')).status,403);assert.equal((await request(app,'/api/admin/products/prepare','kss_access='+token,'POST')).status,403);role='ADMIN';assert.equal((await request(app,'/api/admin/categories','kss_access='+token)).status,200);}finally{await closePool();}
});
