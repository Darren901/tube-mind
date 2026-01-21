# Decouple Auto-sync Notion Logic Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Decouple "Auto-sync to Notion" setting from "Daily Update" setting in the UI, allowing them to be toggled independently.

**Architecture:**
Currently, the "Auto-sync to Notion" switch is conditionally rendered only when "Daily Update" (`autoRefresh`) is enabled. This implies a parent-child relationship.
We will remove this conditional rendering and the visual indentation to present them as sibling settings.
The backend logic (`autoSyncNotion` flag on the Channel model) already supports independent states (e.g. syncing on manual refresh), so no backend changes are needed for this UI decoupling.

**Tech Stack:** React, Tailwind CSS, Radix UI (Switch component).

### Task 0: Fix Type Definitions

**Files:**
- Run command

**Step 1: Generate Prisma Client**

The LSP errors indicate that the Prisma Client types might be out of sync with the schema (missing `autoSyncNotion`).

```bash
npx prisma generate
```

### Task 1: Update ChannelSettings Component


**Files:**
- Modify: `components/ChannelSettings.tsx`

**Step 1: Remove conditional rendering for Auto-sync switch**

Remove the `{autoRefresh && (...)}` wrapper around the Auto-sync switch block.

**Step 2: Remove indentation**

Remove `ml-6` from the Auto-sync switch container div to align it with the Daily Update switch.

**Step 3: Verify no logic regressions**

Ensure `toggleAutoRefresh` no longer implicitly affects `autoSyncNotion` visibility (though the original code didn't change the state, just visibility).
*Self-correction*: The original `toggleAutoRefresh` code had a comment: `// If turning off auto-refresh, also turn off notion sync visually (logic handled by visibility)`. We should check if we need to explicitly turn it off now. The requirement is "independent toggling", so we should NOT turn it off when auto-refresh is disabled. The user might want manual refreshes to sync to Notion but not have daily updates. So we just remove the visual dependency.

**Step 4: Commit**

```bash
git add components/ChannelSettings.tsx
git commit -m "ui: decouple auto-sync notion from daily update in settings"
```

### Task 2: Update ChannelCard Component

**Files:**
- Modify: `components/ChannelCard.tsx`

**Step 1: Remove conditional rendering for Auto-sync switch**

Remove the `{autoRefresh && (...)}` wrapper around the Auto-sync switch block (lines 197-218).

**Step 2: Remove indentation**

Remove `ml-6` from the Auto-sync switch container div to align it with the Daily Update switch.

**Step 3: Commit**

```bash
git add components/ChannelCard.tsx
git commit -m "ui: decouple auto-sync notion from daily update in channel card"
```
