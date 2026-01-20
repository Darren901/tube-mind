# 自動同步 Notion 功能設計文件

> **日期**: 2026-01-20
> **狀態**: 已核准
> **目標**: 在頻道「每日自動更新」流程中，加入「自動同步摘要至 Notion」的選項。

## 1. 核心需求

*   **使用者故事**: 作為一名使用者，我希望訂閱的頻道在自動生成摘要後，能自動將摘要儲存到我的 Notion 資料庫，這樣我就不用手動一個一個匯出。
*   **範圍**: 
    *   頻道層級的設定開關。
    *   後端 Worker 自動處理同步。
    *   同步狀態的追蹤與錯誤顯示。

## 2. 資料庫設計 (Schema)

需要修改 `schema.prisma` 以支援新功能。

### Channel 模型
新增欄位以儲存設定：

```prisma
model Channel {
  // ... 現有欄位
  autoSyncNotion Boolean @default(false)
}
```

### Summary 模型
新增欄位以追蹤同步狀態：

```prisma
model Summary {
  // ... 現有欄位
  notionUrl        String?   // 儲存 Notion 頁面的公開連結 (若有)
  notionSyncStatus String?   // 狀態: 'PENDING', 'SUCCESS', 'FAILED' (若未啟用則為 null)
  notionError      String?   // 錯誤訊息
}
```

## 3. API 設計

### 頻道設定 API
*   **PATCH /api/channels/[id]**
    *   新增 `autoSyncNotion` 欄位更新支援。
    *   **驗證邏輯**: 若 `autoSyncNotion` 為 `true`，必須檢查該 User 的 `Account` (provider='notion') 是否存在，且 `User.notionParentPageId` 是否已設定。若否，回傳 `400 Bad Request` 並帶有錯誤代碼，前端需引導使用者前往設定。

### 摘要重試 API (Optional / Future)
*   如果同步失敗，使用者手動點擊「匯出」按鈕應能更新 `notionSyncStatus` 為 `SUCCESS` 並清除錯誤。現有的 Export API 可能需要微調以更新這些狀態欄位。

## 4. 後端 Worker 邏輯

在 `worker/index.ts` (或相關處理器) 中：

1.  當 `summarizeVideo` 任務完成，且摘要狀態更新為 `completed` 後。
2.  查詢該 Video 所屬的 Channel。
3.  檢查 `Channel.autoSyncNotion`。
4.  若為 `true`：
    *   更新 Summary 狀態 `notionSyncStatus = 'PENDING'`。
    *   呼叫 `lib/notion/service.ts` 的 `createSummaryPage`。
    *   **成功**: 
        *   更新 `notionSyncStatus = 'SUCCESS'`
        *   更新 `notionUrl = <page_url>`
    *   **失敗**:
        *   更新 `notionSyncStatus = 'FAILED'`
        *   更新 `notionError = <error_message>`
        *   (不應影響摘要本身的 `completed` 狀態，因為摘要是好的，只是同步失敗)

## 5. 前端 UI 設計

### 頻道詳情頁 (`app/(dashboard)/channels/[id]/page.tsx`)
*   **位置**: 在「每日自動更新」Switch 下方。
*   **互動**:
    *   為「從屬選項」：只有當「每日自動更新」ON 時，「同步到 Notion」才顯示或 Enabled。
    *   **防呆**: 開啟時若未設定 Notion，顯示 Toast/Dialog 錯誤，並提供連結去設定頁。

### 摘要列表/詳情頁
*   **狀態顯示**:
    *   若 `notionSyncStatus === 'SUCCESS'`: 顯示 Notion Icon (可點擊開啟連結)。
    *   若 `notionSyncStatus === 'FAILED'`: 顯示紅色驚嘆號 Icon，Tooltip 顯示「同步失敗」。

## 6. 實作計畫摘要

1.  **Database**: 修改 Schema 並執行 Migration。
2.  **API**: 更新 Channel Patch API 加入驗證邏輯。
3.  **UI**: 實作頻道頁面的連動 Switch。
4.  **Worker**: 實作自動同步邏輯。
5.  **UI**: 更新摘要顯示同步狀態。
