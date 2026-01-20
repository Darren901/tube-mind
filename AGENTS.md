# TubeMind - Agent Guidelines

This repository contains "TubeMind", a YouTube video summarizer and AI chat application.
These guidelines are for AI agents (and humans) working on this codebase to ensure consistency and quality.

## 1. Project Overview & Tech Stack

*   **Framework**: Next.js 14 (App Router)
*   **Language**: TypeScript
*   **Database**: PostgreSQL with Prisma ORM
*   **Auth**: NextAuth.js (v4)
*   **Styling**: Tailwind CSS (v4)
*   **AI**: Vercel AI SDK (`ai`, `@ai-sdk/google`), Google Gemini
*   **Queue**: BullMQ with Redis
*   **Icons**: Lucide React
*   **Components**: Radix UI primitives, Framer Motion

## 2. Operational Commands

*   **Start Development Server**: `npm run dev`
*   **Build for Production**: `npm run build`
*   **Lint Code**: `npm run lint`
*   **Run Worker**: `npm run worker` (handles background summarization jobs)
*   **Type Check**: `npx tsc --noEmit`

*Note: There is currently no test suite set up. If asked to write tests, verify the testing framework first or propose setting up Vitest/Jest.*

## 3. Code Style & Conventions

### TypeScript
*   **Strict Mode**: Enabled. Avoid `any` whenever possible. Use explicit interfaces/types.
*   **Interfaces**: Define interfaces for props and data structures. Prefix with `I` is **not** required (e.g., `VideoProps`, not `IVideoProps`).
*   **Enums**: Use string union types over TypeScript enums where possible.

### Components (React/Next.js)
*   **Structure**: Functional Components.
*   **Exports**: Use named exports (`export function ComponentName`) rather than default exports.
*   **Directives**: Explicitly add `'use client'` at the top of Client Components. Server Components are default.
*   **Props**: Destructure props in the function signature.

### Imports
*   **Aliases**: Use `@/` for absolute imports (e.g., `import { db } from '@/lib/db'`).
*   **Order**: Group imports by:
    1.  External libraries (Next.js, React, third-party)
    2.  Internal modules (components, lib, hooks)
    3.  Types/Interfaces
    4.  Styles (if separate)

### Styling (Tailwind CSS)
*   Use utility classes directly in `className`.
*   For conditional classes, use template literals or a helper (if available) or ternary operators.
*   Avoid inline `style={{ ... }}` unless for dynamic values (e.g., coordinates, colors from DB).

### API Routes & Server Actions
*   **Location**: `app/api/` for endpoints.
*   **Response**: Use `NextResponse` or standard `Response`.
*   **AI Streaming**: Use `toUIMessageStreamResponse()` for chat interfaces using `useChat`.
*   **Error Handling**: Wrap logic in `try/catch` blocks. Return appropriate HTTP status codes (400, 401, 404, 500).

## 4. Specific Workflows

### AI Chat Integration
*   **Frontend**: Use `useChat` from `@ai-sdk/react`.
    *   Send messages using `append` or `sendMessage` with correct payload: `{ text: content }`.
    *   Handle Markdown rendering with `react-markdown`.
*   **Backend**: Use `streamText` from `ai`.
    *   Ensure response protocol matches frontend (UI Stream vs Data Stream).
    *   Current standard: `toUIMessageStreamResponse()`.

### Database Access
*   Use the global `prisma` instance from `@/lib/db`.
*   Avoid creating new PrismaClient instances.

## 5. Agent Behavior Rules

1.  **Context First**: Always `read` relevant files before modifying them. Do not assume file content.
2.  **Safety**: Do not commit secrets/API keys. Use environment variables.
3.  **Proactive Fixes**: If you see obvious type errors or lint warnings in the file you are editing, fix them.
4.  **No Regressions**: When refactoring, ensure existing functionality (like Markdown rendering in Chat) is preserved.
5.  **Follow Patterns**: mimic existing code style. If you see `interface Props` used, do not switch to `type Props =` without reason.

## 6. Cursor/Copilot Rules

*   *No specific .cursorrules or copilot-instructions found.*
*   Follow the guidelines above as the primary source of truth.
