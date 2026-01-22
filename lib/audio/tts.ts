import { TextToSpeechClient } from '@google-cloud/text-to-speech'

const client = new TextToSpeechClient()
const MAX_BYTES = 4500 // 留一點緩衝空間，官方限制是 5000 bytes

export interface TTSOptions {
  text: string
  languageCode?: string
  voiceName?: string
}

/**
 * 將字串切割成小塊，確保每塊都不超過指定的 byte 長度
 * 使用 TextEncoder 來精確計算 byte 長度
 */
function splitTextByBytes(text: string, maxBytes: number): string[] {
  const encoder = new TextEncoder()
  const chunks: string[] = []
  let currentChunk = ''
  
  // 以換行或句號為優先切割點
  const segments = text.split(/([\n。！？])/g)
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const testChunk = currentChunk + segment
    
    if (encoder.encode(testChunk).length > maxBytes) {
      if (currentChunk) {
        chunks.push(currentChunk)
        currentChunk = segment
      } else {
        // 如果單一 segment 就超過限制（極少見），則強制切分
        const chars = [...segment]
        let temp = ''
        for (const char of chars) {
          if (encoder.encode(temp + char).length > maxBytes) {
            chunks.push(temp)
            temp = char
          } else {
            temp += char
          }
        }
        currentChunk = temp
      }
    } else {
      currentChunk = testChunk
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk)
  }
  
  return chunks
}

export async function generateSpeech(options: TTSOptions): Promise<Buffer> {
  const { text, languageCode = 'zh-TW', voiceName = 'cmn-TW-Standard-A' } = options

  // 1. 切割文字
  const textChunks = splitTextByBytes(text, MAX_BYTES)
  const audioBuffers: Buffer[] = []

  console.log(`[TTS] Text split into ${textChunks.length} chunks`)

  // 2. 依序生成音訊
  for (let i = 0; i < textChunks.length; i++) {
    console.log(`[TTS] Generating chunk ${i + 1}/${textChunks.length}...`)
    const [response] = await client.synthesizeSpeech({
      input: { text: textChunks[i] },
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

    if (response.audioContent) {
      audioBuffers.push(Buffer.from(response.audioContent as Uint8Array))
    }
  }

  if (audioBuffers.length === 0) {
    throw new Error('TTS 生成失敗：無音訊內容')
  }

  // 3. 合併所有 Buffer
  return Buffer.concat(audioBuffers)
}
