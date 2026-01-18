import { YoutubeTranscript } from 'youtube-transcript-plus';

async function test() {
  const videos = [
    { id: 'dQw4w9WgXcQ', name: 'Rick Astley - Never Gonna Give You Up' },
    { id: 'jNQXAC9IVRw', name: 'Me at the zoo' },
    { id: '9P8mASSREYM', name: 'Next.js Conf' },
  ];

  for (const video of videos) {
    console.log(`\n=== Testing: ${video.name} (${video.id}) ===`);
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(video.id);
      console.log(`✅ Success! Got ${transcript.length} segments`);
      if (transcript.length > 0) {
        console.log('First segment:', transcript[0]);
      }
    } catch (e: any) {
      console.log(`❌ Error: ${e.message}`);
    }
  }
}

test();
