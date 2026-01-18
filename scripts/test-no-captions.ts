import { getVideoTranscript } from '../lib/youtube/client';

async function test() {
  // 測試一個可能沒有字幕的影片
  const videoId = 'DqeDWOrIc2g';
  console.log(`Testing video without captions: ${videoId}`);
  
  try {
    const transcript = await getVideoTranscript(videoId);
    console.log(`✅ Got response with ${transcript.length} segments`);
    console.log('Content:', transcript);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

test();
