import pg from 'pg';
let pool;
export function getPool(connectionString=process.env.DATABASE_URL) {
 if(!connectionString) throw new Error('DATABASE_URL is not configured');
 if(!pool) pool=new pg.Pool({connectionString,max:5,idleTimeoutMillis:30000,connectionTimeoutMillis:10000});
 return pool;
}
export async function closePool(){if(pool){await pool.end();pool=undefined;}}
