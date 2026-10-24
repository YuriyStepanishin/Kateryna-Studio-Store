import {Router} from 'express';
import {importHairMedia} from '../services/importHairMedia.js';
import {getPool} from '../config/db.js';
import {requireRole} from '../middleware/auth.js';
import {contentRepository} from '../models/content.js';
import {infoSchema,mediaSchema,bannerSchema,promoSchema,validate} from '../validators/content.js';
import {validateId} from '../validators/catalog.js';
export function contentRoutes(config){const router=Router();router.use('/admin/content',requireRole(config,'ADMIN'));const repo=()=>contentRepository(getPool(config.databaseUrl));router.post('/admin/content/media/import-hair-care',async(req,res)=>{if(config.mode!=='postgres')return res.status(503).json({message:'Імпорт потребує PostgreSQL.'});res.json(await importHairMedia(getPool(config.databaseUrl)));});router.get('/admin/content',async(req,res)=>res.json(await repo().adminContent()));router.put('/admin/content/info',async(req,res)=>{await repo().saveInfo(validate(infoSchema,req.body));res.status(204).end();});for(const [path,schema,method] of [['media',mediaSchema,'saveMedia'],['banners',bannerSchema,'saveBanner'],['promos',promoSchema,'savePromo']]){router.post('/admin/content/'+path,async(req,res)=>res.status(201).json(await repo()[method](validate(schema,req.body))));router.put('/admin/content/'+path+'/:id',async(req,res)=>res.json(await repo()[method](validate(schema,req.body),validateId(req.params.id))));}return router;}
