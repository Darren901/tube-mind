import { Storage } from '@google-cloud/storage'

const storage = new Storage()
const bucketName = process.env.GCS_BUCKET_NAME!

const bucket = storage.bucket(bucketName)

export async function uploadAudio(
  buffer: Buffer,
  filename: string
): Promise<string> {
  if (!bucketName) {
    throw new Error('GCS_BUCKET_NAME 環境變數未設定')
  }

  const file = bucket.file(filename)

  await file.save(buffer, {
    metadata: {
      contentType: 'audio/mpeg',
      cacheControl: 'public, max-age=31536000', // 快取一年
    },
  })

  // 設定公開讀取權限
  try {
    await file.makePublic()
  } catch (err) {
    console.warn('[Storage] 設定公開權限失敗，可能是 Bucket 已設定 Uniform Bucket-Level Access:', err)
    // 如果 Bucket 設定了 Uniform Access，這行會報錯，但通常權限已經透過 Bucket 設定好了
  }

  // 回傳公開 URL
  return `https://storage.googleapis.com/${bucketName}/${filename}`
}
