# 標籤 UX 優化實作計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 優化摘要詳情頁的標籤顯示，並在列表頁加入標籤篩選功能。

**Architecture:**
1.  **TagList (Detail)**: 分區顯示「已確認」與「AI 建議」，增加清晰度。
2.  **SummaryList (Index)**: 實作 Tabs 切換器 (頻道/標籤)，動態切換篩選列內容。
3.  **API**: 更新 Summary 列表 API 支援 `tagId` 篩選。

**Tech Stack:** React (Client Components), Tailwind CSS, Lucide React, Prisma.

### Task 1: 優化 TagList 元件 (詳情頁)

**Files:**
- Modify: `components/tags/TagList.tsx`

**Step 1: 修改顯示邏輯**

將標籤分為兩組：`confirmed` 和 `suggested`。

**Step 2: 實作分區 UI**

```tsx
// 1. Confirmed Section
// 顯示實心標籤
// 最後面放 "+ Add Tag" 按鈕

// 2. Suggested Section (如果有的話)
// 標題: "AI 建議標籤" (小字, text-muted-foreground)
// 列表: 虛線標籤，前綴加 <Plus className="w-3 h-3" /> icon
```

**Step 3: Commit**

```bash
git add components/tags/TagList.tsx
git commit -m "style(tags): refine tag list ui with separate sections"
```

### Task 2: 標籤列表 API (Tags API)

我们需要一個 API 來撈取「熱門標籤」或「所有標籤」給列表頁用。

**Files:**
- Create: `app/api/tags/route.ts`
- Test: `test/app/api/tags/route.test.ts`

**Step 1: Implement GET**

回傳所有 Tag，最好包含 usage count (關聯的 summary 數量)。

```typescript
// GET /api/tags
const tags = await prisma.tag.findMany({
  include: {
    _count: {
      select: { summaryTags: true }
    }
  },
  orderBy: {
    summaryTags: { _count: 'desc' }
  }
})
```

**Step 2: Commit**

```bash
git add app/api/tags/route.ts test/app/api/tags/route.test.ts
git commit -m "feat(api): add tags list endpoint"
```

### Task 3: 摘要列表 API 支援標籤篩選

**Files:**
- Modify: `app/api/summaries/route.ts`
- Test: `test/app/api/summaries/route.test.ts`

**Step 1: Add Query Param Support**

支援 `?tagId=...`。

```typescript
// app/api/summaries/route.ts
const { searchParams } = new URL(request.url)
const tagId = searchParams.get('tagId')

const where: Prisma.SummaryWhereInput = {
  // ... existing filters
  userId: session.user.id,
}

if (tagId) {
  where.summaryTags = {
    some: {
      tagId: tagId,
      isConfirmed: true // 只篩選已確認的？通常是。
    }
  }
}
```

**Step 2: Commit**

```bash
git add app/api/summaries/route.ts
git commit -m "feat(api): support tag filtering in summaries list"
```

### Task 4: 摘要列表頁篩選器 UI (List Page)

**Files:**
- Modify: `app/(dashboard)/summaries/page.tsx`
- Create: `components/summaries/FilterBar.tsx` (建議抽出，因為邏輯變複雜了)

**Step 1: 建立 FilterBar 元件**

狀態：`filterType` ('channel' | 'tag')。
資料：接收 `channels` 和 `tags` (可以 Server Component 傳入，或 Client Fetch)。

**UI 結構:**

```tsx
<div className="flex flex-col gap-4 mb-6">
  {/* Row 1: 切換器 + 列表 */}
  <div className="flex items-center gap-4">
    {/* Switcher */}
    <div className="flex p-1 bg-zinc-100 rounded-lg shrink-0">
      <button className={...}> <MonitorPlay /> 頻道 </button>
      <button className={...}> <Hash /> 標籤 </button>
    </div>

    {/* Scrollable List */}
    <div className="overflow-x-auto flex gap-2">
       {filterType === 'channel' ? (
          // Render Channels
       ) : (
          // Render Tags
       )}
    </div>
  </div>
</div>
```

**Step 2: 整合進 Page**

在 `page.tsx` 中 fetch tags，並傳給 `FilterBar`。
處理 URL Query 更新 (點擊 tag -> `router.push('?tagId=...')`)。

**Step 3: Commit**

```bash
git add app/(dashboard)/summaries/page.tsx components/summaries/FilterBar.tsx
git commit -m "feat(ui): add tag filter bar with switcher"
```
