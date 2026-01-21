import { TextToSpeechClient } from '@google-cloud/text-to-speech';

/**
 * Google Cloud Text-to-Speech client
 * It automatically uses GOOGLE_APPLICATION_CREDENTIALS environment variable
 */
const client = new TextToSpeechClient();

/**
 * Generates speech from text using Google Cloud TTS
 * @param text The text to convert to speech
 * @returns Buffer containing the MP3 audio data
 */
export async function generateSpeech(text: string): Promise<Buffer> {
  try {
    const request = {
      input: { text },
      voice: {
        languageCode: 'zh-TW',
        name: 'cmn-TW-Standard-A', // Female voice
        ssmlGender: 'FEMALE' as const,
      },
      audioConfig: {
        audioEncoding: 'MP3' as const,
        speakingRate: 1.0,
      },
    };

    const [response] = await client.synthesizeSpeech(request);

    if (!response.audioContent) {
      throw new Error('TTS response did not contain audio content');
    }

    return response.audioContent as Buffer;
  } catch (error) {
    console.error('Error in generateSpeech:', error);
    throw new Error('Failed to generate speech: ' + (error instanceof Error ? error.message : String(error)));
  }
}
