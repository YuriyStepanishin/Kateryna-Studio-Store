export function authLimiter({limit=20,windowMs=15*60000}={}){
 const attempts=new Map();
 return (req,res,next)=>{const now=Date.now();for(const [key,value] of attempts)if(value.reset<=now)attempts.delete(key);const key=req.ip||'unknown';const entry=attempts.get(key)||{count:0,reset:now+windowMs};if(attempts.size>=10000&&!attempts.has(key))return res.status(429).json({message:'Спробуйте пізніше.'});entry.count++;attempts.set(key,entry);if(entry.count>limit){res.setHeader('Retry-After',Math.ceil((entry.reset-now)/1000));return res.status(429).json({message:'Забагато спроб. Спробуйте пізніше.'});}next();};
}
