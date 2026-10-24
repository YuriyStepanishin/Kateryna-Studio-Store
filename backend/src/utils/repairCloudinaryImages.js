import { createHash } from 'node:crypto';
import { getPool, closePool } from '../config/db.js';
import { configureCloudinary } from '../config/cloudinary.js';
import {
  productFromHtml,
  sameProduct,
} from '../services/repairImageSources.js';
const apply = process.argv.includes('--apply');
let client,
  locked = false;
const report = [];
try {
  client = await getPool().connect();
  const lock = await client.query(
    'SELECT pg_try_advisory_lock(72619202) AS locked'
  );
  if (!lock.rows[0].locked) throw Error('Another image migration is running');
  locked = true;
  const { rows } = await client.query(
    `SELECT p.id,p.name,p.characteristics,i.id AS image_id,i.image_url FROM products p JOIN product_images i ON i.product_id=p.id WHERE i.image_url LIKE 'https://full-force.com.ua/%' ORDER BY p.id,i.sort_order`
  );
  const groups = Map.groupBy(rows, r => r.id);
  const cloud = apply ? configureCloudinary() : null;
  for (const group of groups.values()) {
    const first = group[0],
      source = first.characteristics.sourceData;
    const item = {
      product: first.name,
      status: 'review',
      remaining: group.length,
    };
    report.push(item);
    try {
      if (
        !source?.url ||
        !['full-force.com.ua', 'www.full-force.com.ua'].includes(
          new URL(source.url).hostname
        )
      )
        throw Error('Missing or unsupported source page');
      const response = await fetch(source.url, {
        redirect: 'error',
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw Error('Source page HTTP ' + response.status);
      const html = await response.text();
      const current = productFromHtml(html, source.url);
      if (!current) {
        item.reason =
          'На сторінці немає однозначних структурованих даних товару';
        continue;
      }
      item.currentName = current.name;
      item.currentSku = current.sku;
      item.originalSku = source.article;
      item.candidates = current.images;
      if (!sameProduct(source, current)) {
        item.reason = 'Артикул або об’єм відрізняється чи не підтверджений';
        continue;
      }
      item.status = apply ? 'repairing' : 'ready';
      let repaired = 0;
      for (const row of group) {
        const index = (source.images || []).indexOf(row.image_url);
        const candidate = current.images[index];
        if (!candidate || candidate === row.image_url) continue;
        if (!apply) {
          repaired++;
          continue;
        }
        const old = await client.query(
          'SELECT image_url FROM cloudinary_imports WHERE source_url=$1',
          [candidate]
        );
        let url = old.rows[0]?.image_url;
        if (!url) {
          const id =
            'omee/products/import-' +
            createHash('sha256').update(candidate).digest('hex');
          const uploaded = await cloud.uploader.upload(candidate, {
            resource_type: 'image',
            public_id: id,
            asset_folder: 'omee/images',
            overwrite: false,
            timeout: 60000,
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'],
          });
          if (!uploaded.secure_url?.startsWith('https://res.cloudinary.com/'))
            throw Error('Invalid Cloudinary response');
          url = uploaded.secure_url;
          await client.query(
            'INSERT INTO cloudinary_imports(source_url,image_url,public_id,asset_folder) VALUES($1,$2,$3,$4) ON CONFLICT(source_url) DO NOTHING',
            [candidate, url, uploaded.public_id, uploaded.asset_folder || null]
          );
        }
        // Keep the original URL as an auditable alias and reuse it if a future rerun sees it.
        await client.query(
          'INSERT INTO cloudinary_imports(source_url,image_url,public_id,asset_folder) SELECT $1,image_url,public_id,asset_folder FROM cloudinary_imports WHERE source_url=$2 ON CONFLICT(source_url) DO NOTHING',
          [row.image_url, candidate]
        );
        const result = await client.query(
          'UPDATE product_images SET image_url=$1 WHERE id=$2 AND image_url=$3',
          [url, row.image_id, row.image_url]
        );
        repaired += result.rowCount;
      }
      item[apply ? 'repaired' : 'repairable'] = repaired;
      item.remaining -= repaired;
      if (apply) item.status = 'processed';
    } catch (e) {
      item.status = 'error';
      item.reason = e.cause?.code || e.code || e.http_code || e.message;
    }
  }
  console.log(
    JSON.stringify({ mode: apply ? 'apply' : 'preview', report }, null, 2)
  );
  if (!apply)
    console.log('Для перевірених замін: npm run cloudinary:repair -- --apply');
} catch (e) {
  console.error(
    'Repair stopped. Code:',
    e.code || e.cause?.code || 'REPAIR_ERROR'
  );
  process.exitCode = 1;
} finally {
  try {
    if (locked) await client.query('SELECT pg_advisory_unlock(72619202)');
  } finally {
    client?.release();
    await closePool();
  }
}
