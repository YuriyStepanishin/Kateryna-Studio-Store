import {readdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {getPool,closePool} from '../config/db.js';
const pool=getPool();
const client=await pool.connect();
try {
 await client.query('SELECT pg_advisory_lock(72619201)');
 await client.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
 const directory=new URL('../../migrations/',import.meta.url);
 const files=(await readdir(directory)).filter(name=>name.endsWith('.sql')).sort();
 for(const name of files){
  const sql=await readFile(new URL(name,directory),'utf8');
  const checksum=createHash('sha256').update(sql).digest('hex');
  const existing=await client.query('SELECT checksum FROM schema_migrations WHERE name=$1',[name]);
  if(existing.rowCount){if(existing.rows[0].checksum!==checksum)throw new Error('Applied migration has changed: '+name);continue;}
  await client.query('BEGIN');
  try{await client.query(sql);await client.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',[name,checksum]);await client.query('COMMIT');console.log('Applied',name);}
  catch(error){await client.query('ROLLBACK');throw error;}
 }
} finally {await client.query('SELECT pg_advisory_unlock(72619201)');client.release();await closePool();}
