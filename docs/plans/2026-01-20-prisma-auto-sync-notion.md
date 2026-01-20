# Prisma Auto Sync Notion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Modify Prisma schema to support auto-syncing summaries to Notion.

**Architecture:** Add fields to `Channel` and `Summary` models to track sync preferences and status.

**Tech Stack:** Prisma, PostgreSQL.

### Task 1: Modify Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add `autoSyncNotion` to `Channel` model**

```prisma
model Channel {
  // ... existing fields
  autoRefresh     Boolean   @default(false)
  autoSyncNotion  Boolean   @default(false) // Add this
  // ...
}
```

**Step 2: Add Notion fields to `Summary` model**

```prisma
model Summary {
  // ... existing fields
  jobId           String?

  // Notion Sync
  notionUrl       String?
  notionSyncStatus String? // PENDING, SUCCESS, FAILED
  notionError     String?  @db.Text

  // ...
}
```

### Task 2: Create and Apply Migration

**Step 1: Run migration command**

Run: `npx prisma migrate dev --name add_auto_sync_notion`
Expected: Migration created and applied successfully.

**Step 2: Generate Prisma Client**

Run: `npx prisma generate`
Expected: Client updated.

**Step 3: Verify Schema**

Run: `cat prisma/schema.prisma`
Check if fields exist.

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add notion auto sync fields to prisma schema"
```
