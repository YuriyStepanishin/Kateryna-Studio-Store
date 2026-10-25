import { http } from './http';

type UploadKind = 'image' | 'video';
const uploadConfig = {
  image: {
    preset: 'omee_signed_images',
    folder: 'omee/images',
    resourceType: 'image',
    allowedFormats: 'jpg,jpeg,png,webp',
    maxBytes: 5 * 1024 * 1024,
  },
  video: {
    preset: 'omee_signed_videos',
    folder: 'omee/videos',
    resourceType: 'video',
    allowedFormats: 'mp4,webm',
    maxBytes: 25 * 1024 * 1024,
  },
} as const;
type Signature = {
  timestamp: number;
  upload_preset: string;
  folder: string;
  asset_folder: string;
  public_id: string;
  allowed_formats: string;
  signature: string;
  apiKey: string;
  cloudName: string;
  resourceType: 'image' | 'video';
};

export async function uploadToCloudinary(file: File, kind: UploadKind) {
  const expected = uploadConfig[kind];
  if (file.size < 1 || file.size > expected.maxBytes)
    throw new Error(
      `Файл завеликий або порожній. Максимум ${expected.maxBytes / (1024 * 1024)} МБ.`
    );
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !expected.allowedFormats.split(',').includes(extension))
    throw new Error(`Непідтримуваний формат. Дозволено: ${expected.allowedFormats}.`);

  const { data: signature } = await http.post<Signature>(
    '/admin/uploads/sign',
    { kind, size: file.size }
  );
  if (
    signature.upload_preset !== expected.preset ||
    signature.folder !== expected.folder ||
    signature.asset_folder !== expected.folder ||
    signature.allowed_formats !== expected.allowedFormats ||
    signature.resourceType !== expected.resourceType
  )
    throw new Error('Параметри завантаження Cloudinary не відповідають конфігурації.');

  const body = new FormData();
  body.append('file', file);
  body.append('api_key', signature.apiKey);
  body.append('timestamp', String(signature.timestamp));
  body.append('upload_preset', signature.upload_preset);
  body.append('folder', signature.folder);
  body.append('asset_folder', signature.asset_folder);
  body.append('public_id', signature.public_id);
  body.append('allowed_formats', signature.allowed_formats);
  body.append('signature', signature.signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloudName)}/${signature.resourceType}/upload`,
    { method: 'POST', body }
  );
  if (!response.ok)
    throw new Error('Cloudinary не прийняв файл. Перевірте формат і розмір.');
  const asset: unknown = await response.json();
  if (
    !asset ||
    typeof asset !== 'object' ||
    !('public_id' in asset) ||
    typeof asset.public_id !== 'string' ||
    !('secure_url' in asset) ||
    typeof asset.secure_url !== 'string'
  )
    throw new Error('Cloudinary повернув некоректні дані файлу.');

  const publicId = asset.public_id.split('/').pop();
  if (!publicId) throw new Error('Cloudinary повернув некоректний ідентифікатор файлу.');
  const { data } = await http.post<{ url: string }>('/admin/uploads/verify', {
    kind,
    publicId,
    secureUrl: asset.secure_url,
  });
  return data.url;
}
