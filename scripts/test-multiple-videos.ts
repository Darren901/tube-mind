// @ts-nocheck
import { YoutubeTranscript } from 'youtube-transcript';

async function test() {
  // 測試幾個不同的影片
  const videos = [
    { id: 'DqeDWOrIc2g', name: 'Original test video' },
    { id: 'dQw4w9WgXcQ', name: 'Rick Astley - Never Gonna Give You Up' },
    { id: 'jNQXAC9IVRw', name: 'Me at the zoo (first YouTube video)' },
  ];

  for (const video of videos) {
    console.log(`\n=== Testing: ${video.name} (${video.id}) ===`);
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(video.id);
      console.log(`✅ Success! Got ${transcript.length} segments`);
      if (transcript.length > 0) {
        console.log('First segment:', transcript[0]);
      } else {
        console.log('⚠️  Empty transcript array');
      }
    } catch (e: any) {
      console.log(`❌ Error: ${e.message}`);
    }
  }
}

test();
