import { Storage } from '@google-cloud/storage'

const storage = new Storage()

export async function uploadAudio(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const bucketName = process.env.GCS_BUCKET_NAME
  
  if (!bucketName) {
    throw new Error('GCS_BUCKET_NAME 環境變數未設定')
  }

  const bucket = storage.bucket(bucketName)
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
  } catch (err: any) {
    // 如果 Bucket 設定了 Uniform Access，makePublic 會報錯，但這是正常的
    if (err.message?.includes('uniform bucket-level access')) {
      console.log('[Storage] Bucket 使用統一權限管理，跳過單檔公開設定')
    } else {
      console.warn('[Storage] 設定公開權限失敗:', err.message)
    }
  }

  // 回傳公開 URL
  return `https://storage.googleapis.com/${bucketName}/${filename}`
}
