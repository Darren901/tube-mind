import { TextToSpeechClient } from '@google-cloud/text-to-speech'

const client = new TextToSpeechClient()

export interface TTSOptions {
  text: string
  languageCode?: string
  voiceName?: string
}

export async function generateSpeech(options: TTSOptions): Promise<Buffer> {
  const { text, languageCode = 'zh-TW', voiceName = 'cmn-TW-Standard-A' } = options

  const [response] = await client.synthesizeSpeech({
    input: { text },
    voice: {
      languageCode,
      name: voiceName,
      ssmlGender: 'FEMALE',
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 1.0,
      pitch: 0.0,
      volumeGainDb: 0.0,
    },
  })

  if (!response.audioContent) {
    throw new Error('TTS 生成失敗：無音訊內容')
  }

  return Buffer.from(response.audioContent as Uint8Array)
}
