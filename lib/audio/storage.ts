import { Storage } from '@google-cloud/storage';

/**
 * Google Cloud Storage client
 * It automatically uses GOOGLE_APPLICATION_CREDENTIALS environment variable
 */
const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME;

/**
 * Uploads an audio buffer to Google Cloud Storage
 * @param audioBuffer The audio data to upload
 * @param fileName The destination file name (e.g., 'audio/summary-id.mp3')
 * @returns The public URL of the uploaded file
 */
export async function uploadAudio(audioBuffer: Buffer, fileName: string): Promise<string> {
  if (!bucketName) {
    throw new Error('GCS_BUCKET_NAME is not defined in environment variables');
  }

  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    // Upload the buffer
    await file.save(audioBuffer, {
      metadata: {
        contentType: 'audio/mpeg',
      },
      resumable: false,
    });

    /**
     * Set the file to be publicly readable.
     * Note: This requires the bucket to not have "Public Access Prevention" enabled.
     * If using uniform bucket-level access, ensure the bucket has 'allUsers' as 'Storage Object Viewer'.
     */
    try {
      await file.makePublic();
    } catch (makePublicError) {
      // Log warning but continue, as the bucket might already have uniform public access
      console.warn(`Could not set file ${fileName} to public. Ensure bucket has public access or uniform access configured.`, makePublicError);
    }

    // Return the public URL
    return `https://storage.googleapis.com/${bucketName}/${fileName}`;
  } catch (error) {
    console.error('Error in uploadAudio:', error);
    throw new Error('Failed to upload audio: ' + (error instanceof Error ? error.message : String(error)));
  }
}
