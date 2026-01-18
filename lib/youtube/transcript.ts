import axios from 'axios'

export interface TranscriptItem {
  text: string
  duration: number
  offset: number
}

export class YoutubeTranscriptError extends Error {
  constructor(message: string) {
    super(`[YoutubeTranscript] ${message}`)
  }
}

export class YoutubeTranscript {
  public static async fetchTranscript(videoId: string, config?: { lang?: string }): Promise<TranscriptItem[]> {
    const identifier = videoId
    const videoPageResponse = await axios.get(`https://www.youtube.com/watch?v=${identifier}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    })
    const videoPageBody = videoPageResponse.data

    const splittedHTML = videoPageBody.split('"captions":')

    if (splittedHTML.length <= 1) {
      if (videoPageBody.includes('class="g-recaptcha"')) {
        console.error('YouTube is asking for captcha')
        throw new YoutubeTranscriptError('YouTube is asking for captcha')
      }
      if (!videoPageBody.includes('"playabilityStatus":')) {
        console.error('Video is unavailable')
        throw new YoutubeTranscriptError('Video is unavailable')
      }
      console.error('Transcripts disabled or no data found in HTML')
      throw new YoutubeTranscriptError('Transcripts disabled or no data')
    }

    const captions = JSON.parse(
      splittedHTML[1].split(',"videoDetails')[0].replace('\n', '')
    )

    const captionTracks = captions.playerCaptionsTracklistRenderer.captionTracks
    const language = config?.lang || 'en'

    const transcriptURL = (
      captionTracks.find((track: any) => track.languageCode.includes(language)) ||
      captionTracks[0]
    ).baseUrl

    const transcriptResponse = await axios.get(transcriptURL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    })
    const transcriptBody = transcriptResponse.data
    
    // Optimized XML Parsing using more flexible regex
    const results: TranscriptItem[] = []
    // Matches <text ...>content</text>
    // Captures: 1=attributes, 2=content
    const regex = /<text\s+([^>]+)>([^<]*)<\/text>/g
    let match
    
    while ((match = regex.exec(transcriptBody)) !== null) {
      const attributes = match[1]
      const text = match[2]
      
      // Extract start and dur from attributes string
      const startMatch = attributes.match(/start="([\d.]+)"/)
      const durMatch = attributes.match(/dur="([\d.]+)"/)
      
      if (startMatch && durMatch) {
        results.push({
          offset: parseFloat(startMatch[1]),
          duration: parseFloat(durMatch[1]),
          text: text.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
        })
      }
    }

    return results
  }
}
