import { getVideoTranscript } from '@/lib/youtube/client';
import { generateVideoSummary } from '@/lib/ai/summarizer';
import 'dotenv/config';

async function testFlow() {
  const videoId = '9P8mASSREYM'; // Next.js Conf Keynote
  const videoTitle = 'Next.js Conf 2023 Keynote';

  console.log(`🚀 Testing summary flow for: ${videoId}`);

  try {
    // 1. Fetch Transcript
    console.log('1️⃣ Fetching transcript...');
    const transcript = await getVideoTranscript(videoId);
    console.log(`✅ Transcript fetched. Length: ${transcript.length}`);
    console.log(`   Sample text: ${transcript[0].text.substring(0, 50)}...`);

    // 2. Generate Summary
    console.log('2️⃣ Generating summary with Gemini...');
    const summary = await generateVideoSummary(transcript, videoTitle);

    console.log('✅ Summary generated!');
    console.log('--- Result ---');
    console.log(JSON.stringify(summary, null, 2));

  } catch (error: any) {
    console.error('❌ Failed:', error);
  }
}

testFlow();
