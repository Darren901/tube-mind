import { getVideoTranscript } from '../lib/youtube/client';

async function test() {
  const videoId = 'dQw4w9WgXcQ';
  console.log(`Testing getVideoTranscript for: ${videoId}`);
  
  try {
    const transcript = await getVideoTranscript(videoId);
    console.log(`✅ Success! Got ${transcript.length} segments`);
    if (transcript.length > 0) {
      console.log('First segment:', transcript[0]);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

test();
