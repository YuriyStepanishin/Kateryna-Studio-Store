export const LINE_LABELS={women:'Жіноча лінійка',men:'Чоловіча лінійка',kids:'Дитяча лінійка'};
export function productAudience(raw={},groups=[]){
 const explicit=raw['Лінійка']||raw.audience;
 for(const [id,label] of Object.entries(LINE_LABELS))if(explicit===id||explicit===label)return id;
 if(groups.includes(LINE_LABELS.kids))return 'kids';
 if(groups.includes(LINE_LABELS.men))return 'men';
 return 'women';
}
