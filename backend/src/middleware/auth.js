import {authService} from '../services/auth.js';
import {getPool} from '../config/db.js';
import {cookies} from '../services/tokens.js';
export function requireRole(config,...roles){return async(req,res,next)=>{const user=await authService(getPool(config.databaseUrl),config).me(cookies(req).kss_access);if(roles.length&&!roles.includes(user.role))return res.status(403).json({message:'Недостатньо прав доступу.'});req.user=user;next();};}
