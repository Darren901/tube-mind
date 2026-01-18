import axios from 'axios'

async function debugRaw() {
  const videoId = '9P8mASSREYM';
  console.log(`Deep debugging for: ${videoId}`);
  
  const videoPageResponse = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
  })
  const videoPageBody = videoPageResponse.data
  const splittedHTML = videoPageBody.split('"captions":')
  
  if (splittedHTML.length <= 1) {
      console.log('No captions found in HTML')
      return
  }

  const captions = JSON.parse(
      splittedHTML[1].split(',"videoDetails')[0].replace('\n', '')
  )
  const captionTracks = captions.playerCaptionsTracklistRenderer.captionTracks
  console.log('Found tracks:', captionTracks.map((t: any) => t.languageCode))
  
  const transcriptURL = captionTracks[0].baseUrl
  console.log('Fetching URL:', transcriptURL)
  
  const transcriptResponse = await axios.get(transcriptURL)
  
  console.log('--- XML Preview (First 500 chars) ---')
  console.log(transcriptResponse.data.substring(0, 500))
  console.log('-------------------------------------')
}

debugRaw();
