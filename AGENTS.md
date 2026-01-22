# TubeMind - Agent 指南

本儲存庫包含 "TubeMind"，這是一個 YouTube 影片摘要與 AI 聊天應用程式。
這些指南旨在為處理此程式碼庫的 AI Agent（以及人類）提供規範，以確保程式碼的一致性與品質。

## 1. 專案概覽與技術棧

*   **框架**: Next.js 14 (App Router)
*   **語言**: TypeScript
*   **資料庫**: PostgreSQL 搭配 Prisma ORM
*   **驗證**: NextAuth.js (v4)
*   **樣式**: Tailwind CSS (v4)
*   **AI**: Vercel AI SDK (`ai`, `@ai-sdk/google`), Google Gemini
*   **隊列**: BullMQ 搭配 Redis
*   **圖示**: Lucide React
*   **組件**: Radix UI primitives, Framer Motion

## 2. 常用操作指令

*   **啟動開發伺服器**: `npm run dev`
*   **構建生產版本**: `npm run build`
*   **程式碼檢查 (Lint)**: `npm run lint`
*   **執行 Worker**: `npm run worker` (處理背景摘要任務)
*   **型別檢查**: `npx tsc --noEmit`
*   **生成 Prisma Client**: `npx prisma generate` (在修改 schema 後執行)
*   **執行測試**: `npx vitest run`

## 3. 程式碼風格與規範

### TypeScript
*   **嚴格模式**: 已啟用。盡可能避免使用 `any`。使用明確的 interface/type 定義。
*   **介面 (Interfaces)**: 為 props 和資料結構定義介面。**不需要**加上 `I` 前綴（例如：使用 `VideoProps`，而非 `IVideoProps`）。
*   **列舉 (Enums)**: 盡可能優先使用字串聯集型別 (string union types) 而非 TypeScript enums。

### 組件 (React/Next.js)
*   **結構**: 使用函式組件 (Functional Components)。
*   **導出**: 使用具名導出 (`export function ComponentName`) 而非預設導出。
*   **指令**: 在 Client Components 頂部明確加入 `'use client'`。Server Components 為預設。
*   **Props**: 在函式簽名中直接解構 props。

### 導入 (Imports)
*   **別名**: 使用 `@/` 進行絕對導入（例如：`import { db } from '@/lib/db'`）。
*   **排序**: 導入順序應為：
    1.  外部函式庫 (Next.js, React, 第三方)
    2.  內部模組 (components, lib, hooks)
    3.  型別/介面
    4.  樣式 (若獨立存在)

### 樣式 (Tailwind CSS)
*   直接在 `className` 中使用工具類別 (utility classes)。
*   對於條件式類別，使用模板字串、輔助函式或三元運算子。
*   避免使用行內樣式 `style={{ ... }}`，除非是動態數值（如來自資料庫的座標或顏色）。

### API 路由與 Server Actions
*   **位置**: 端點位於 `app/api/`。
*   **回應**: 使用 `NextResponse` 或標準 `Response`。
*   **AI 串流**: 針對使用 `useChat` 的聊天介面，使用 `toUIMessageStreamResponse()`。
*   **錯誤處理**: 使用 `try/catch` 包裹邏輯。回傳適當的 HTTP 狀態碼 (400, 401, 404, 500)。

## 4. 特定工作流程

### AI 聊天整合
*   **前端**: 使用 `@ai-sdk/react` 的 `useChat`。
    *   使用 `append` 或 `sendMessage` 發送訊息，裝載內容格式為：`{ text: content }`。
    *   使用 `react-markdown` 處理 Markdown 渲染。
*   **後端**: 使用 `ai` 封裝的 `streamText`。
    *   確保回應協定與前端匹配（UI Stream vs Data Stream）。
    *   目前標準：`toUIMessageStreamResponse()`。

### 資料庫存取
*   使用 `@/lib/db` 導出的全域 `prisma` 實例。
*   避免建立新的 PrismaClient 實例。

## 5. Agent 行為準則

1.  **上下文優先**: 在修改檔案前務必先 `read` 相關檔案，不要假設檔案內容。
2.  **安全第一**: 不要提交秘密資訊或 API 金鑰。請使用環境變數。
3.  **主動修復**: 若在編輯的檔案中發現明顯的型別錯誤或 lint 警告，請順手修復。
4.  **確保無迴歸**: 進行重構時，確保現有功能（如聊天室的 Markdown 渲染）不受影響。
5.  **遵循既有模式**: 模仿現有的程式碼風格。若看到使用 `interface Props`，不要無故切換為 `type Props =`。
6.  **溝通語言**: **請務必使用「繁體中文」與使用者溝通與回報。**

## 6. Cursor/Copilot 規則

*   *未發現特定的 .cursorrules 或 copilot-instructions。*
*   以上述指南作為主要的參考準則。
