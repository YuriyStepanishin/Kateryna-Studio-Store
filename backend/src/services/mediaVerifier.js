import { configureCloudinary } from '../config/cloudinary.js';
export const EDITORIAL_FOLDER = 'omee/images';
const failure = message => Object.assign(new Error(message), { status: 502 });
export function youtubeVideoId(value) {
 try {
  const url=new URL(value);let id='';if(url.protocol!=='https:')return null;
  if(url.hostname==='youtu.be')id=url.pathname.slice(1);
  else if(['youtube.com','www.youtube.com','www.youtube-nocookie.com'].includes(url.hostname))id=url.searchParams.get('v')||url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)$/)?.[1]||'';
  return /^[a-zA-Z0-9_-]{11}$/.test(id)?id:null;
 }catch{return null;}
}
export function createMediaVerifier({ fetcher = fetch, cloudinary } = {}) {
  return {
    async video(item) {
      const response = await fetcher(
        'https://www.youtube.com/oembed?' +
          new URLSearchParams({ url: item.url, format: 'json' }),
        { signal: AbortSignal.timeout(15000) }
      );
      if (!response.ok)
        throw failure('YouTube не підтвердив доступність відео: ' + item.key);
      const data = await response.json();
      if (
        data.type !== 'video' ||
        data.provider_name !== 'YouTube' ||
        !data.html?.includes('/embed/' + item.key.slice(8)) ||
        data.author_name?.toLocaleLowerCase() !==
          item.source.author.toLocaleLowerCase()
      )
        throw failure('Не підтверджено автора або плеєр: ' + item.key);
      return {
        url: item.url,
        cover: '',
        verification: {
          originalTitle: data.title,
          checkedAt: new Date().toISOString(),
        },
      };
    },
    async photo(item) {
      const source = new URL(item.url);
      const id = item.key.slice(7);
      if (
        source.protocol !== 'https:' ||
        source.hostname !== 'images.pexels.com' ||
        source.pathname !== `/photos/${id}/pexels-photo-${id}.jpeg`
      )
        throw failure('Некоректне джерело фото.');
      const api = cloudinary || configureCloudinary();
      const name = 'editorial-hair-pexels-' + id;
      const publicId = EDITORIAL_FOLDER + '/' + name;
      let asset,
        reused = true;
      try {
        asset = await api.api.resource(publicId, { resource_type: 'image' });
      } catch (error) {
        if ((error.http_code || error.error?.http_code) !== 404) throw error;
        reused = false;
      }
      if (!asset)
        asset = await api.uploader.upload(item.url, {
          resource_type: 'image',
          folder: EDITORIAL_FOLDER,
          asset_folder: EDITORIAL_FOLDER,
          public_id: name,
          overwrite: false,
          unique_filename: false,
          timeout: 60000,
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
          transformation: [
            {
              width: 1600,
              height: 1600,
              crop: 'limit',
              quality: 'auto',
              fetch_format: 'jpg',
            },
          ],
          context: {
            caption: item.title,
            credit: item.source.author,
            source: item.source.page,
          },
        });
      if (
        asset.public_id !== publicId ||
        !asset.secure_url?.startsWith('https://res.cloudinary.com/') ||
        Math.min(asset.width || 0, asset.height || 0) < 800 ||
        Math.max(asset.width || 0, asset.height || 0) < 1200 ||
        (asset.asset_folder && asset.asset_folder !== EDITORIAL_FOLDER)
      )
        throw failure('Не підтверджено якість або папку фото: ' + item.key);
      return {
        url: asset.secure_url,
        cover: asset.secure_url,
        reused,
        verification: {
          publicId,
          width: asset.width,
          height: asset.height,
          checkedAt: new Date().toISOString(),
        },
      };
    },
  };
}
