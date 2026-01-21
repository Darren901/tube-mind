# YouTube Client 測試案例清單

**檔案**: `lib/youtube/client.ts`  
**測試檔案**: `Test/lib/youtube/client.test.ts`  
**最後更新**: 2026-01-21

---

## YouTubeClient 類別測試

### 1. Constructor

[x] [正常情況] 正確初始化 YouTube API 客戶端
**測試資料**
```typescript
accessToken = "valid_access_token"
```

**預期結果**
- 成功建立 YouTubeClient 實例
- OAuth2 客戶端正確設定憑證
- YouTube API 客戶端使用 v3 版本

---

### 2. getSubscriptions()

[x] [正常情況] 成功取得單頁訂閱列表
**測試資料**
```typescript
mockResponse = {
  data: {
    items: [
      {
        snippet: {
          resourceId: { channelId: 'channel1' },
          title: 'Channel 1',
          description: 'Description 1',
          thumbnails: { high: { url: 'http://thumbnail1.jpg' } }
        }
      }
    ],
    nextPageToken: undefined
  }
}
```

**預期結果**
```typescript
返回 [
  {
    id: 'channel1',
    title: 'Channel 1',
    description: 'Description 1',
    thumbnail: 'http://thumbnail1.jpg'
  }
]
```

---

[x] [正常情況] 成功處理多頁訂閱列表 (分頁)
**測試資料**
```typescript
第一頁: nextPageToken = 'token123'
第二頁: nextPageToken = undefined
總共 2 頁，每頁 2 個頻道
```

**預期結果**
- 返回包含所有 4 個頻道的陣列
- 驗證 YouTube API 被呼叫 2 次
- 第二次呼叫帶有 pageToken: 'token123'

---

[x] [邊界值] 訂閱列表為空
**測試資料**
```typescript
mockResponse = {
  data: {
    items: [],
    nextPageToken: undefined
  }
}
```

**預期結果**
返回空陣列 `[]`

---

[x] [邊界值] 處理缺少 snippet 資料的項目
**測試資料**
```typescript
mockResponse = {
  data: {
    items: [
      { snippet: null },
      { snippet: { resourceId: null, title: null } }
    ]
  }
}
```

**預期結果**
```typescript
返回 [
  { id: '', title: '', description: undefined, thumbnail: undefined },
  { id: '', title: '', description: undefined, thumbnail: undefined }
]
```

---

[x] [異常處理] YouTube API 呼叫失敗
**測試資料**
```typescript
YouTube API 拋出錯誤: "Quota exceeded"
```

**預期結果**
拋出錯誤並傳遞原始錯誤訊息

---

### 3. getChannelDetails()

[x] [正常情況] 成功取得頻道詳細資訊
**測試資料**
```typescript
channelId = 'UCxxxxxx'
mockResponse = {
  data: {
    items: [{
      id: 'UCxxxxxx',
      snippet: {
        title: 'Test Channel',
        description: 'A test channel',
        thumbnails: { high: { url: 'http://thumbnail.jpg' } }
      }
    }]
  }
}
```

**預期結果**
```typescript
返回 {
  id: 'UCxxxxxx',
  title: 'Test Channel',
  description: 'A test channel',
  thumbnail: 'http://thumbnail.jpg'
}
```

---

[x] [異常處理] 頻道不存在 (404)
**測試資料**
```typescript
channelId = 'invalid_id'
mockResponse = { data: { items: [] } }
```

**預期結果**
返回 `null`

---

[x] [邊界值] 頻道資料不完整
**測試資料**
```typescript
mockResponse = {
  data: {
    items: [{
      id: 'UCxxxxxx',
      snippet: {
        title: '',
        description: undefined,
        thumbnails: {}
      }
    }]
  }
}
```

**預期結果**
```typescript
返回 {
  id: 'UCxxxxxx',
  title: '',
  description: undefined,
  thumbnail: undefined
}
```

---

### 4. getChannelVideos()

