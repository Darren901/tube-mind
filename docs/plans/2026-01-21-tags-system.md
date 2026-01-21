# Tag System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a comprehensive tagging system for video summaries, including AI-generated suggestions and user management.

**Architecture:**
1.  **Database:** New `Tag` and `SummaryTag` models (Explicit M-N with attributes).
2.  **AI:** Update Gemini prompt to generate tags.
3.  **API:** CRUD endpoints for tags per summary.
4.  **UI:** Tag management components in Summary Detail and List views.

**Tech Stack:** Prisma, Next.js API Routes, React (Server/Client Components), Gemini AI.

### Task 1: Database Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Modify Schema**

Add `Tag` and `SummaryTag` models. Update `Summary`.

```prisma
// prisma/schema.prisma

// [Add at the end]
model Tag {
  id        String   @id @default(cuid())
  name      String   @unique
  createdAt DateTime @default(now())

  summaryTags SummaryTag[]
}

model SummaryTag {
  id        String   @id @default(cuid())
  summaryId String
  summary   Summary  @relation(fields: [summaryId], references: [id], onDelete: Cascade)
  tagId     String
  tag       Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)

  isConfirmed Boolean @default(false)
  createdBy   String  @default("AI")
  createdAt   DateTime @default(now())

  @@unique([summaryId, tagId])
  @@index([tagId])
  @@index([summaryId])
}

// [Update Summary]
model Summary {
  // ... existing fields
  tags SummaryTag[]
}
```

**Step 2: Generate Migration**

```bash
npx prisma migrate dev --name add_tags_system
npx prisma generate
```

**Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "db: add tag system schema"
```

### Task 2: AI Tag Generation

**Files:**
- Modify: `lib/ai/gemini.ts`
- Modify: `lib/ai/types.ts`
- Modify: `lib/workers/summaryWorker.ts` (or where result is saved)

**Step 1: Update Types**

Add `tags` to `SummaryResult` interface.

```typescript
// lib/ai/types.ts
export interface SummaryResult {
  // ... existing
  tags?: string[]
}
```

**Step 2: Update Prompt Logic**

Modify `generateSummary` in `lib/ai/gemini.ts` to accept `existingTags`.

```typescript
// lib/ai/gemini.ts
export async function generateSummary(
  transcript: string, 
  metadata: any, 
  existingTags: string[] = [] // New param
) {
  // ...
  // Add to prompt:
  // `Existing tags: ${existingTags.join(', ')}. Prefer using these if relevant.`
  // "Finally, generate 3-5 relevant tags/topics for this video as a JSON array of strings in the field 'tags'. Use lowercase, single words or short phrases."
}
```

**Step 3: Update Worker Logic**

In `lib/workers/summaryWorker.ts`:

1.  Fetch top tags (e.g. recent 50) from Prisma.
2.  Pass them to `generateSummary`.
3.  Save result tags.

```typescript
// Fetch existing tags
const existingTags = await prisma.tag.findMany({
  take: 50,
  orderBy: { summaryTags: { _count: 'desc' } }, // If we can count, or just orderBy createdAt desc for now
  select: { name: true }
})
const tagNames = existingTags.map(t => t.name)

const summaryContent = await generateSummary(transcript, metadata, tagNames)

// Save tags logic...
```

**Step 4: Commit**

```bash
git add lib/ai/gemini.ts lib/ai/types.ts lib/workers/summaryWorker.ts
git commit -m "feat(ai): generate tags with existing tags context"
```

### Task 3: Tags API

**Files:**
- Create: `app/api/summaries/[id]/tags/route.ts`
- Test: `test/app/api/summaries/[id]/tags/route.test.ts`

**Step 1: Implement GET/POST/PATCH/DELETE**

*   **GET**: Return tags for summary.
*   **POST**: Add new tag (User created). `{ name: string }` -> `isConfirmed: true`.
*   **PATCH**: Confirm tag. Query `?tagId=...` -> `isConfirmed: true`.
*   **DELETE**: Remove tag. Query `?tagId=...`.

**Step 2: Write Tests**

Test basic CRUD flow.

**Step 3: Commit**

```bash
git add app/api/summaries/[id]/tags/route.ts test/app/api/summaries/[id]/tags/route.test.ts
git commit -m "feat(api): add tags management endpoints"
```

### Task 4: UI Components (Tag List & Management)

**Files:**
- Create: `components/tags/TagList.tsx`
- Modify: `app/(dashboard)/summaries/[id]/page.tsx`

**Step 1: Create TagList Component**

Props: `summaryId`, `initialTags`.
Features:
- Render tags (solid for confirmed, dashed for unconfirmed).
- Click unconfirmed -> Confirm.
- Click 'x' -> Delete.
- Input field -> Add new.

**Step 2: Integrate into Detail Page**

Fetch tags with summary (include `tags: { include: { tag: true } }`) and pass to `TagList`.

**Step 3: Commit**

```bash
git add components/tags/TagList.tsx app/(dashboard)/summaries/[id]/page.tsx
git commit -m "feat(ui): add tag management to summary detail"
```

### Task 5: Summary List Tags

**Files:**
- Modify: `app/(dashboard)/summaries/page.tsx`

**Step 1: Update Query**

Include `tags` in the `prisma.summary.findMany` query. Filter only `isConfirmed: true` or show all? (Show confirmed usually).

**Step 2: Render Tags on Card**

Add small pills on the summary card.

**Step 3: Commit**

```bash
git add app/(dashboard)/summaries/page.tsx
git commit -m "feat(ui): show tags on summary cards"
```
