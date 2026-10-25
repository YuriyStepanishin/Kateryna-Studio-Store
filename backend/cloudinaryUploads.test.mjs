import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {
  createUploadSignature,
  verifySignedCloudinaryUrl,
  verifyUploadedAsset,
} from './src/services/cloudinaryUploads.js';

const env={
  CLOUDINARY_CLOUD_NAME:'demo-cloud',
  CLOUDINARY_API_KEY:'public-key',
  CLOUDINARY_API_SECRET:'server-only-secret',
};
const client={
  utils:{api_sign_request:params=>`signature-${params.upload_preset}`},
  api:{resource:async()=>({})},
};
const signedId=(kind,timestamp)=>{
  const nonce='a'.repeat(32);
  const signature=createHmac('sha256',env.CLOUDINARY_API_SECRET).update(`${kind}:${timestamp}:${nonce}`).digest('hex');
  return `u${timestamp}_${nonce}_${signature}`;
};

test('creates matching fixed signed image parameters without exposing the API secret',()=>{
  const result=createUploadSignature({kind:'image',size:5*1024*1024},env,client);
  assert.equal(result.upload_preset,'omee_signed_images');
  assert.equal(result.folder,'omee/images');
  assert.equal(result.asset_folder,'omee/images');
  assert.equal(result.allowed_formats,'jpg,jpeg,png,webp');
  assert.equal(result.resourceType,'image');
  assert.equal(result.signature,'signature-omee_signed_images');
  assert.equal(JSON.stringify(result).includes(env.CLOUDINARY_API_SECRET),false);
});

test('creates matching fixed signed video parameters and rejects oversized files server-side',()=>{
  const result=createUploadSignature({kind:'video',size:25*1024*1024},env,client);
  assert.equal(result.upload_preset,'omee_signed_videos');
  assert.equal(result.folder,'omee/videos');
  assert.equal(result.asset_folder,'omee/videos');
  assert.equal(result.allowed_formats,'mp4,webm');
  assert.equal(result.resourceType,'video');
  assert.equal(result.signature,'signature-omee_signed_videos');
  assert.throws(()=>createUploadSignature({kind:'raw',size:10},env,client),{status:400});
  assert.throws(()=>createUploadSignature({kind:'video',size:25*1024*1024+1},env,client),{status:413});
  assert.throws(()=>createUploadSignature({kind:'image',size:5*1024*1024+1},env,client),{status:413});
});

test('verifies Cloudinary metadata and folder before accepting a signed upload URL',async()=>{
  const timestamp=Math.floor(Date.now()/1000);
  const publicId=signedId('image',timestamp);
  const secureUrl=`https://res.cloudinary.com/demo-cloud/image/upload/v${timestamp}/omee/images/${publicId}.jpg`;
  const verifiedClient={
    api:{resource:async id=>({
      public_id:`omee/images/${publicId}`,
      asset_folder:'omee/images',
      resource_type:'image',
      format:'jpg',
      bytes:2048,
      created_at:new Date(timestamp*1000).toISOString(),
      secure_url:secureUrl,
    })},
  };
  await verifyUploadedAsset({kind:'image',publicId,secureUrl},env,verifiedClient);
  await verifySignedCloudinaryUrl(secureUrl,'image',env,verifiedClient);
});

test('accepts JPEG assets when Cloudinary reports the jpeg format',async()=>{
  const timestamp=Math.floor(Date.now()/1000);
  const publicId=signedId('image',timestamp);
  const secureUrl=`https://res.cloudinary.com/demo-cloud/image/upload/v${timestamp}/omee/images/${publicId}.jpeg`;
  await verifyUploadedAsset({kind:'image',publicId,secureUrl},env,{
    api:{resource:async()=>({
      public_id:`omee/images/${publicId}`,
      asset_folder:'omee/images',
      resource_type:'image',
      format:'jpeg',
      bytes:2048,
      created_at:new Date(timestamp*1000).toISOString(),
      secure_url:secureUrl,
    })},
  });
});

test('rejects a signed upload when Cloudinary metadata violates allowed format, size, or folder',async()=>{
  const timestamp=Math.floor(Date.now()/1000);
  const publicId=signedId('image',timestamp);
  const secureUrl=`https://res.cloudinary.com/demo-cloud/image/upload/v${timestamp}/omee/images/${publicId}.jpg`;
  const invalidClient={
    api:{resource:async()=>({
      public_id:publicId,
      asset_folder:'omee/videos',
      resource_type:'image',
      format:'gif',
      bytes:6*1024*1024,
      created_at:new Date(timestamp*1000).toISOString(),
      secure_url:secureUrl,
    })},
  };
  await assert.rejects(verifyUploadedAsset({kind:'image',publicId,secureUrl},env,invalidClient),{status:400});
});

test('accepts existing assets in both image folders without changing their URLs',async()=>{
  for(const folder of ['kateryna-studio/images','omee/images']){
    let lookedUpPublicId;
    const publicId=`${folder}/updated-product`;
    const secureUrl=`https://res.cloudinary.com/demo-cloud/image/upload/v123/${folder}/updated-product.jpg`;
    await verifySignedCloudinaryUrl(
      secureUrl,
      'image',
      env,
      {api:{resource:async id=>{
        lookedUpPublicId=id;
        return {
          public_id:publicId,
          version:123,
          resource_type:'image',
          format:'jpg',
          secure_url:secureUrl,
        };
      }}}
    );
    assert.equal(lookedUpPublicId,publicId);
  }
});

test('accepts legacy URLs with Cloudinary transformations while verifying the underlying asset version',async()=>{
  const publicId='kateryna-studio/images/updated-product';
  await verifySignedCloudinaryUrl(
    'https://res.cloudinary.com/demo-cloud/image/upload/c_fill,w_900/v123/kateryna-studio/images/updated-product.jpg',
    'image',
    env,
    {api:{resource:async()=>({
      public_id:publicId,
      version:123,
      resource_type:'image',
      format:'jpg',
      secure_url:`https://res.cloudinary.com/demo-cloud/image/upload/v123/${publicId}.jpg`,
    })}}
  );
});

test('rejects Cloudinary URLs from a different account without querying them',async()=>{
  let lookups=0;
  await assert.rejects(
    verifySignedCloudinaryUrl(
      'https://res.cloudinary.com/other-cloud/image/upload/v123/omee/images/asset.jpg',
      'image',
      env,
      {api:{resource:async()=>{lookups++;return {};}}}
    ),
    {status:400}
  );
  assert.equal(lookups,0);
});

test('rejects legacy Cloudinary URLs that do not resolve to an owned asset',async()=>{
  await assert.rejects(
    verifySignedCloudinaryUrl(
      'https://res.cloudinary.com/demo-cloud/image/upload/v123/legacy/missing.jpg',
      'image',
      env,
      {api:{resource:async()=>{const error=new Error('missing');error.http_code=404;throw error;}}}
    ),
    {status:400}
  );
});
