# TTS Service 測試案例

[x] [正常情況] 生成短文字語音
[x] [正常情況] 生成長文字語音 (觸發分段)
[x] [邊界值] 文字剛好等於 MAX_BYTES
[x] [邊界值] 單一 segment 超過 MAX_BYTES

**測試資料**
- text: 超過 4500 bytes 且中間沒有標點符號的連續字串

**預期結果**
1. `splitTextByBytes` 強制切分字元
2. 成功生成多段音訊並合併
