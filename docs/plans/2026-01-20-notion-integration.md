# Notion 整合實作計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目標:** 允許使用者將影片摘要匯出至他們的 Notion 工作區，並儲存使用者偏好的匯出目標頁面。

**架構:**
1.  **後端:** 在 NextAuth 中新增 Notion OAuth 提供者。擴充 `User` 設定以儲存 `notionParentPageId`。實作 Notion API 客戶端封裝以建立頁面。
2.  **前端:** 在設定頁面新增「連結 Notion」UI。在摘要頁面新增「匯出至 Notion」按鈕。

**技術堆疊:** Next.js App Router, NextAuth.js, Prisma, Notion API (`@notionhq/client`), Tailwind CSS.

### 任務 1: 資料庫 Schema 更新

**檔案:**
- 修改: `prisma/schema.prisma`

**步驟 1: 更新 Schema**
在 `User` 模型中新增 `notionParentPageId` 以儲存預設匯出位置。

```prisma
// in User model
notionParentPageId String? // ID of the default Notion page to export summaries to
```

**步驟 2: 產生 Prisma Client**
執行: `npx prisma migrate dev --name add_notion_page_id`
預期結果: 建立遷移檔案並產生 client。

**步驟 3: 提交**
```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "chore(db): add notionParentPageId to User model"
```

### 任務 2: Notion API Client 與 Service

**檔案:**
- 建立: `lib/notion/client.ts`
- 建立: `lib/notion/types.ts`
- 建立: `lib/notion/service.ts`

**步驟 1: 定義 Types**
定義摘要在 Notion block 結構中的介面。

```typescript
// lib/notion/types.ts
export interface NotionPageProperties {
  title: string;
  url: string;
  videoId: string;
  // ... other metadata
}
```

**步驟 2: 建立 Client Wrapper**
初始化 Notion client。由於使用 OAuth，我們需要使用使用者的 access token 動態實例化 client，而非使用全域環境變數。

```typescript
// lib/notion/client.ts
import { Client } from "@notionhq/client";

export const getNotionClient = (accessToken: string) => {
  return new Client({ auth: accessToken });
};
```

**步驟 3: 建立匯出 Service**
實作將 Summary JSON 轉換為 Notion Blocks 的函式。

```typescript
// lib/notion/service.ts
import { getNotionClient } from "./client";

export async function createSummaryPage(accessToken: string, parentPageId: string, summary: any, videoData: any) {
  const notion = getNotionClient(accessToken);
  // Implementation to call notion.pages.create
  // transform summary.content (markdown/json) to notion blocks
}
```

**步驟 4: 提交**
```bash
git add lib/notion/
git commit -m "feat(notion): add notion client and service"
```

### 任務 3: NextAuth 設定

**檔案:**
- 修改: `lib/auth.ts`
- 修改: `app/api/auth/[...nextauth]/route.ts` (如有需要)

**步驟 1: 新增 Notion Provider**
在 NextAuth 選項中設定 Notion provider。

```typescript
// lib/auth.ts imports
import NotionProvider from "next-auth/providers/notion";

// in providers array
NotionProvider({
  clientId: process.env.NOTION_CLIENT_ID!,
  clientSecret: process.env.NOTION_CLIENT_SECRET!,
  redirectUri: process.env.NOTION_REDIRECT_URI,
})
```

**步驟 2: 確認 Token 儲存策略**
我們將使用 `Account` 資料表中的 `provider: 'notion'` 與 `userId` 來獲取 access token，而不是強制將其塞入 session 中。這樣可以避免 session 過大，且我們只在執行匯出動作時才需要這個 token。

**步驟 3: 提交**
```bash
git add lib/auth.ts
git commit -m "feat(auth): add notion provider configuration"
```

### 任務 4: 設定 API 與 UI (連結 Notion)

**檔案:**
- 建立: `app/api/user/settings/route.ts` (用於儲存 parentPageId)
- 建立: `app/(dashboard)/settings/page.tsx` (若不存在)
- 建立: `components/settings/notion-connect.tsx`

**步驟 1: 設定 API**
建立 Endpoint 以更新 `user.notionParentPageId`。

```typescript
// app/api/user/settings/route.ts
// PATCH: update user.notionParentPageId
```

**步驟 2: 連結元件**
製作 UI 觸發 `signIn('notion')` 進行帳號連結。並提供輸入框設定 `parentPageId`。

**步驟 3: 提交**
```bash
git add app/api/user/settings app/(dashboard)/settings components/settings
git commit -m "feat(settings): add notion connection and page id setting"
```

### 任務 5: 匯出 Action API

**檔案:**
- 建立: `app/api/summaries/[id]/export/notion/route.ts`

**步驟 1: 實作匯出 Endpoint**
1. 權限檢查。
2. 從 `Account` 表取得使用者的 Notion `access_token`。
3. 取得使用者的 `notionParentPageId`。
4. 讀取 Summary 與 Video 資料。
5. 呼叫 `createSummaryPage` service。

**步驟 2: 錯誤處理**
處理狀況：未連結、未設定 parent page、API 錯誤。

**步驟 3: 提交**
```bash
git add app/api/summaries/[id]/export/notion/
git commit -m "feat(api): add export to notion endpoint"
```

### 任務 6: 前端匯出按鈕

**檔案:**
- 修改: `app/(dashboard)/summaries/[id]/page.tsx`
- 建立: `components/summary/export-button.tsx`

**步驟 1: 建立按鈕元件**
呼叫匯出 API 的按鈕。處理 loading 與 success 狀態。

**步驟 2: 整合**
將按鈕加入摘要頁面標頭。

**步驟 3: 提交**
```bash
git add app/(dashboard)/summaries/[id]/page.tsx components/summary/
git commit -m "feat(ui): add export to notion button"
```
