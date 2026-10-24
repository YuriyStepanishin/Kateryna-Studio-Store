export const IMAGE_FOLDER = 'omee/images';
export async function organizeCloudinaryImages(
  pool,
  cloudinary,
  { preview = false, log = console.log } = {}
) {
  const client = await pool.connect();
  let locked = false;
  const result = { moved: 0, failed: 0 };
  try {
    const lock = await client.query(
      'SELECT pg_try_advisory_lock(72619202) AS locked'
    );
    if (!lock.rows[0].locked) throw Error('Image migration already running');
    locked = true;
    const { rows } = await client.query(
      'SELECT source_url,public_id FROM cloudinary_imports WHERE asset_folder IS DISTINCT FROM $1 ORDER BY source_url',
      [IMAGE_FOLDER]
    );
    log(`Фото для переміщення у ${IMAGE_FOLDER}: ${rows.length}.`);
    if (preview) return { ...result, pending: rows.length };
    for (const [index, row] of rows.entries()) {
      try {
        // Explicit changes only the Media Library folder, preserving public ID and delivery URLs.
        const moved = await cloudinary.uploader.explicit(row.public_id, {
          type: 'upload',
          resource_type: 'image',
          asset_folder: IMAGE_FOLDER,
          timeout: 60000,
        });
        if (
          moved.asset_folder !== IMAGE_FOLDER ||
          moved.public_id !== row.public_id
        )
          throw Error('Folder move not confirmed');
        await client.query(
          'UPDATE cloudinary_imports SET asset_folder=$1 WHERE source_url=$2 AND public_id=$3',
          [IMAGE_FOLDER, row.source_url, row.public_id]
        );
        result.moved++;
        log(`[${index + 1}/${rows.length}] Фото переміщено.`);
      } catch (error) {
        result.failed++;
        const code =
          error.error?.code || error.code || error.http_code || 'MOVE_ERROR';
        log(
          `[${index + 1}/${rows.length}] Не вдалося перемістити фото. Код: ${code}`
        );
        if (
          [
            'ENOTFOUND',
            'EAI_AGAIN',
            'ETIMEDOUT',
            'ECONNREFUSED',
            401,
            403,
            420,
            429,
          ].includes(code)
        )
          throw error;
      }
    }
    return result;
  } finally {
    try {
      if (locked) await client.query('SELECT pg_advisory_unlock(72619202)');
    } finally {
      client.release();
    }
  }
}
