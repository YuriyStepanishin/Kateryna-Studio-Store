import {Router} from 'express';
import {requireRole} from '../middleware/auth.js';
import {storeController} from '../controllers/store.js';
export function storeRoutes(config,dataDir) {const router=Router();const controller=storeController(config,dataDir);router.get('/catalog',controller.catalog);router.get('/admin/catalog',requireRole(config,'ADMIN'),controller.adminCatalog);router.post('/orders',controller.order);return router;}
