import {GROUP_SOURCES} from './productGroups.js';
const names=new Map(GROUP_SOURCES.map(g=>[g.slug,g.name]));
const types=[
 ['podarunkovyi-sertyfikat',/подарунков.*сертифікат|gift\s*card/i],
 ['nabory',/набір|набор|\bkit\b|\bset\b/i],
 ['shampuni',/шампун|shampoo/i],
 ['masky-dlia-volossia',/маск|\bmask\b|masque/i],
 ['sprei-dlia-volossia',/спрей|\bspray\b/i],
 ['kondytsionery-dlia-volossia',/кондиціон|бальзам|conditioner|\bbalm\b/i],
 ['fliuidy-dlia-volossia',/флюїд|флюид|\bfluid\b/i],
 ['oliia-dlia-kinchykiv',/олія|олії|масло|\boil\b/i],
 ['tekhnichni-zasoby-dlia-saloniv-krasy',/окисник|освітлюв|фарба|oxidant|developer|bleach|color\s+cream/i],
 ['kremy-dlia-volossia',/крем|\bcream\b/i],
 ['terapevtychni-losiony',/лосьйон|лосьон|\blotion\b/i],
 ['pilinhy',/пілінг|\bpeeling\b|scalp\s+scrub/i],
 ['diietychni-dobavky',/дієтич|\bsupplement/i],
 ['aksesuary',/гребінець|щітка|\bbrush\b|\bcomb\b/i],
];
export function inferProductGroups(product){
 const raw=product.characteristics||{};
 const title=product.name||'';
 const description=(product.description||raw.sourceData?.productDescription||'').slice(0,250);
 let match=types.find(([,pattern])=>pattern.test(title)),basis='name';
 if(!match){
  // First matching type in the introduction; ignore later usage instructions.
  const hits=types.map(([slug,pattern])=>({slug,index:description.search(pattern)})).filter(hit=>hit.index>=0&&hit.index<100).sort((a,b)=>a.index-b.index);
  if(hits[0])match=[hits[0].slug];basis='description';
 }
 const groups=match?[names.get(match[0])]:[];
 if(/дитяч|дитин|\bkids\b|\bbaby\b|\bchildren\b/i.test(title))groups.push(names.get('dytiacha-liniika'));
 if(/термозахист|термозахис|heat\s*protect|thermal\s*protect/i.test(title))groups.push(names.get('termozakhyst'));
 if(/для тіла|\bbody\b/i.test(title))groups.push(names.get('dohliad-za-tilom'));
 const tricho=/трихолог|луп[аиіу]|випадін|алопец|psoria|eczema|alopec|dandruff|scalp/i.test(title);
 if(tricho){groups.push(names.get('trykholohiia'));if(match?.[0]==='shampuni')groups.push(names.get('terapevtychni-shampuni'));if(match?.[0]==='nabory')groups.push(names.get('trykholohichni-nabory'));}
 return {groups:[...new Set(groups.filter(Boolean))],basis,review:groups.length===0};
}
