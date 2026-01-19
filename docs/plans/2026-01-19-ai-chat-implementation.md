# AI Chat Implementation Plan

## Tasks

### 1. Database Schema Update
- [ ] Modify `prisma/schema.prisma`: Add `transcript Json?` to `Video` model.
- [ ] Run `npx prisma db push` & `npx prisma generate`.

### 2. Backend Logic
- [ ] Update `lib/workers/summaryWorker.ts`: Save `transcript` to DB when processing.
- [ ] Create `app/api/chat/route.ts`:
    - [ ] Authenticate user.
    - [ ] Fetch transcript (Lazy Fetching if null).
    - [ ] Setup `streamText` with `gemini-2.5-flash-lite`.

### 3. Frontend Components
- [ ] Create `components/AIChat/ChatWidget.tsx`:
    - [ ] FAB button.
    - [ ] Slide-over panel.
    - [ ] Use `useChat`.
- [ ] Create `components/AIChat/TextSelectionMenu.tsx` (Optional polish, or integrate into page).
- [ ] Integrate into `app/(dashboard)/summaries/[id]/page.tsx`.

### 4. Testing
- [ ] Verify DB schema.
- [ ] Verify Chat API response.
- [ ] Verify UI interaction.
