# 語音播報功能設計文件

**日期**: 2026-01-21  
**功能**: 摘要語音播報 (Text-to-Speech Podcast)  
**狀態**: 設計完成，待實作

---

## 概述

為 TubeMind 新增語音播報功能，讓使用者可以在摘要詳細頁面直接播放語音版本的摘要內容。適合通勤、做家事時聆聽。

### 核心目標

- 使用者可在摘要頁面直接播放語音版摘要
- 首次播放時生成語音，之後使用快取
- 提供現代化的播放器控制（倍速、進度條、音量）
- 無需下載，直接線上播放

---

## 系統架構

### 整體流程

**首次播放**:
1. 使用者進入摘要詳細頁 → 看到置頂語音播放器（初始狀態）
2. 點擊「播放」→ 前端呼叫 `POST /api/summaries/[id]/audio`
3. 後端檢查資料庫是否已有 `audioUrl`
4. 若無快取：
   - 從摘要內容組合文字
   - 呼叫 Google Cloud TTS 生成語音
   - 上傳到 Google Cloud Storage
   - 將 URL 存入資料庫
5. 回傳語音 URL 給前端（同步等待，2-5 秒）
6. 前端自動開始播放

**第二次以後**:
- 直接從資料庫讀取 `audioUrl`，立即播放

### 技術棧

| 組件 | 技術選擇 | 原因 |
|------|---------|------|
| TTS 服務 | Google Cloud Text-to-Speech | 免費額度充足（100 萬字元/月），音質好，支援繁體中文 |
| 音訊儲存 | Google Cloud Storage | 與 TTS 同生態系，9000+ TWD 額度可用，CDN 加速 |
| 播放器 | HTML5 `<audio>` + React 自訂 UI | 相容性好，可完全控制 UI/UX |
| 生成方式 | 同步生成（非 Queue） | TTS 速度快（2-5 秒），無需複雜的非同步架構 |

---

## 資料庫設計

### Schema 變更

在 `Summary` model 新增欄位：

```prisma
model Summary {
  // ... 現有欄位 ...
  
  audioUrl         String?   // GCS 上的語音檔公開 URL
  audioGeneratedAt DateTime? // 語音生成時間（用於快取管理、除錯）
}
```

### Migration

```bash
npx prisma migrate dev --name add_audio_to_summary
```

---

## 前端設計

### UI 組件: AudioPlayer

**檔案位置**: `/components/audio/AudioPlayer.tsx`

**組件類型**: Client Component (`'use client'`)

**Props**:
```typescript
interface AudioPlayerProps {
  summaryId: string  // 用於呼叫 API
}
```

**狀態管理**:
```typescript
type PlayerState = 
  | 'idle'       // 初始狀態，顯示播放按鈕
  | 'generating' // 正在生成語音（首次播放）
  | 'ready'      // 語音已載入，可播放
  | 'playing'    // 播放中
  | 'paused'     // 已暫停
  | 'error'      // 生成失敗
```

**功能需求**:
- ▶️/⏸ 播放/暫停切換按鈕
- 進度條（可拖曳跳轉）
- 音量控制（滑桿 + 靜音按鈕）
- 播放速度選擇（1x, 1.25x, 1.5x, 2x）
- 時間顯示（當前 / 總時長，如：1:23 / 3:45）
- Loading 狀態（生成中顯示 spinner）
- 錯誤狀態（顯示錯誤訊息 + 重試按鈕）

**UI 風格**:
- 使用 Lucide React icons（`Play`, `Pause`, `Volume2`, `VolumeX`, `Loader2` 等）
- 配色與現有 UI 一致（brand-blue, bg-secondary）
- 響應式設計（手機上簡化部分控制）

**整合位置**:
在 `/app/(dashboard)/summaries/[id]/page.tsx` 中，放在標題區塊和主題區塊之間：

```tsx
{/* 標題與縮圖區塊 */}
<div className="flex flex-col md:flex-row gap-6 md:gap-8 mb-8">
  {/* ... 現有內容 ... */}
</div>

{/* 語音播放器（新增）*/}
<AudioPlayer summaryId={summary.id} />

{/* 主題區塊 */}
<div className="mb-8 p-6 bg-bg-secondary ...">
```

---

## 後端設計

### API 端點

**路徑**: `POST /app/api/summaries/[id]/audio/route.ts`

**請求**:
- 無 request body
- `summaryId` 從 URL params 取得
- 需要 session 驗證

**回應 (成功 200)**:
```typescript
{
  audioUrl: string   // GCS 公開 URL，例如：https://storage.googleapis.com/tube-mind-audio-prod/audio/{summaryId}.mp3
  duration: number   // 音訊時長（秒）
}
```

**回應 (錯誤)**:
```typescript
{
  error: string  // 錯誤訊息
}
```

