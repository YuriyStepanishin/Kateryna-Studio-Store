import {getPool,closePool} from '../config/db.js';
const email=process.argv[2]?.trim().toLowerCase();
if(!email||!email.includes('@')){console.error('Usage: npm run admin:promote -- user@example.com');process.exit(1);}
try{const result=await getPool().query("UPDATE users SET role='ADMIN' WHERE lower(email)=$1 RETURNING id",[email]);if(!result.rowCount){console.error('Account not found. Register first.');process.exitCode=1;}else console.log('Account now has ADMIN role. Refresh the profile page.');}
catch(error){console.error('Could not update role:',error.code||error.name);process.exitCode=1;}
finally{await closePool();}
