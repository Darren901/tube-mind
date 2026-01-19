# AI Video Chat & Explain Feature Design

## Overview
Add an interactive AI assistant that allows users to chat with the video context (full transcript) and ask for explanations of specific summary text.

## User Stories
1. **Global Chat**: User can click a floating button to open a chat window and ask questions about the video (e.g., "What is the main argument?", "Explain the example about rockets").
2. **Contextual Explain**: User can select text in the summary, click "✨ Explain", and the chat window opens with a detailed explanation of that concept based on the video transcript.

## Architecture

### 1. Database
*   **Update `Video` model**: Add `transcript Json?` field to store the full transcript segment array.
*   **Lazy Migration**: Old videos without transcripts will fetch them on-demand when chat is first initiated.

### 2. Backend (API & Worker)
*   **Worker (`summaryWorker.ts`)**:
    *   Update to save `transcript` to DB when generating summary.
*   **API (`POST /api/chat`)**:
    *   Use Vercel AI SDK (`ai`).
    *   Fetch transcript from DB (or YouTube if missing).
    *   System Prompt: "You are a helpful assistant analyzing a video transcript..." + [Transcript Context].
    *   Stream response.

### 3. Frontend (UI/UX)
*   **`ChatWidget` Component**:
    *   Floating Action Button (FAB) at bottom-right.
    *   Sheet/Drawer component (using Radix UI Dialog or similar) sliding from right.
    *   Chat interface: Message list, Input area, Auto-scroll.
    *   Markdown rendering for AI responses.
*   **`TextSelectionMenu` Component**:
    *   Listens to text selection events on the summary content.
    *   Shows a floating "Explain" button near selection.
    *   On click: Opens ChatWidget and sends prompt: "請解釋這段話：[Selected Text]"

## Technical Stack
*   **Model**: `gemini-1.5-flash` (Cost-effective, large context window).
*   **Streaming**: Vercel AI SDK (`useChat`).
*   **State Management**: Local state or simple Context for Chat Widget visibility.

## Plan
1.  Database Schema Update.
2.  Backend Logic (Worker + API).
3.  Frontend Components (ChatWidget + SelectionMenu).
4.  Integration & Testing.
