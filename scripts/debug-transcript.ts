import { YoutubeTranscript } from '../lib/youtube/transcript';

async function test() {
  const videoId = '9P8mASSREYM'; // Next.js Conf Keynote
  console.log(`Testing transcript for: ${videoId}`);
  
  try {
    const result = await YoutubeTranscript.fetchTranscript(videoId);
    console.log('✅ Success!');
    console.log('First 3 items:', result.slice(0, 3));
  } catch (error) {
    console.error('❌ Failed:', error);
  }
}

test();
