// @ts-nocheck
import { YoutubeTranscript } from 'youtube-transcript';

async function testTranscript() {
  const videoId = 'DqeDWOrIc2g';
  console.log(`Testing transcript for video: ${videoId}`);

  try {
    console.log('Attempt 1: Fetching English (lang: "en")...');
    const transcriptEn = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
    console.log('✅ Success (en)! Length:', transcriptEn.length);
    return;
  } catch (e: any) {
    console.log('❌ Failed (en):', e.message);
  }

  try {
    console.log('Attempt 2: Fetching Default (no lang)...');
    const transcriptDefault = await YoutubeTranscript.fetchTranscript(videoId);
    console.log('✅ Success (default)! Length:', transcriptDefault.length);
    return;
  } catch (e: any) {
    console.log('❌ Failed (default):', e.message);
  }
}

testTranscript();
