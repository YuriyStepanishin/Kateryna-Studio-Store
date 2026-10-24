import {Router} from 'express';
import {getPool} from '../config/db.js';
import {authService} from '../services/auth.js';
import {cookies,writeSession,clearSession} from '../services/tokens.js';
import {parseAuth,registerSchema,loginSchema} from '../validators/auth.js';
import {authLimiter} from '../middleware/authLimiter.js';
export function authRoutes(config){
 const router=Router();
 router.use((req,res,next)=>{res.setHeader('Cache-Control','no-store');if(config.mode!=='postgres')return res.status(503).json({message:'Авторизація потребує підключення PostgreSQL.'});next();});
 const service=()=>authService(getPool(config.databaseUrl),config);
 const limited=authLimiter();
 const respond=(res,result,status=200)=>{writeSession(res,result.session,config.production);return res.status(status).json({user:result.user});};
 router.post('/register',limited,async(req,res)=>respond(res,await service().register(parseAuth(registerSchema,req.body)),201));
 router.post('/login',limited,async(req,res)=>respond(res,await service().login(parseAuth(loginSchema,req.body))));
 router.post('/refresh',limited,async(req,res)=>{try{return respond(res,await service().refresh(cookies(req).kss_refresh));}catch(error){if(error.status===401)clearSession(res,config.production);throw error;}});
 router.post('/logout',async(req,res)=>{await service().logout(cookies(req).kss_refresh);clearSession(res,config.production);res.status(204).end();});
 router.get('/me',async(req,res)=>res.json({user:await service().me(cookies(req).kss_access)}));
 return router;
}
