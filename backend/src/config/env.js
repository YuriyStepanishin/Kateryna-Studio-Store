export function readEnv(source=process.env) {
 const mode=source.STORE_MODE || 'demo';
 if(!['demo','postgres'].includes(mode)) throw new Error('STORE_MODE must be demo or postgres');
 if(source.NODE_ENV==='production' && mode!=='postgres') throw new Error('Production requires STORE_MODE=postgres');
 if(mode==='postgres' && !source.DATABASE_URL) throw new Error('DATABASE_URL is required for PostgreSQL mode');
 if(mode==='postgres' && (!source.JWT_ACCESS_SECRET || source.JWT_ACCESS_SECRET.length<32 || !source.JWT_REFRESH_SECRET || source.JWT_REFRESH_SECRET.length<32 || source.JWT_ACCESS_SECRET===source.JWT_REFRESH_SECRET)) throw new Error('Two distinct JWT secrets of at least 32 characters are required');
 const port=Number(source.PORT||5001);
 if(!Number.isInteger(port)||port<1||port>65535) throw new Error('PORT must be between 1 and 65535');
 return {production:source.NODE_ENV==='production',accessSecret:source.JWT_ACCESS_SECRET,refreshSecret:source.JWT_REFRESH_SECRET,port,host:source.HOST||'127.0.0.1',mode,databaseUrl:source.DATABASE_URL,origins:(source.CORS_ORIGINS||'http://localhost:5173,http://127.0.0.1:5173').split(',').map(s=>s.trim()).filter(Boolean)};
}
