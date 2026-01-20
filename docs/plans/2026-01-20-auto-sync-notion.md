# Auto-Sync Notion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow channels to automatically sync generated summaries to Notion when "Daily Update" is enabled.

**Architecture:**
1.  **Database:** Add `autoSyncNotion` to Channel and `notionSyncStatus` to Summary.
2.  **API:** Update Channel API to validate and save the new setting.
3.  **UI:** Add dependent switch in Channel settings.
4.  **Worker:** Extend worker logic to trigger Notion export after summary generation.

**Tech Stack:** Prisma, Next.js API Routes, React, BullMQ (Worker).

### Task 1: Database Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Modify Schema**

Add fields to `Channel` and `Summary` models.

```prisma
// prisma/schema.prisma

model Channel {
  // ... existing fields
  // Add this:
  autoSyncNotion Boolean @default(false)
}

model Summary {
  // ... existing fields
  // Add these:
  notionUrl        String?
  notionSyncStatus String? // 'PENDING', 'SUCCESS', 'FAILED'
  notionError      String?
}
```

**Step 2: Generate Migration**

```bash
npx prisma migrate dev --name add_auto_sync_notion
npx prisma generate
```

**Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "db: add autoSyncNotion to Channel and sync status to Summary"
```

### Task 2: Channel API Update

**Files:**
- Modify: `app/api/channels/[id]/route.ts`
- Test: `test/app/api/channels/[id]/route.test.ts` (Create or update)

**Step 1: Write Failing Test (Validate Pre-requisites)**

Verify that enabling `autoSyncNotion` fails if Notion is not connected.

```typescript
// test/app/api/channels/[id]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from '@/app/api/channels/[id]/route'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'

vi.mock('next-auth')
vi.mock('@/lib/db')
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

describe('PATCH /api/channels/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should return 400 if enabling autoSyncNotion without connected Notion account', async () => {
    // Mock session
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as any)
    
    // Mock user without Notion
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      notionParentPageId: null,
      accounts: [] 
    } as any)

    const req = new Request('http://localhost:3000/api/channels/ch-1', {
      method: 'PATCH',
      body: JSON.stringify({ autoSyncNotion: true })
    })

    const res = await PATCH(req, { params: { id: 'ch-1' } })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/Notion not connected/)
  })
})
```

**Step 2: Run Test (Fail)**

```bash
npx vitest run test/app/api/channels/[id]/route.test.ts
```

**Step 3: Implement Validation Logic**

Update `PATCH` handler in `app/api/channels/[id]/route.ts`.

```typescript
// app/api/channels/[id]/route.ts
// ... imports

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  // ... existing auth checks
  
  const body = await request.json()
  const { isAutoUpdate, autoSyncNotion } = body

  // Validation for autoSyncNotion
  if (autoSyncNotion === true) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        accounts: {
          where: { provider: 'notion' }
        }
      }
    })

    if (!user?.accounts.length || !user.notionParentPageId) {
      return NextResponse.json(
        { error: 'Notion not connected or Parent Page not set' },
        { status: 400 }
      )
    }
  }

  // ... update logic
  const channel = await prisma.channel.update({
    where: { id: params.id },
    data: { 
      // ... existing updates
      ...(typeof autoSyncNotion === 'boolean' ? { autoSyncNotion } : {}),
      ...(typeof isAutoUpdate === 'boolean' ? { isAutoUpdate } : {}),
    }
  })
  
  return NextResponse.json(channel)
}
```

**Step 4: Run Test (Pass)**

```bash
npx vitest run test/app/api/channels/[id]/route.test.ts
```

**Step 5: Commit**

```bash
git add app/api/channels/[id]/route.ts test/app/api/channels/[id]/route.test.ts
git commit -m "feat(api): add autoSyncNotion validation to channel update"
```

### Task 3: Channel Settings UI

**Files:**
- Modify: `app/(dashboard)/channels/[id]/page.tsx`
- Create: `components/ChannelSettings.tsx` (Extracting settings logic is better, but modifying page directly is fine for MVP if simple)

**Step 1: Update Channel Page UI**

Find where the `Switch` for `isAutoUpdate` is located.
Add the new Switch for `autoSyncNotion`.

```typescript
// app/(dashboard)/channels/[id]/page.tsx
// Add state for autoSyncNotion
// Add handle function calling the API
// Render the Switch conditionally based on isAutoUpdate

// Pseudocode for structure:
<div className="space-y-4">
  <div className="flex items-center justify-between">
    <Label>Daily Update</Label>
    <Switch checked={isAutoUpdate} onCheckedChange={toggleUpdate} />
  </div>

  {isAutoUpdate && (
    <div className="flex items-center justify-between pl-4 border-l-2 border-brand-blue/30">
      <div className="flex flex-col">
        <Label>Auto-sync to Notion</Label>
        <span className="text-xs text-muted-foreground">Save summaries to Notion automatically</span>
      </div>
      <Switch 
        checked={autoSyncNotion} 
        onCheckedChange={toggleSync}
        disabled={isLoading}
      />
    </div>
  )}
</div>
```

**Step 2: Commit**

```bash
git add app/(dashboard)/channels/[id]/page.tsx
git commit -m "feat(ui): add auto-sync notion switch to channel page"
```

### Task 4: Worker Logic Implementation

**Files:**
- Modify: `worker/index.ts` (or where the summary generation logic resides)
- Test: `test/worker/sync.test.ts`

**Step 1: Locate Summary Completion Logic**

Find where `prisma.summary.update({ data: { status: 'completed' } })` happens.

**Step 2: Implement Post-Processing**

After summary is completed:
1. Fetch Channel setting.
2. If `autoSyncNotion` is true:
3. Update Summary `notionSyncStatus = 'PENDING'`.
4. Call `createSummaryPage`.
5. Update Summary status based on result.

```typescript
// worker/index.ts (conceptual)

// After summary success:
const channel = await prisma.channel.findUnique({ where: { id: video.channelId } });

if (channel?.autoSyncNotion) {
  // 1. Get User Notion Token & Parent Page
  const user = await prisma.user.findUnique({ ... });
  const notionAccount = user?.accounts[0]; // Filter by provider='notion'

  if (user?.notionParentPageId && notionAccount?.access_token) {
    try {
      await prisma.summary.update({
        where: { id: summaryId },
        data: { notionSyncStatus: 'PENDING' }
      });

      const notionPage = await createSummaryPage(
        notionAccount.access_token,
        user.notionParentPageId,
        summaryContent,
        videoData
      );

      await prisma.summary.update({
        where: { id: summaryId },
        data: { 
          notionSyncStatus: 'SUCCESS',
          notionUrl: (notionPage as any).url // or construct URL
        }
      });
    } catch (err) {
      await prisma.summary.update({
        where: { id: summaryId },
        data: { 
          notionSyncStatus: 'FAILED',
          notionError: err.message
        }
      });
    }
  }
}
```

**Step 3: Commit**

```bash
git add worker/index.ts
git commit -m "feat(worker): implement auto-sync to notion logic"
```

### Task 5: UI Status Indicator

**Files:**
- Modify: `app/(dashboard)/summaries/page.tsx` (List)
- Modify: `app/(dashboard)/summaries/[id]/page.tsx` (Detail)

**Step 1: Add Indicators**

Check `summary.notionSyncStatus`.
- SUCCESS: Show Notion Icon (Green/Brand color).
- FAILED: Show Alert Icon (Red) + Tooltip.

**Step 2: Commit**

```bash
git add app/(dashboard)/summaries/page.tsx app/(dashboard)/summaries/[id]/page.tsx
git commit -m "feat(ui): display notion sync status on summaries"
```
