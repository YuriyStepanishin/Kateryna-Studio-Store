const carriers=new Set(['nova_poshta','ukrposhta','meest']);
const types=new Set(['branch','courier','locker']);
export function validateDelivery(customer){
 const carrier=customer?.deliveryCarrier,type=customer?.deliveryType;
 if(carrier===undefined&&type===undefined)return {method:'to_be_confirmed'};
 if(!carriers.has(carrier)||!types.has(type)||(carrier==='ukrposhta'&&type==='locker'))throw Object.assign(new Error('Оберіть перевізника та спосіб доставки.'),{status:400});
 return {method:`${carrier}:${type}`,carrier,type};
}
