export const PRODUCT_LINES=[
 {id:'women',label:'Жіноча лінійка'},
 {id:'men',label:'Чоловіча лінійка'},
 {id:'kids',label:'Дитяча лінійка'},
] as const;
export type ProductLine=typeof PRODUCT_LINES[number]['id'];
