import {Router} from 'express';
import {createDeliveryService} from '../services/delivery.js';
export function deliveryRoutes(service=createDeliveryService()){
 const router=Router();
 router.get('/delivery/status',(req,res)=>res.json(service.status()));
 router.get('/delivery/:kind',async(req,res)=>res.json(await service.lookup({...req.query,kind:req.params.kind})));
 return router;
}
