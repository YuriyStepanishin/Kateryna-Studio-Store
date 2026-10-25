export const GROUP_SOURCES = [
  ['shampuni', 'Шампуні'],
  ['masky-dlia-volossia', 'Маски для волосся'],
  ['kondytsionery-dlia-volossia', 'Кондиціонери для волосся'],
  ['termozakhyst', 'Термозахист'],
  ['sprei-dlia-volossia', 'Спреї для волосся'],
  ['fliuidy-dlia-volossia', 'Флюїди для волосся'],
  ['kremy-dlia-volossia', 'Креми для волосся'],
  ['oliia-dlia-kinchykiv', 'Олії для кінчиків'],
  ['trykholohiia', 'Трихологія'],
  ['terapevtychni-shampuni', 'Терапевтичні шампуні'],
  ['terapevtychni-losiony', 'Терапевтичні лосьйони'],
  ['pilinhy', 'Пілінги'],
  ['trykholohichni-masky', 'Трихологічні маски'],
  ['diietychni-dobavky', 'Дієтичні добавки'],
  ['dytiacha-liniika', 'Дитяча лінійка'],
  ['dohliad-za-tilom', 'Догляд за тілом'],
  ['nabory', 'Набори'],
  ['trykholohichni-nabory', 'Трихологічні набори'],
  ['dohliadovi-nabory', 'Доглядові набори'],
  ['podarunkovyi-sertyfikat', 'Подарункові сертифікати'],
  ['tekhnichni-zasoby-dlia-saloniv-krasy', 'Технічні засоби для салонів краси'],
  ['aksesuary', 'Аксесуари'],
].map(([slug, name]) => ({
  slug,
  name,
  url: `https://full-force.com.ua/${slug}/`,
}));
export function productPath(value, base = 'https://full-force.com.ua/') {
  try {
    const u = new URL(value.replaceAll('&amp;', '&'), base);
    return u.protocol === 'https:' &&
      ['full-force.com.ua', 'www.full-force.com.ua'].includes(u.hostname)
      ? u.pathname.replace(/\/+$/, '') + '/'
      : null;
  } catch {
    return null;
  }
}
export function categoryProducts(html, base) {
  const paths = new Set();
  const add = value => {
    if (typeof value === 'string') {
      const p = productPath(value, base);
      if (p) paths.add(p);
    }
  };
  const hrefs = fragment => {
    for (const m of fragment.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi))
      add(m[1]);
  };
  // Restrict HTML extraction to catalog cards, never global navigation or cross-category links.
  for (const m of html.matchAll(
    /<([a-z][\w-]*)\b[^>]*class\s*=\s*["'][^"']*\bcatalogCard-(?:title|image)\b[^"']*["'][^>]*>[\s\S]*?<\/\1\s*>/gi
  ))
    hrefs(m[0]);
  function walk(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach(walk);
      return;
    }
    if ([obj['@type']].flat().includes('ItemList'))
      for (const entry of obj.itemListElement || []) {
        add(entry.url);
        add(typeof entry.item === 'string' ? entry.item : entry.item?.url);
      }
    if (obj['@graph']) walk(obj['@graph']);
  }
  for (const m of html.matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )) {
    try {
      walk(JSON.parse(m[1]));
    } catch {}
  }
  return paths;
}
export function categoryPages(html, base) {
  const page = new URL(base),
    pages = new Set();
  for (const m of html.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)) {
    try {
      const u = new URL(m[1].replaceAll('&amp;', '&'), page);
      if (
        u.origin === page.origin &&
        u.pathname === page.pathname &&
        /^\d+$/.test(u.searchParams.get('page') || '')
      ) {
        const n = Number(u.searchParams.get('page'));
        if (n > 1 && n <= 100)
          pages.add(`${page.origin}${page.pathname}?page=${n}`);
      }
    } catch {}
  }
  return [...pages];
}