[x] [正常情況] 成功取得頻道影片列表
**測試資料**
```typescript
channelId = 'UCxxxxxx'
maxResults = 10
searchResponse = {
  data: {
    items: [
      { id: { videoId: 'video1' } },
      { id: { videoId: 'video2' } }
    ]
  }
}
videosResponse = {
  data: {
    items: [
      {
        id: 'video1',
        snippet: {
          title: 'Video 1',
          publishedAt: '2024-01-01T00:00:00Z'
        },
        contentDetails: { duration: 'PT10M30S' }
      }
    ]
  }
}
```

**預期結果**
- 返回包含影片資訊的陣列
- duration 正確解析為秒數 (630)
- publishedAt 轉換為 Date 物件

---

[x] [邊界值] 頻道無影片
**測試資料**
```typescript
searchResponse = { data: { items: [] } }
```

**預期結果**
- 返回空陣列 `[]`
- 不呼叫 videos.list API

---

[x] [邊界值] 搜尋結果包含非影片項目
**測試資料**
```typescript
searchResponse = {
  data: {
    items: [
      { id: { videoId: 'video1' } },
      { id: { videoId: null } },
      { id: {} }
    ]
  }
}
```

**預期結果**
- videoIds 只包含 'video1'
- 正確過濾掉無效項目

---

[x] [外部依賴故障] YouTube Search API 失敗
**測試資料**
```typescript
YouTube Search API 拋出 503 錯誤
```

**預期結果**
拋出錯誤

---

[x] [外部依賴故障] YouTube Videos API 失敗
**測試資料**
```typescript
Search API 成功，但 Videos API 拋出 500 錯誤
```

**預期結果**
拋出錯誤

---

### 5. getVideoDetails()

[x] [正常情況] 成功取得影片詳細資訊
**測試資料**
```typescript
videoId = 'video123'
mockResponse = {
  data: {
    items: [{
      id: 'video123',
      snippet: {
        title: 'Test Video',
        description: 'A test video',
        publishedAt: '2024-01-01T00:00:00Z',
        channelId: 'UCxxxxxx',
        thumbnails: { high: { url: 'http://thumb.jpg' } }
      },
      contentDetails: { duration: 'PT1H30M45S' }
    }]
  }
}
```

**預期結果**
```typescript
返回 {
  id: 'video123',
  title: 'Test Video',
  description: 'A test video',
  thumbnail: 'http://thumb.jpg',
  publishedAt: Date 物件,
  duration: 5445, // 1h30m45s = 5445 秒
  channelId: 'UCxxxxxx'
}
```

---

[x] [異常處理] 影片不存在 (404)
**測試資料**
```typescript
videoId = 'invalid_video'
mockResponse = { data: { items: [] } }
```

**預期結果**
返回 `null`

---

[x] [邊界值] 影片資料不完整
**測試資料**
```typescript
mockResponse = {
  data: {
    items: [{
      id: 'video123',
      snippet: {},
      contentDetails: {}
    }]
  }
}
```

**預期結果**
```typescript
返回 {
  id: 'video123',
  title: '',
  description: undefined,
  thumbnail: undefined,
  publishedAt: Date (Invalid Date),
  duration: 0,
  channelId: undefined
}
```

---

### 6. parseDuration() (Private 方法測試)

[x] [正常情況] 解析標準時長 (小時+分鐘+秒)
**測試資料**
```typescript
isoDuration = 'PT1H30M45S'
```

**預期結果**
返回 `5445` (1*3600 + 30*60 + 45)

---

[x] [邊界值] 只有秒數
**測試資料**
```typescript
isoDuration = 'PT45S'
```

**預期結果**
返回 `45`

---

[x] [邊界值] 只有分鐘
**測試資料**
```typescript
isoDuration = 'PT15M'
```

**預期結果**
返回 `900`

---

[x] [邊界值] 只有小時
**測試資料**
```typescript
isoDuration = 'PT2H'
```

**預期結果**
返回 `7200`

---

[x] [邊界值] 0 秒
**測試資料**
```typescript
isoDuration = 'PT0S'
```

**預期結果**
返回 `0`

---

[x] [異常處理] 無效格式
**測試資料**
```typescript
isoDuration = 'INVALID'
```

