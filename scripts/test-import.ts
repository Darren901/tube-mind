import * as scraper from 'youtube-caption-scraper';
console.log('Scraper:', scraper);

try {
  // @ts-ignore
  if (typeof scraper.getSubtitles === 'function') {
    console.log('✅ scraper.getSubtitles is function');
  } else if (typeof scraper.default?.getSubtitles === 'function') {
    console.log('✅ scraper.default.getSubtitles is function');
  } else {
    console.log('❌ getSubtitles not found in scraper');
  }
} catch (e) {
  console.log(e);
}