**狀態碼**:
- `200`: 成功
- `400`: 摘要內容不完整
- `401`: 未授權
- `404`: 摘要不存在
- `429`: API 配額用盡
- `500`: TTS 或 GCS 失敗

### 處理邏輯

```typescript
1. 驗證使用者 session
2. 查詢 Summary（含 video 資料）
3. 檢查權限（summary.userId === session.user.id）
4. 檢查快取：
   if (summary.audioUrl) {
     return { audioUrl: summary.audioUrl, duration: ... }
   }
5. 組合語音文字內容：
   - "主題：{content.topic}"
   - "核心觀點：{content.keyPoints.join('、')}"
   - 每個 section："{section.title}。{section.summary}"
   - **跳過 timestamp**（在語音中無意義）
6. 呼叫 Google Cloud TTS API
7. 上傳音訊到 GCS（檔名：audio/{summaryId}.mp3）
8. 更新資料庫：
   - audioUrl = GCS 公開 URL
   - audioGeneratedAt = new Date()
9. 回傳 { audioUrl, duration }
```

### Google Cloud TTS 設定

**TTS 參數**:
```typescript
{
  input: { text: combinedText },
  voice: {
    languageCode: 'zh-TW',
    name: 'zh-TW-Standard-A',  // 女聲（或 zh-TW-Standard-C 男聲）
    ssmlGender: 'FEMALE'
  },
  audioConfig: {
    audioEncoding: 'MP3',
    speakingRate: 1.0,  // 正常語速（前端可調整播放速度）
    pitch: 0.0,
    volumeGainDb: 0.0
  }
}
```

**文字組合範例**:
```
主題：Next.js 14 App Router 完整教學

核心觀點：App Router 是 Next.js 的未來、Server Components 可以減少客戶端 bundle 大小、檔案系統路由更直觀

第一部分：介紹 App Router。在這個部分中，作者介紹了 Next.js 14 的新特性...

第二部分：Server Components 概念。Server Components 允許開發者...
```

---

## Google Cloud 設定

### 需啟用的 API

