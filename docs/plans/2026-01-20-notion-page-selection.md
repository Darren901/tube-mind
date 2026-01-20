# Notion Page Selection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to select their preferred Notion Parent Page from a dropdown list instead of manually entering the ID.

**Architecture:**
1.  **Backend:** Add `searchPages` function to Notion client. Create API endpoint `/api/notion/pages` to list accessible pages.
2.  **Frontend:** Update `NotionConnect` component to fetch pages and render a `Select` dropdown.

**Tech Stack:** Next.js App Router, Notion API (`@notionhq/client`), Tailwind CSS, Radix UI (or standard HTML select for MVP).

### Task 1: Notion Service Update

**Files:**
- Modify: `lib/notion/service.ts`
- Modify: `lib/notion/types.ts` (if needed)

**Step 1: Add Search Function**
Implement `searchAccessiblePages` in `lib/notion/service.ts`.
It should call `notion.search` with filter `value: 'page'`.

```typescript
// lib/notion/service.ts
export async function searchAccessiblePages(accessToken: string) {
  const notion = getNotionClient(accessToken);
  const response = await notion.search({
    filter: {
      value: 'page',
      property: 'object'
    },
    sort: {
      direction: 'descending',
      timestamp: 'last_edited_time'
    }
  });
  
  return response.results.map((page: any) => ({
    id: page.id,
    title: page.properties?.title?.title?.[0]?.plain_text || 
           page.properties?.Name?.title?.[0]?.plain_text || 
           'Untitled Page',
    icon: page.icon?.emoji || page.icon?.external?.url || null
  }));
}
```

**Step 2: Update Types**
Export `NotionPage` interface.

**Step 3: Commit**
```bash
git add lib/notion/service.ts
git commit -m "feat(notion): add searchAccessiblePages service"
```

### Task 2: Pages API Endpoint

**Files:**
- Create: `app/api/notion/pages/route.ts`

**Step 1: Implement GET Endpoint**
1.  Auth check.
2.  Get `access_token` from `Account` table.
3.  Call `searchAccessiblePages`.
4.  Return JSON list of pages.

**Step 2: Commit**
```bash
git add app/api/notion/pages/route.ts
git commit -m "feat(api): add notion pages list endpoint"
```

### Task 3: Frontend Dropdown

**Files:**
- Modify: `components/settings/notion-connect.tsx`

**Step 1: Fetch Pages**
When component mounts (if connected), fetch `/api/notion/pages`.

**Step 2: Replace Input with Select**
Replace the text input with a `<select>` (or shadcn Select).
- Map pages to options.
- Value = Page ID.
- Label = Page Title (maybe with icon).

**Step 3: Commit**
```bash
git add components/settings/notion-connect.tsx
git commit -m "feat(ui): replace page id input with dropdown"
```
