import test from 'node:test';
import assert from 'node:assert/strict';
import {
  organizeCloudinaryImages,
  IMAGE_FOLDER,
} from './src/services/organizeCloudinaryImages.js';
function fixture(fail = false) {
  const calls = [];
  const client = {
    async query(sql, args) {
      calls.push({ sql, args });
      if (sql.includes('pg_try_advisory')) return { rows: [{ locked: true }] };
      if (sql.startsWith('SELECT source_url'))
        return {
          rows: [
            {
              source_url: 'https://cotril.it/image.png',
              public_id: 'omee/products/original',
            },
          ],
        };
      return { rows: [] };
    },
    release() {
      calls.push({ sql: 'RELEASE' });
    },
  };
  const explicit = [];
  const cloud = {
    uploader: {
      async explicit(id, opts) {
        explicit.push({ id, opts });
        if (fail) throw { http_code: 400 };
        return { public_id: id, asset_folder: IMAGE_FOLDER };
      },
    },
  };
  return { calls, explicit, pool: { connect: async () => client }, cloud };
}
test('organizing moves existing assets without changing delivery URLs or uploading duplicates', async () => {
  const f = fixture();
  const r = await organizeCloudinaryImages(f.pool, f.cloud, { log: () => {} });
  assert.equal(r.moved, 1);
  assert.equal(f.explicit[0].opts.asset_folder, IMAGE_FOLDER);
  assert.equal(f.explicit[0].id, 'omee/products/original');
  assert.ok(
    f.calls.some(c =>
      c.sql.startsWith('UPDATE cloudinary_imports SET asset_folder')
    )
  );
  assert.ok(!f.calls.some(c => c.sql.startsWith('UPDATE product_images')));
  assert.equal(f.calls.at(-1).sql, 'RELEASE');
});
test('failed move is not marked complete, allowing retry', async () => {
  const f = fixture(true);
  const r = await organizeCloudinaryImages(f.pool, f.cloud, { log: () => {} });
  assert.equal(r.failed, 1);
  assert.ok(!f.calls.some(c => c.sql.startsWith('UPDATE')));
});
test('folder preview leaves Cloudinary and database unchanged', async () => {
  const f = fixture();
  const r = await organizeCloudinaryImages(f.pool, null, {
    preview: true,
    log: () => {},
  });
  assert.equal(r.pending, 1);
  assert.equal(f.explicit.length, 0);
  assert.ok(!f.calls.some(c => c.sql.startsWith('UPDATE')));
});