**預期結果**
返回 `0`

---

[x] [邊界值] 空字串
**測試資料**
```typescript
isoDuration = ''
```

**預期結果**
返回 `0`

---

## getVideoTranscript() 函數測試

[x] [正常情況] 成功抓取英文字幕
**測試資料**
```typescript
videoId = 'video123'
YoutubeTranscript.fetchTranscript 返回:
[
  { offset: 0, text: 'Hello world' },
  { offset: 5000, text: 'Test video' }
]
```

**預期結果**
```typescript
返回 [
  { timestamp: 0, text: 'Hello world' },
  { timestamp: 5000, text: 'Test video' }
]
```

---

[x] [正常情況] 英文失敗，fallback 到繁體中文
**測試資料**
```typescript
第一次呼叫 (en): 拋出錯誤
第二次呼叫 (zh-TW): 成功返回字幕
```

**預期結果**
- 返回繁體中文字幕
- YoutubeTranscript.fetchTranscript 被呼叫 2 次

---

[x] [正常情況] 英文、繁中失敗，fallback 到簡體中文
**測試資料**
```typescript
第一次呼叫 (en): 拋出錯誤
第二次呼叫 (zh-TW): 拋出錯誤
第三次呼叫 (zh): 成功返回字幕
```

**預期結果**
- 返回簡體中文字幕
- YoutubeTranscript.fetchTranscript 被呼叫 3 次

---

[x] [正常情況] 前三個失敗，使用預設語言 (undefined)
**測試資料**
```typescript
第 1-3 次呼叫: 拋出錯誤
第 4 次呼叫 (undefined): 成功返回字幕
```

**預期結果**
- 返回預設語言字幕
- YoutubeTranscript.fetchTranscript 被呼叫 4 次

---

[x] [正常情況] 正確解碼 HTML 實體
**測試資料**
```typescript
YoutubeTranscript.fetchTranscript 返回:
[
  { offset: 0, text: '&amp;#39;Hello&amp;quot;' },
  { offset: 1000, text: '&amp;lt;test&amp;gt; &amp;amp;' }
]
```

**預期結果**
```typescript
返回 [
  { timestamp: 0, text: "'Hello\"" },
  { timestamp: 1000, text: '<test> &' }
]
```

---

[x] [異常處理] 所有語言都失敗，返回 Fallback 字幕
**測試資料**
```typescript
所有 4 次呼叫都拋出錯誤
```

**預期結果**
```typescript
返回 [{
  timestamp: 0,
  text: "This video does not have available captions or transcripts..."
}]
同時 console.warn 記錄警告訊息
```

---

[x] [邊界值] 字幕為空陣列
**測試資料**
```typescript
YoutubeTranscript.fetchTranscript 返回 []
```

**預期結果**
- 繼續嘗試下一個語言
- 最終返回 Fallback 字幕

---

[x] [邊界值] 字幕長度為 0 (falsy)
**測試資料**
```typescript
YoutubeTranscript.fetchTranscript 返回 null 或 undefined
```

**預期結果**
- 繼續嘗試下一個語言
- 最終返回 Fallback 字幕

---

## decodeHtmlEntities() 函數測試

[x] [正常情況] 解碼所有 HTML 實體
**測試資料**
```typescript
text = "&amp;#39;&amp;quot;&amp;amp;&amp;lt;&amp;gt;"
```

**預期結果**
返回 `'"&<>`

---

[x] [邊界值] 無需解碼的純文字
**測試資料**
```typescript
text = "Hello world"
```

**預期結果**
返回 `"Hello world"`

---

[x] [邊界值] 空字串
**測試資料**
```typescript
text = ""
```

**預期結果**
返回 `""`

---

[x] [特殊情況] 混合文字與 HTML 實體
**測試資料**
```typescript
text = "It&amp;#39;s a &amp;quot;test&amp;quot;"
```

**預期結果**
返回 `"It's a \"test\""`

---

**總測試案例數**: 44 個  
**已完成**: 32 個 (實際測試)  
**待完成**: 0 個
