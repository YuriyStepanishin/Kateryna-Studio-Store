export async function setTestStock(pool){
 const result=await pool.query('UPDATE products SET stock=10 WHERE stock=0 RETURNING id');
 return {updated:result.rowCount,quantity:10};
}
