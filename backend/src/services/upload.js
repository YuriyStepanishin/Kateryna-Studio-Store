import { configureCloudinary } from '../config/cloudinary.js';
export function detectImage(buffer) {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return 'png';
  if (
    buffer.length >= 3 &&
    buffer[0] === 255 &&
    buffer[1] === 216 &&
    buffer[2] === 255
  )
    return 'jpg';
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  )
    return 'webp';
  return null;
}
export function detectVideo(buffer) {
  return (
    (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') ||
    (buffer.length >= 4 &&
      buffer.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163])))
  );
}
export function uploadImage(file, env = process.env) {
  return uploadMedia(file, 'image', env);
}
export function uploadVideo(file, env = process.env) {
  return uploadMedia(file, 'video', env);
}
function uploadMedia(file, kind, env) {
  if (
    !file ||
    !(kind === 'image' ? detectImage(file.buffer) : detectVideo(file.buffer))
  )
    throw Object.assign(
      new Error(
        kind === 'image'
          ? 'Оберіть фото JPEG, PNG або WebP (до 5 МБ).'
          : 'Оберіть відео MP4 або WebM (до 25 МБ).'
      ),
      { status: 400 }
    );
  const cloudinary = configureCloudinary(env);
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        asset_folder: kind === 'image' ? 'omee/images' : 'omee/videos',
        timeout: 60000,
        folder: kind === 'image' ? 'omee/images' : 'omee/videos',
        resource_type: kind,
        allowed_formats:
          kind === 'image' ? ['jpg', 'png', 'webp'] : ['mp4', 'webm'],
        ...(kind === 'image'
          ? { transformation: [{ width: 2000, height: 2000, crop: 'limit' }] }
          : {}),
      },
      (error, result) => {
        if (error)
          return reject(
            Object.assign(
              new Error('Не вдалося завантажити файл. Спробуйте пізніше.'),
              { status: 502 }
            )
          );
        resolve({
          imageUrl: result.secure_url,
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
          width: result.width,
          height: result.height,
        });
      }
    );
    stream.end(file.buffer);
  });
}
