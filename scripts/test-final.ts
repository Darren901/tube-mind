import { getVideoTranscript } from '../lib/youtube/client';

async function test() {
  console.log('=== 測試字幕抓取功能 ===\n');
  
  const videos = [
    { id: 'dQw4w9WgXcQ', name: 'Rick Astley - Never Gonna Give You Up (有英文字幕)' },
    { id: 'DqeDWOrIc2g', name: '韓國旅遊影片 (有英文字幕)' },
    { id: 'jNQXAC9IVRw', name: 'Me at the zoo (有英文字幕)' },
  ];

  for (const video of videos) {
    console.log(`\n測試: ${video.name}`);
    console.log(`影片 ID: ${video.id}`);
    
    try {
      const transcript = await getVideoTranscript(video.id);
      console.log(`✅ 成功！抓到 ${transcript.length} 個字幕片段`);
      
      if (transcript.length > 0) {
        console.log(`第一個片段: "${transcript[0].text}"`);
        
        // 檢查是否有 HTML 實體編碼問題
        if (transcript[0].text.includes('&amp;')) {
          console.log('⚠️  警告：仍有 HTML 實體編碼問題');
        } else {
          console.log('✓ HTML 實體編碼已正確處理');
        }
      }
    } catch (error: any) {
      console.log(`❌ 錯誤: ${error.message}`);
    }
  }
  
  console.log('\n=== 測試完成 ===');
}

test();
