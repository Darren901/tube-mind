# 標籤系統 (Tags) 設計文件

> **日期**: 2026-01-21
> **狀態**: 規劃中
> **目標**: 為摘要加入標籤分類功能，支援 AI 自動建議與使用者手動確認。

## 1. 核心需求

*   **全域標籤池**: 所有使用者共用標籤（如 "React", "AI"）。
*   **AI 建議模式**: AI 生成摘要時自動產生建議標籤，狀態為「待確認」。
*   **使用者確認**: 使用者點擊建議標籤後，狀態轉為「已確認」。
*   **手動管理**: 使用者可手動新增或刪除標籤。
*   **UI 區隔**: 清楚區分「頻道分類」與「內容標籤」。

## 2. 資料庫設計 (Prisma Schema)

採用「關聯表 (Relation Table)」模式，以便在關聯上儲存 `isConfirmed` 狀態。

```prisma
// 標籤定義
model Tag {
  id        String   @id @default(cuid())
  name      String   @unique // 標籤名稱 (全小寫或標準化)
  createdAt DateTime @default(now())

  // 關聯
  summaryTags SummaryTag[]
}

// 摘要與標籤的關聯
model SummaryTag {
  id        String   @id @default(cuid())
  
  summaryId String
  summary   Summary  @relation(fields: [summaryId], references: [id], onDelete: Cascade)
  
  tagId     String
  tag       Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)

  // 狀態欄位
  isConfirmed Boolean @default(false) // false: AI 建議, true: 使用者已確認/手動新增
  createdBy   String  @default("AI")  // "AI" 或 "USER"

  createdAt DateTime @default(now())

  @@unique([summaryId, tagId]) // 防止重複標籤
  @@index([tagId])
  @@index([summaryId])
}

// 更新 Summary 模型以包含關聯
model Summary {
  // ... 現有欄位
  tags SummaryTag[]
}
```

## 3. API 設計

### 標籤管理 API (`/api/summaries/[id]/tags`)

*   **GET**: 取得該摘要的所有標籤（包含建議與已確認）。
*   **POST**: 新增標籤 (手動新增)。
    *   Body: `{ name: "React" }`
    *   邏輯: 
        1. 找或建立 `Tag` (name="react")。
        2. 建立 `SummaryTag` (isConfirmed=true, createdBy="USER")。
*   **PATCH**: 確認標籤 (Accept Suggestion)。
    *   Query: `?tagId=...`
    *   Body: `{ isConfirmed: true }`
*   **DELETE**: 移除標籤。
    *   Query: `?tagId=...`

## 4. AI 生成邏輯 (Worker)

為了避免標籤碎片化（例如 "react", "react.js", "ReactJS"），我們將採用「Context Injection」策略。

修改 `lib/workers/summaryWorker.ts` 與 `lib/ai/gemini.ts`：

1.  **撈取現有標籤**: 
    *   在呼叫 AI 前，從 `Tag` 表中查詢使用頻率最高的前 50-100 個標籤（需在 Schema 中加入 `usageCount` 或透過關聯計算）。
    *   *MVP 簡化*: 直接撈出最近使用的 50 個標籤。
2.  **Prompt 調整**: 
    *   將這些標籤列表注入 Prompt。
    *   *Prompt 範例*: "以下是現有的標籤庫：[React, Next.js, AI, ...]。請優先從中選擇適合的標籤，若真的沒有適合的才創造新標籤。請列出 3-5 個相關的主題標籤 (Tags)。"
3.  **Worker 處理**:
    *   收到 AI 回傳後。
    *   正規化標籤名稱（例如轉小寫、去除特殊符號）。
    *   遍歷 tags 陣列。
    *   `upsert` Tag 表。
    *   建立 `SummaryTag` 關聯，設 `isConfirmed = false`。

## 5. UI/UX 設計

### 摘要詳情頁 (`/summaries/[id]`)

*   **位置**: 在摘要標題或核心觀點下方。
*   **顯示樣式**:
    *   **已確認 (Solid)**: 實心背景 (如 `bg-blue-100 text-blue-800`)。
    *   **建議中 (Outline/Dashed)**: 虛線邊框或半透明 (如 `border-dashed border-gray-400 text-gray-500`)，帶有 `+` 號提示。
*   **互動**:
    *   點擊「建議標籤」-> 觸發 PATCH (Confirm) -> 樣式變為實心。
    *   點擊「已確認標籤」的 `x` -> 觸發 DELETE。
    *   點擊「新增標籤」按鈕 -> 輸入框 -> 觸發 POST。

### 摘要列表頁 (`/summaries`)

*   **顯示**: 在卡片底部顯示已確認的標籤 (`isConfirmed=true`)。
*   **篩選**: 點擊標籤可過濾列表（需更新 GET /api/summaries 支援 `?tag=...`）。

## 6. 實作計畫

1.  **Schema**: 修改 `schema.prisma` 並 Migration。
2.  **AI**: 修改 Prompt 與 Worker 邏輯以生成並儲存建議標籤。
3.  **API**: 實作標籤 CRUD API。
4.  **UI**: 實作標籤顯示元件 (`TagList`) 與互動邏輯。
5.  **Integration**: 整合至詳情頁與列表頁。
