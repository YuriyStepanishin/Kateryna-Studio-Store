const photo=(id,page,title,author,description)=>({
 key:'pexels:'+id,type:'photo',title,description,
 url:`https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600`,
 source:{provider:'Pexels',page:'https://www.pexels.com/photo/'+page+'-'+id+'/',author,license:'Pexels License',licenseUrl:'https://www.pexels.com/license/',checkedAt:'2026-10-24'},
});
const video=(id,title,author,language,description)=>({key:'youtube:'+id,type:'video',title,description,url:'https://www.youtube.com/watch?v='+id,source:{provider:'YouTube',page:'https://www.youtube.com/watch?v='+id,author,language,license:'YouTube — вбудований плеєр, без перезавантаження відео',checkedAt:'2026-10-24'}});
export const hairMedia=[
 video('1xM7LcpMpGg','Миття голови та вибір догляду: розмова з трихологом','Vichy Ukraine','uk','Кузьма Хобзей та Людмила Шупенюк обговорюють очищення шкіри голови, шампуні, кондиціонери й маски. Українською; відео бренду Vichy.'),
 video('DUef8f9xgN4','Кучерявий метод: очищення, кондиціонування та укладання','НАТАЛІ ХМАРА','uk','Послідовність догляду за кучерями від очищення до фіксації. Українською; авторка представляє також власний асортимент засобів.'),
 video('YyLQRpYRALE','Укладання волосся з меншим ризиком пошкодження','American Academy of Dermatology','en','Рекомендації дерматологів щодо сушіння, розчісування та гарячих інструментів. Англійською.'),
 video('bU9CznCb9Lc','Фарбування та завивка: поради для доглянутого волосся','American Academy of Dermatology','en','Освітній матеріал про дбайливе ставлення до волосся під час фарбування й завивки. Англійською.'),
 photo('3993444','woman-getting-her-hair-shampoo','Миття волосся в салоні','cottonbro studio','Очищення волосся та шкіри голови під час професійного догляду.'),
 photo('23349891','hairdresser-washing-customer-hair','Змивання догляду після миття','Oleskandra Biliak','Крупний план змивання засобу водою в салонній мийці.'),
 photo('28994649','close-up-of-woman-applying-hair-treatment','Нанесення кондиціонувального догляду','Beyzanur K.','Розподіл засобу по довжині волосся під час домашнього догляду.'),
 photo('28994394','applying-hair-serum-to-red-curls-in-close-up','Сироватка для догляду за волоссям','Beyzanur K.','Нанесення косметичної сироватки за допомогою піпетки.'),
 photo('28994645','applying-hair-spray-to-long-red-hair-indoors','Незмивний догляд у форматі спрею','Beyzanur K.','Нанесення спрею на довжину волосся перед укладанням.'),
 photo('28994570','young-woman-drying-red-hair-with-hairdryer','Сушіння волосся феном','Beyzanur K.','Домашнє сушіння та формування зачіски феном.'),
 photo('28994561','red-hair-curling-with-a-styling-iron','Формування локонів','Beyzanur K.','Укладання довжини за допомогою інструмента для завивки.'),
 photo('5977770','combing-a-woman-s-hair','Розчісування дерев’яним гребінцем','Yaroslav Shuraev','Дбайливе розчісування короткого волосся вдома.'),
 photo('28994648','close-up-of-red-hair-and-hands-in-soft-lighting','Увага до довжини та кінчиків','Beyzanur K.','Текстура волосся крупним планом під час догляду.'),
 photo('8467962','hair-styling-set-and-a-heart-shaped-hair-strands','Інструменти для домашнього укладання','Nataliya Vaitkevich','Предметна композиція з інструментами для укладання та пасмом волосся.'),
].map((item,index)=>({...item,sortOrder:100+index}));
