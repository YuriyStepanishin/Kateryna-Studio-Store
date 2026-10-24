import { createHash } from 'node:crypto';
import { getPool, closePool } from '../config/db.js';
import { configureCloudinary } from '../config/cloudinary.js';
import {
  photoIdentity,
  betterResolution,
  smallPhoto,
} from '../services/imageQuality.js';
const apply = process.argv.includes('--apply');
let client,
  locked = false;
const stats = {
  checked: 0,
  small: 0,
  replaced: 0,
  ready: 0,
  review: 0,
  failed: 0,
};
const report = [];
try {
  const cloud = configureCloudinary();
  client = await getPool().connect();
  const lock = await client.query(
    'SELECT pg_try_advisory_lock(72619202) AS locked'
  );
  if (!lock.rows[0].locked) throw Error('Image job already running');
  locked = true;
  const { rows } = await client.query(
    `SELECT i.id,i.image_url,p.name,p.description,p.characteristics FROM product_images i JOIN products p ON p.id=i.product_id ORDER BY p.id,i.sort_order,i.id`
  );
  const receipts = (
    await client.query(
      'SELECT source_url,image_url,public_id FROM cloudinary_imports'
    )
  ).rows;
  const byUrl = new Map(),
    bySource = new Map(),
    byIdentity = new Map();
  for (const row of receipts) {
    const values = byUrl.get(row.image_url) || [];
    values.push(row);
    byUrl.set(row.image_url, values);
    bySource.set(row.source_url, row);
    const key = photoIdentity(row.source_url);
    if (key) {
      const list = byIdentity.get(key) || [];
      list.push(row);
      byIdentity.set(key, list);
    }
  }
  // Upload API Explicit returns actual dimensions without downloading, resizing, or using Admin API quota.
  const metadata = new Map();
  async function measure(receipt) {
    if (metadata.has(receipt.public_id)) return metadata.get(receipt.public_id);
    const meta = await cloud.uploader.explicit(receipt.public_id, {
      type: 'upload',
      resource_type: 'image',
      timeout: 60000,
    });
    if (!meta.width || !meta.height) throw Error('Dimensions unavailable');
    const result = { width: meta.width, height: meta.height };
    metadata.set(receipt.public_id, result);
    return result;
  }
  let index = 0;
  for (const row of rows) {
    index++;
    try {
      const originals = byUrl.get(row.image_url) || [];
      if (!originals.length) {
        stats.review++;
        report.push({
          product: row.name,
          description: row.description?.slice(0, 350),
          image: row.image_url,
          status: 'review',
          reason:
            'Немає підтвердженого оригіналу: потрібна перевірка зображення, назви й опису',
        });
        continue;
      }
      const current = await measure(originals[0]);
      stats.checked++;
      if (!smallPhoto(current)) continue;
      stats.small++;
      const keys = new Set(
        originals.map(r => photoIdentity(r.source_url)).filter(Boolean)
      );
      const candidateReceipts = new Map();
      for (const key of keys)
        for (const receipt of byIdentity.get(key) || [])
          candidateReceipts.set(receipt.image_url, receipt);
      let best = null,
        bestMeta = current;
      for (const receipt of candidateReceipts.values()) {
        if (receipt.image_url === row.image_url) continue;
        const meta = await measure(receipt);
        if (betterResolution(bestMeta, meta)) {
          best = receipt;
          bestMeta = meta;
        }
      }
      const source = row.characteristics?.sourceData || {};
      // Only original URLs of the exact same photo are safe for automatic replacement.
      const sourceCandidates = (source.images || []).filter(
        url =>
          keys.has(photoIdentity(url)) &&
          !bySource.has(url) &&
          !/-150x150\./i.test(url)
      );
      if (!best && apply) {
        for (const url of sourceCandidates) {
          try {
            const publicId =
              'omee/products/import-' +
              createHash('sha256').update(url).digest('hex');
            const uploaded = await cloud.uploader.upload(url, {
              resource_type: 'image',
              public_id: publicId,
              asset_folder: 'omee/images',
              overwrite: false,
              timeout: 60000,
              allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'],
            });
            if (
              !uploaded.secure_url?.startsWith('https://res.cloudinary.com/') ||
              !uploaded.public_id
            )
              throw Error('Invalid Cloudinary result');
            const receipt = {
              source_url: url,
              image_url: uploaded.secure_url,
              public_id: uploaded.public_id,
            };
            await client.query(
              'INSERT INTO cloudinary_imports(source_url,image_url,public_id,asset_folder) VALUES($1,$2,$3,$4) ON CONFLICT(source_url) DO NOTHING',
              [
                url,
                receipt.image_url,
                receipt.public_id,
                uploaded.asset_folder || null,
              ]
            );
            bySource.set(url, receipt);
            metadata.set(receipt.public_id, {
              width: uploaded.width,
              height: uploaded.height,
            });
            const list = byIdentity.get(photoIdentity(url)) || [];
            list.push(receipt);
            byIdentity.set(photoIdentity(url), list);
            if (betterResolution(bestMeta, uploaded)) {
              best = receipt;
              bestMeta = { width: uploaded.width, height: uploaded.height };
              break;
            }
          } catch (error) {
            if (
              ['ENOTFOUND', 'EAI_AGAIN', 401, 403].includes(
                error.error?.code || error.code || error.http_code
              )
            )
              throw error;
          }
        }
      }
      const entry = {
        product: row.name,
        description: row.description?.slice(0, 350),
        sourcePage: source.url || row.characteristics?.sourceUrl,
        from: row.image_url,
        dimensions: current,
        status: best ? 'ready' : 'review',
      };
      if (best) {
        entry.to = best.image_url;
        entry.newDimensions = bestMeta;
        stats.ready++;
        if (apply) {
          const r = await client.query(
            'UPDATE product_images SET image_url=$1 WHERE id=$2 AND image_url=$3',
            [best.image_url, row.id, row.image_url]
          );
          stats.replaced += r.rowCount;
          entry.status = r.rowCount ? 'replaced' : 'changed_by_admin';
        }
      } else {
        stats.review++;
        entry.reason = 'Немає перевіреної більшої версії того самого фото';
        entry.sourceCandidates = sourceCandidates;
      }
      report.push(entry);
    } catch (error) {
      stats.failed++;
      report.push({
        product: row.name,
        status: 'error',
        code:
          error.error?.code || error.code || error.http_code || 'QUALITY_ERROR',
      });
      if (
        ['ENOTFOUND', 'EAI_AGAIN', 401, 403].includes(
          error.error?.code || error.code || error.http_code
        )
      )
        throw error;
    } finally {
      if (index % 25 === 0)
        console.log(
          `Перевірено записів: ${index}/${rows.length}; замінено: ${stats.replaced}.`
        );
    }
  }
  console.log(
    JSON.stringify(
      { mode: apply ? 'apply' : 'preview', ...stats, report },
      null,
      2
    )
  );
  if (!apply)
    console.log(
      'Замінити підтверджені малі фото: npm run cloudinary:quality -- --apply'
    );
  if (stats.failed) process.exitCode = 1;
} catch (e) {
  console.error(
    'Перевірка фото зупинена. Код:',
    e.error?.code || e.code || e.http_code || 'QUALITY_ERROR'
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
