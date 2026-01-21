# 🎧 AI 語音導讀功能 (Audio Playback)

## 概述

為摘要頁面提供 AI 語音朗讀功能，使用者可以直接在網站上「聽」影片摘要。採用 Google Cloud Text-to-Speech (TTS) 與 Cloud Storage (GCS) 實作。

## 🚀 核心技術

- **TTS 服務**: Google Cloud Text-to-Speech (`cmn-TW-Neural2-A`)
- **儲存服務**: Google Cloud Storage (GCS)
- **前端播放器**: 自訂 React 組件 + HTML5 Audio API
- **快取機制**: 首次播放生成 MP3 並存入 GCS，後續直接讀取資料庫 `audioUrl`

## 🛠️ 安裝與設定

### 1. Google Cloud 設定

必須啟用以下 API：
- Cloud Text-to-Speech API
- Cloud Storage API

### 2. 環境變數 (.env.local)

```env
# 必須使用絕對路徑以確保不同目錄下執行皆可讀取
GOOGLE_APPLICATION_CREDENTIALS=/絕對路徑/到/service-account-key.json

# GCS Bucket 名稱
GCS_BUCKET_NAME=your-bucket-name
```

### 3. GCS 權限設定 (非常重要)

如果你的 Bucket 啟用了 **Uniform bucket-level access**，請務必手動設定以下權限：
1. 進入 GCS 控制台。
2. 在「Permissions」分頁點擊「Grant Access」。
3. 新增主體: `allUsers`。
4. 角色: `Storage Object Viewer`。

> **注意**: 如果沒有設定此權限，瀏覽器將無法讀取生成的音訊檔案（會報 403 錯誤）。

## 🎨 UI 介面說明

### 初始狀態 (Gemini 風格)
- 顯示「**AI 語音導讀**」按鈕。
- 採用流光漸層設計與旋轉星型圖示。

### 播放器控制
- **進度條**: 支援點擊/拖曳跳轉。
- **倍速播放**: 支援 1x, 1.5x, 2x。
- **音量控制**: 支援靜音與滑桿調整（手機版僅顯示靜音按鈕）。

## 📝 開發注意事項

1. **語音名稱**: 繁體中文請務必使用 `cmn-TW-Standard-A` 或 `cmn-TW-Neural2-A` 等 `cmn-TW` 開頭的型號。
2. **絕對路徑**: `GOOGLE_APPLICATION_CREDENTIALS` 建議在本地環境使用絕對路徑，避免在 worktree 或子目錄執行時發生路徑錯誤。
3. **資料庫同步**: 更新 Schema 後，請務必執行 `npx prisma generate` 以同步 TypeScript 型別。

## 📜 相關檔案

- 前端組件: `components/audio/AudioPlayer.tsx`
- API 路由: `app/api/summaries/[id]/audio/route.ts`
- TTS 工具: `lib/audio/tts.ts`
- GCS 工具: `lib/audio/storage.ts`
