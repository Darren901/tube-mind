# Notion Page Dropdown Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the manual Page ID input in Notion settings with a dropdown of accessible pages fetched from the API.

**Architecture:** 
- Fetch pages from `/api/notion/pages` when component mounts (and is connected).
- Store pages in component state.
- Render a `<select>` element mapped to the pages.
- Handle loading and error states as specified (disabled select on error).

**Tech Stack:** React (hooks), Tailwind CSS, Lucide React (icons).

### Task 1: Update NotionConnect Component

**Files:**
- Modify: `components/settings/notion-connect.tsx`

**Step 1: Update imports and types**

Import `useEffect` and `NotionPage` type.

```typescript
import { useState, useEffect } from 'react'
// ... existing imports
import { NotionPage } from '@/lib/notion/types'
```

**Step 2: Add state variables**

Add state for pages, loading status, and page fetch error.

```typescript
// Inside NotionConnect component
const [pages, setPages] = useState<NotionPage[]>([])
const [isLoadingPages, setIsLoadingPages] = useState(false)
const [pageLoadError, setPageLoadError] = useState(false)
```

**Step 3: Implement page fetching**

Add `useEffect` to fetch pages when `isConnected` is true.

```typescript
useEffect(() => {
  if (isConnected) {
    const fetchPages = async () => {
      setIsLoadingPages(true)
      setPageLoadError(false)
      try {
        const res = await fetch('/api/notion/pages')
        if (!res.ok) throw new Error('Failed to fetch pages')
        const data = await res.json()
        setPages(data.pages)
      } catch (err) {
        console.error('Error fetching Notion pages:', err)
        setPageLoadError(true)
      } finally {
        setIsLoadingPages(false)
      }
    }
    fetchPages()
  }
}, [isConnected])
```

**Step 4: Replace input with select**

Replace the existing input field with a select dropdown.

```typescript
{/* Replace the input element */}
<select
  id="parentPageId"
  value={parentPageId}
  onChange={(e) => setParentPageId(e.target.value)}
  disabled={isLoadingPages || pageLoadError}
  className="flex-1 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
>
  <option value="" disabled>
    {isLoadingPages ? 'Loading pages...' : 'Select a page...'}
  </option>
  {pages.map((page) => (
    <option key={page.id} value={page.id}>
      {page.icon ? `${page.icon} ` : ''}{page.title}
    </option>
  ))}
</select>
```

**Step 5: Add error message**

Add error text below the label if fetching fails.

```typescript
{/* Below label and description */}
{pageLoadError && (
  <p className="text-xs text-red-600 dark:text-red-500 mb-2">
    Failed to load accessible pages
  </p>
)}
```

**Step 6: Verify and Cleanup**

Ensure `className` for select matches the style of the previous input for consistency. Use `appearance-none` (or verify if needed) to ensure custom styling is respected, but standard select is fine if consistent.
Check that `initialParentPageId` logic still holds (it initializes `parentPageId` state).

**Step 7: Commit**

```bash
git add components/settings/notion-connect.tsx
git commit -m "feat(settings): replace notion page id input with dropdown"
```
