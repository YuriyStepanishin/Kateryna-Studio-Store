import {articleRepository} from '../models/articles.js';
import {contentRepository} from '../models/content.js';
import {catalog} from '../../catalog.mjs';
import {getPool} from '../config/db.js';
import {loadCatalog,loadCatalogCategories} from '../models/catalog.js';
import {createOrder} from '../models/orders.js';
import {validateOrder} from '../validators/order.js';
import {saveDemoOrder} from '../services/fileOrderStore.js';
export function storeController(config,dataDir) {return {
 catalog:async(req,res)=>res.json(config.mode==='demo'?{...catalog,demo:true}:{...await contentRepository(getPool(config.databaseUrl)).publicContent(),categories:await loadCatalogCategories(getPool(config.databaseUrl)),products:await loadCatalog(getPool(config.databaseUrl)),blog:await articleRepository(getPool(config.databaseUrl)).list(),demo:false}),
 adminCatalog:async(req,res)=>res.json({...await contentRepository(getPool(config.databaseUrl)).publicContent(),categories:await loadCatalogCategories(getPool(config.databaseUrl),{includeInactive:true}),products:await loadCatalog(getPool(config.databaseUrl),{includeDrafts:true}),blog:await articleRepository(getPool(config.databaseUrl)).list(),demo:false,preview:true}),
 order:async(req,res)=>{
  let order;
  if(config.mode==='demo'){try{order=validateOrder(req.body);}catch(error){error.status=400;throw error;}await saveDemoOrder(order,dataDir);}
  else order=await createOrder(getPool(config.databaseUrl),req.body);
  res.status(201).json({orderId:order.orderId,status:order.status,amount:order.amount,message:'Замовлення збережено й очікує підтвердження. Кошти не списувалися.'});
 }
};}