1. **Cloud Text-to-Speech API**
   - 前往 [Google Cloud Console](https://console.cloud.google.com)
   - 啟用 Text-to-Speech API

2. **Cloud Storage API**
   - 啟用 Cloud Storage API

### GCS Bucket 設定

**建立 Bucket**:
```bash
# 使用 gcloud CLI 或透過 Console 建立
gsutil mb -l asia-east1 gs://tube-mind-audio-prod
```

**Bucket 設定**:
- **名稱**: `tube-mind-audio-prod` (production) / `tube-mind-audio-dev` (development)
- **位置**: `asia-east1` (台灣) 或 `us-central1`（視部署位置）
- **儲存類別**: Standard
- **公開存取**: 啟用（設定 uniform bucket-level access）
- **CORS 設定**: 允許前端播放器存取

**設定公開讀取權限**:
```bash
gsutil iam ch allUsers:objectViewer gs://tube-mind-audio-prod
```

**生命週期規則（選用）**:
- 90 天後自動刪除，節省空間
- 或保留所有音訊，視需求而定

### 服務帳號設定

**建立服務帳號**:
1. 前往 IAM & Admin > Service Accounts
2. 建立服務帳號，名稱：`tube-mind-tts-service`
3. 授予角色：
   - `Cloud Storage Admin`
   - `Cloud Text-to-Speech User`
4. 建立 JSON 金鑰，下載到專案根目錄

**環境變數**:
```env
# .env.local
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
GCS_BUCKET_NAME=tube-mind-audio-prod
```

**安全性建議**:
- 不要將 `service-account-key.json` commit 到 git
- 加入 `.gitignore`
- Production 環境使用 secret manager

---

## 錯誤處理

### 可能的錯誤情境

| 錯誤情境 | HTTP 狀態碼 | 錯誤訊息 | 處理方式 |
|---------|-----------|---------|---------|
| TTS API 失敗 | 500 | "語音生成失敗，請稍後重試" | 前端顯示錯誤 + 重試按鈕 |
| GCS 上傳失敗 | 500 | "上傳失敗，請重試" | 同上 |
| API 配額用盡 | 429 | "已達配額上限，請明日再試" | 顯示錯誤，禁用重試 |
| 摘要內容為空 | 400 | "摘要內容不完整，無法生成語音" | 顯示錯誤，聯絡支援 |
| 網路逾時 | 500 | "請求逾時，請檢查網路連線" | 提供重試 |
| 未授權存取 | 401 | "請先登入" | 導向登入頁 |
| 摘要不存在 | 404 | "找不到該摘要" | 導向摘要列表 |

### 前端錯誤 UI

**錯誤狀態顯示**:
```
┌─────────────────────────────────────────────────┐
│  ⚠️ 語音生成失敗，請稍後重試                      │
│  [🔄 重試]                                       │
└─────────────────────────────────────────────────┘
```

**自動消失**:
- 錯誤訊息 5 秒後淡出
- 重試按鈕保留，使用者可手動重試

### 後端 Timeout 設定

```typescript
// 設定 30 秒 timeout
export const maxDuration = 30 // Vercel Serverless Function timeout
```

---

## 效能與成本評估

### 預估成本（基於 9000 TWD 免費額度）

**Google Cloud TTS**:
- 定價：$16 USD / 100 萬字元 ≈ 500 TWD
- 假設每個摘要平均 1000 字元
- 可生成：9000 TWD ÷ 500 TWD × 100 萬 = 1,800,000 字元 = **1,800 個摘要**

**Google Cloud Storage**:
- 定價：$0.02 USD / GB / 月 ≈ 0.6 TWD
- 假設每個音訊檔 1 MB，1000 個檔案 = 1 GB
- 儲存成本：1 GB × 0.6 TWD = 0.6 TWD / 月（幾乎免費）

**結論**:
- 9000 TWD 額度可生成約 **1,800 個摘要的語音**
- 對於個人專案綽綽有餘 🎉

### 效能優化

**快取策略**:
- 一旦生成，永久保存（除非手動刪除）
- GCS 提供 CDN 加速，全球快速存取
- 資料庫只存 URL，不存二進位資料

**載入速度**:
- 首次生成：2-5 秒（同步等待）
- 後續播放：< 1 秒（直接從 GCS 載入）

**可選優化**（未來考慮）:
- 設定 GCS 生命週期規則，90 天後自動刪除
- 使用 Signed URLs 增加安全性
- 預先生成熱門摘要的語音

---

## 實作檢查清單

### Phase 1: Google Cloud 設定
- [ ] 啟用 Cloud Text-to-Speech API
- [ ] 啟用 Cloud Storage API
- [ ] 建立 GCS Bucket (`tube-mind-audio-prod`)
- [ ] 設定 Bucket 公開讀取權限
- [ ] 建立服務帳號並下載 JSON 金鑰
- [ ] 設定環境變數 (`GOOGLE_APPLICATION_CREDENTIALS`, `GCS_BUCKET_NAME`)

### Phase 2: 資料庫
- [ ] 更新 Prisma schema（新增 `audioUrl`, `audioGeneratedAt`）
- [ ] 執行 migration
- [ ] 測試欄位是否正確建立

### Phase 3: 後端 API
- [ ] 建立 `/app/api/summaries/[id]/audio/route.ts`
- [ ] 實作權限驗證
- [ ] 實作快取檢查邏輯
- [ ] 整合 Google Cloud TTS SDK
- [ ] 實作 GCS 上傳邏輯
- [ ] 實作錯誤處理
- [ ] 撰寫 API 測試（手動或自動化）

### Phase 4: 前端組件
- [ ] 建立 `AudioPlayer.tsx` 組件
- [ ] 實作狀態管理（idle, generating, playing, error）
- [ ] 實作播放/暫停控制
- [ ] 實作進度條拖曳
- [ ] 實作音量控制
- [ ] 實作播放速度選擇
- [ ] 實作 loading 狀態 UI
- [ ] 實作錯誤狀態 UI + 重試按鈕
- [ ] 整合到摘要詳細頁

### Phase 5: 測試
- [ ] 測試首次生成流程
- [ ] 測試快取讀取流程
- [ ] 測試各種錯誤情境
- [ ] 測試播放器所有控制功能
- [ ] 測試響應式設計（手機/平板/桌面）
- [ ] 測試不同瀏覽器相容性

### Phase 6: 文件與部署
- [ ] 更新 README（新增語音功能說明）
- [ ] 撰寫使用說明文件
- [ ] 部署到 production
- [ ] 監控 GCS 使用量與成本

---

## 未來擴充可能性

以下功能在初版不實作，但可作為未來優化方向：

1. **多語言支援**: 根據影片語言選擇 TTS 語音（英文影片用英文語音）
2. **聲音選擇**: 讓使用者選擇男聲/女聲
3. **背景播放**: 切換頁面時繼續播放
4. **播放清單**: 連續播放多個摘要
5. **下載功能**: 提供音訊下載（雖然目前不需要）
6. **分享功能**: 生成公開的語音分享連結
7. **字幕同步**: 播放時高亮對應的文字區塊
8. **Podcast RSS**: 將所有摘要語音生成 Podcast Feed

---

## 參考資料

- [Google Cloud Text-to-Speech 文件](https://cloud.google.com/text-to-speech/docs)
- [Google Cloud Storage Node.js SDK](https://cloud.google.com/storage/docs/reference/libraries#client-libraries-install-nodejs)
- [HTML5 Audio API](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio)
- [Prisma Schema 文件](https://www.prisma.io/docs/concepts/components/prisma-schema)

---

**設計完成日期**: 2026-01-21  
**設計者**: User + AI Collaboration  
**狀態**: ✅ 已驗證，準備實作
